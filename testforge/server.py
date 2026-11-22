#!/usr/bin/env python3
"""
VulnTriage — Secure Local Server & API Proxy
Serves static files and optionally proxies /api/chat using OPENROUTER_API_KEY from .env
"""

import http.server
import json
import os
import sys
import urllib.request
import urllib.error

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# Keamanan: hanya bind ke localhost agar proxy (dan API key di .env) tidak terekspos ke jaringan
HOST = '127.0.0.1'
# Batas ukuran body request /api/chat (byte)
MAX_BODY_BYTES = 256 * 1024
# Hanya ekstensi statis ini yang boleh disajikan lewat HTTP
ALLOWED_STATIC_EXT = {'.html', '.css', '.js', '.ico', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff2'}

# Load .env file if present
def load_env():
    base_dir = os.path.dirname(__file__)
    for filename in ['.env', 'env']:
        env_file = os.path.join(base_dir, filename)
        if os.path.isfile(env_file):
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            break

load_env()

class VulnTriageHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent aggressive browser caching during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Block access to .env, env, or hidden dotfiles over HTTP
        clean_path = self.path.split('?')[0].split('#')[0]
        if clean_path in ['/.env', '/env'] or '/.env' in clean_path or clean_path.startswith('/.'):
            self.send_error(403, "Access denied: Secret configuration files cannot be accessed over HTTP.")
            return

        # Allowlist: hanya index dan aset statis; blokir server.py, *.md, dll.
        if not clean_path.startswith('/api/') and not clean_path.endswith('/'):
            ext = os.path.splitext(clean_path)[1].lower()
            if ext not in ALLOWED_STATIC_EXT:
                self.send_error(403, "Access denied: file type is not served.")
                return

        if clean_path == '/api/system-prompt':
            prompt_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'system_prompt.md')
            try:
                with open(prompt_file, 'r', encoding='utf-8') as f:
                    prompt_data = f.read()
            except OSError:
                self.send_error(404, "system_prompt.md not found")
                return
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(prompt_data.encode('utf-8'))
            return

        if clean_path == '/api/status':
            has_env_key = bool(os.environ.get('OPENROUTER_API_KEY'))
            model_env = os.environ.get('OPENROUTER_MODEL', '')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "proxy": True,
                "hasEnvKey": has_env_key,
                "model": model_env
            }).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/chat':
            self.handle_proxy_chat()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_proxy_chat(self):
        api_key = os.environ.get('OPENROUTER_API_KEY', '')
        try:
            content_length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            self.send_error(400, "Invalid Content-Length")
            return
        if content_length <= 0 or content_length > MAX_BODY_BYTES:
            self.send_error(413, "Request body too large or empty")
            return
        body = self.rfile.read(content_length)

        try:
            req_data = json.loads(body.decode('utf-8'))
        except Exception as e:
            self.send_error(400, f"Invalid JSON: {e}")
            return

        # If client passed custom key, prefer it; otherwise use server .env
        client_key = req_data.pop('apiKey', None) or api_key
        if not client_key:
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": { "message": "API Key tidak ditemukan. Setel OPENROUTER_API_KEY di file .env atau masukkan di browser." }
            }).encode('utf-8'))
            return

        # Forward to OpenRouter
        try:
            proxy_req = urllib.request.Request(
                'https://openrouter.ai/api/v1/chat/completions',
                data=json.dumps(req_data).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {client_key}',
                    'HTTP-Referer': 'http://localhost:8080',
                    'X-Title': 'VulnTriage',
                    'User-Agent': 'VulnTriage/1.0',
                },
                method='POST'
            )
            with urllib.request.urlopen(proxy_req, timeout=45) as resp:
                resp_data = resp.read()
                self.send_response(resp.status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(resp_data)

        except urllib.error.HTTPError as e:
            err_data = e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(err_data)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": {"message": str(e)}}).encode('utf-8'))

if __name__ == '__main__':
    os.chdir(os.path.dirname(__file__))
    server_address = (HOST, PORT)
    httpd = http.server.HTTPServer(server_address, VulnTriageHandler)
    key_status = "TERPASANG (dari .env)" if os.environ.get('OPENROUTER_API_KEY') else "BELUM ADA (dapat diinput via UI)"
    print("=" * 60)
    print(f"  VulnTriage Server running on http://{HOST}:{PORT} (localhost only)")
    print(f"  OpenRouter API Key Status: {key_status}")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
        httpd.server_close()
