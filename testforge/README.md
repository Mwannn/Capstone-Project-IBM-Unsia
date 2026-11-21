# ⚗ TestForge — AI Test Case Generator Agent

> **IBM Bob Capstone Project · IT Track · AI Agent**
> Mengubah persyaratan perangkat lunak menjadi test suite terstruktur secara otomatis.

---

## Tujuan

QA engineer dan developer junior di tim software Indonesia sering membuat test case secara manual dari dokumen persyaratan. Proses ini lambat, tidak konsisten, dan sering melewatkan edge case. **TestForge** adalah AI agent berbasis chat yang:

- Menerima user story, spesifikasi API, atau PRD sebagai input
- Menghasilkan test suite lengkap mencakup 6 tipe: Positive, Negative, Boundary, Edge, Security, Non-Functional
- Menyajikan hasil dalam tabel interaktif yang dapat diekspor ke CSV atau Markdown
- Mendukung **Mock Mode** (tanpa API key) dan **Live Mode** (IBM watsonx.ai / OpenAI-compatible)

---

## Cara Menjalankan

### Tanpa server (file:// — Mock Mode)
```bash
# Clone atau download project
git clone <repo-url>
cd testforge

# Buka langsung di browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Dengan server lokal (direkomendasikan)
```bash
# Python 3
cd testforge
python -m http.server 8080
# Buka http://localhost:8080

# Node.js (npx)
npx serve .
```

### Live Mode dengan API Key
1. Buka `app.js`
2. Temukan bagian `LLM_CONFIG` di **SECTION 5**
3. Isi `endpoint`, `apiKey`, dan `model` sesuai provider Anda:

```javascript
// IBM watsonx.ai
const LLM_CONFIG = {
  endpoint:  'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation',
  apiKey:    'YOUR_IBM_WATSONX_API_KEY',
  model:     'ibm/granite-13b-chat-v2',
  projectId: 'YOUR_PROJECT_ID',
};

// OpenAI-compatible
const LLM_CONFIG = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey:   'YOUR_OPENAI_API_KEY',
  model:    'gpt-4o-mini',
};
```

4. Matikan **Mock Mode** melalui toggle di sidebar kiri.

---

## Struktur Project

```
testforge/
├── index.html              # UI utama — chat playground
├── style.css               # Styling: dark theme, CSS custom properties, WCAG AA
├── app.js                  # Logika aplikasi: chat, mock, parsing, export
├── system_prompt.md        # System prompt agent (3 layer)
├── README.md               # Dokumentasi ini
├── PROMPT_ITERATIONS.md    # Log iterasi prompt engineering
└── samples/
    ├── 01_login_form.md        # Persyaratan: Form Login
    ├── 02_checkout_api.md      # Persyaratan: API Checkout
    ├── 03_file_upload.md       # Persyaratan: File Upload
    ├── checklist_login.md      # Expected-quality checklist: Login
    ├── checklist_checkout.md   # Expected-quality checklist: Checkout
    └── checklist_upload.md     # Expected-quality checklist: Upload
```

---

## Arsitektur

```
┌─────────────────────────────────────────────────────┐
│                     index.html                       │
│  ┌────────────┐  ┌──────────────────────────────┐   │
│  │  Sidebar   │  │         Chat Area             │   │
│  │            │  │  ┌──────────────────────────┐ │   │
│  │ • Contoh   │  │  │   Welcome / Messages     │ │   │
│  │   sample   │  │  │   (user + agent bubbles) │ │   │
│  │ • Mode     │  │  └──────────────────────────┘ │   │
│  │   toggle   │  │  ┌──────────────────────────┐ │   │
│  │ • System   │  │  │     Export Bar            │ │   │
│  │   prompt   │  │  │  [CSV] [Copy Markdown]   │ │   │
│  │   editor   │  │  └──────────────────────────┘ │   │
│  └────────────┘  │  ┌──────────────────────────┐ │   │
│                  │  │     Input Textarea        │ │   │
│                  │  └──────────────────────────┘ │   │
│                  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                         │
                    app.js
                         │
          ┌──────────────┴──────────────┐
          │                             │
   Mock Mode                     Live Mode
   (canned responses)        (fetch → LLM API)
          │                             │
   MOCK_RESPONSES{}           callLLMApi()
          │                             │
          └──────────────┬──────────────┘
                         │
                  parseResponse()
                         │
                 buildAgentOutput()
                  (table + blocks)
                         │
              exportCSV() / copyMarkdown()
```

### Komponen Utama (app.js)

| Section | Fungsi |
|---------|--------|
| 1 | `DEFAULT_SYSTEM_PROMPT` — prompt default (mirror dari system_prompt.md) |
| 2 | `SAMPLES` — 3 contoh persyaratan |
| 3 | `MOCK_RESPONSES` — respons canned lengkap untuk demo |
| 4 | State management (mode, history, testcases) |
| 5 | `LLM_CONFIG` + `callLLMApi()` — integrasi API nyata |
| 6 | `parseResponse()` — parser format ---SECTION--- |
| 7 | `buildAgentOutput()` — renderer DOM (tabel, badges) |
| 8 | Fungsi render chat (bubbles, typing indicator) |
| 9 | `sendMessage()` — flow utama kirim+terima |
| 10 | `exportCSV()` |
| 11 | `copyMarkdown()` |
| 12 | Toast notification |
| 13 | Settings panel (live edit system prompt) |
| 14 | Mode toggle (Mock ↔ Live) |
| 15 | Sample buttons |
| 16 | Sidebar toggle (responsive) |
| 17 | Clear chat |
| 18 | Keyboard shortcuts (Ctrl+Enter) |
| 19 | Export buttons wiring |
| 20 | `boot()` — inisialisasi |

---

## Fitur Utama

| Fitur | Detail |
|-------|--------|
| 🤖 AI Agent Chat | Interface chat dengan riwayat pesan |
| 📊 Tabel Test Case | ID, Judul, Prasyarat, Langkah, Hasil, Prioritas, Tipe |
| 🎨 Badge Berwarna | Tipe (Positive/Negative/Boundary/Edge/Security/Non-Functional) + Prioritas |
| ⬇ Export CSV | UTF-8 BOM (kompatibel Excel) |
| 📋 Copy Markdown | Format tabel GitHub-flavored Markdown |
| ✎ System Prompt Editor | Edit dan iterasi prompt secara live |
| 🔀 Mock / Live Toggle | Demo tanpa API key |
| 📱 Responsive | Mobile-friendly, sidebar collapsible |
| ♿ Aksesibilitas | WCAG AA contrast, aria-label, keyboard navigation |

---

## Teknologi

- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript (ES2020+)
- **Zero dependencies**: tidak ada framework, tidak ada CDN
- **LLM Integration**: IBM watsonx.ai atau OpenAI-compatible API
- **Storage**: tidak ada server, tidak ada database — semua state dalam memori

---

## Lisensi

MIT License — bebas digunakan untuk keperluan edukasi dan kompetisi IBM AI Builders Challenge.
