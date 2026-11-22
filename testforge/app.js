/* ============================================================================
   VulnTriage — app.js  (v4)
   AI Vulnerability Triage Agent · IBM AI Builders Challenge
   Features: Chat engine · Mock mode · 9 upgrade features · Export suite
   ============================================================================ */

/* =============================================================================
   SECTION 1: DEFAULT SYSTEM PROMPT
   ============================================================================= */
const DEFAULT_SYSTEM_PROMPT = `Kamu adalah VulnTriage, agen AI senior spesialis keamanan siber (Application Security Analyst, Red-Team Defender, dan Compliance Mapper).

PRINSIP UTAMA — DEFENSIF SAJA:
- Hanya menilai, mengklasifikasikan, dan membantu memperbaiki kerentanan.
- TIDAK pernah menghasilkan exploit, payload berbahaya, atau instruksi serangan.
- Gunakan placeholder <PAYLOAD>, <TARGET>, <ENDPOINT>.

LANGKAH PENALARAN (ikuti berurutan):
A) Pemeriksaan Kelengkapan: verifikasi target/endpoint, jenis vuln, steps-to-reproduce, bukti, dampak.
   Jika 2+ elemen hilang → ajukan maks. 3 pertanyaan klarifikasi, JANGAN beri skor.
B) Klasifikasi: OWASP Top 10 2021 + CWE ID spesifik.
C) Severity: CVSS v3.1 vector lengkap + skor + rasional per metrik.
D) Business Impact: dampak dalam bahasa awam (non-teknis).
E) Sanitasi langkah reproduksi: daftar bernomor, gunakan placeholder.
F) Remediasi: jangka pendek, jangka panjang, contoh kode AMAN (bukan exploit).
G) Duplicate/Noise check: skor false-positive 0-100 dengan alasan.
H) Dedup & Grouping: jika banyak temuan dengan root cause sama, gabungkan.
I) Risk Priority: Perbaiki Segera / Perbaiki Segera / Backlog.
J) Compliance Mapping: ISO 27001, OWASP ASVS, UU PDP/SPBE (indikatif).
K) Self-review: hapus fakta yang diinvent, tandai asumsi dengan [ASUMSI].

FORMAT OUTPUT (WAJIB, urut):
---TRIAGE_STATUS---
---SUMMARY---
---CATEGORY---
---SEVERITY---
---BUSINESS_IMPACT---
---REPRODUCTION_STEPS---
---REMEDIATION---
---COMPLIANCE_MAPPING---
---FALSE_POSITIVE_SCORE---
---MISSING_INFORMATION---
---ASSUMPTIONS---
---SCOPE_AND_LIMITATIONS---

Bahasa default: Indonesia. Beralih ke Inggris jika pengguna menulis Inggris.
Jangan klaim eksploitabilitas kecuali bukti ada. Gunakan "dilaporkan", "belum diverifikasi".`;

/* =============================================================================
   SECTION 2: SAMPLE REPORTS
   ============================================================================= */
const SAMPLES = {
  sqli: `**Laporan Kerentanan: SQL Injection pada Form Login**

Target: https://app.contoh.id/login
Jenis: SQL Injection (Login Bypass)
Ditemukan oleh: Peneliti A (bug@hunter.id)
Tanggal: 2024-11-20

**Deskripsi:**
Parameter "username" pada endpoint POST /api/v1/auth/login tidak melakukan sanitasi input, memungkinkan penyerang untuk memanipulasi query SQL dan melewati autentikasi tanpa password yang valid.

**Langkah Reproduksi:**
1. Buka halaman login di https://app.contoh.id/login
2. Pada field username, masukkan: admin'-- -
3. Pada field password, masukkan: sembarang
4. Klik tombol "Masuk"
5. Penyerang berhasil masuk sebagai admin tanpa password yang benar

**Bukti:**
- Screenshot terlampir menunjukkan dashboard admin berhasil diakses
- Respons HTTP 200 dengan token JWT yang valid
- Log server menunjukkan query: SELECT * FROM users WHERE username='admin'-- -' AND password='...'

**Dampak:**
Penyerang dapat masuk sebagai pengguna mana pun termasuk admin, mengakses seluruh data pengguna (sekitar 50.000 record), dan berpotensi mengeksekusi perintah OS jika database menggunakan xp_cmdshell (SQL Server).

**Environment:**
- Server: Ubuntu 22.04, MySQL 8.0
- Backend: Node.js Express 4.18
- Tidak ada WAF`,

  xss: `**Vulnerability Report: Stored XSS on Comment Section**

Target: https://forum.contoh.id/post/comments
Type: Stored Cross-Site Scripting (XSS)
Severity (reporter estimate): High
Found by: Security Researcher B

**Description:**
The comment submission endpoint at POST /api/comments does not sanitize or encode HTML entities in the "content" field. Any JavaScript submitted in a comment is stored in the database and executed in the browser of every user who views that post.

**Steps to Reproduce:**
1. Log in as any registered user
2. Navigate to any post page
3. In the comment box, submit a comment containing a script tag with alert payload
4. Any other user who views the post will have the script executed in their browser session

**Evidence:**
- POC comment submitted on post ID 1337
- Alert popup appears on page load for all viewers
- Browser developer tools confirm inline script execution
- Cookie theft possible — document.cookie accessible (no HttpOnly flag on session cookie)

**Impact:**
Attacker can steal session cookies of all users viewing the infected post, perform actions on their behalf (account takeover), redirect users to phishing pages, or mine cryptocurrency using their browser.

**Affected versions:** All versions. No CSP header present.`,

  idor: `**Laporan Bug: IDOR pada Endpoint Data Profil Pengguna**

Aplikasi: Mobile Banking App — API v2
Endpoint yang terdampak: GET /api/v2/users/{user_id}/profile
Peneliti: C (ethical hacker)

**Deskripsi Singkat:**
Endpoint profil pengguna menggunakan ID numerik yang dapat diprediksi (sequential integer). Autentikasi dilakukan hanya berdasarkan token JWT, namun server tidak memverifikasi apakah user_id dalam path parameter milik pengguna yang sedang login. Sehingga pengguna A dapat mengakses profil pengguna B hanya dengan mengganti angka di URL.

**Langkah Reproduksi:**
1. Login sebagai pengguna biasa, dapatkan JWT token
2. Akses endpoint: GET /api/v2/users/12345/profile dengan token Anda
3. Response: data profil pengguna dengan ID 12345 (milik akun Anda)
4. Ganti angka menjadi 12344 atau 12346
5. Response tetap mengembalikan data profil pengguna lain tanpa error

**Data yang Terekspos:**
- Nama lengkap, alamat, nomor KTP
- Nomor rekening bank, saldo (jika endpoint diperluas)
- Email, nomor telepon, tanggal lahir

**Bukti:** Screenshot respons API menunjukkan data pengguna lain. Total ~200.000 user terdampak.

**Dampak:** Pelanggaran data pribadi massal. Berpotensi melanggar UU PDP (UU 27/2022) Pasal 65 tentang penggunaan data pribadi tanpa izin.`,

  incomplete: `Ada celah keamanan di website saya. Password bisa dibypass.`,

  scanner_json: `{
  "tool": "OWASP ZAP 2.14 (Mock Export)",
  "scan_date": "2024-11-20T08:30:00Z",
  "target": "https://app.contoh.id",
  "findings": [
    {
      "id": "ZAP-001",
      "name": "SQL Injection",
      "risk": "High",
      "confidence": "Medium",
      "url": "https://app.contoh.id/login",
      "parameter": "username",
      "evidence": "Respons berbeda terdeteksi saat injeksi karakter SQL",
      "cwe": "CWE-89",
      "wasc": "WASC-19"
    },
    {
      "id": "ZAP-002",
      "name": "Missing Anti-clickjacking Header",
      "risk": "Medium",
      "confidence": "Medium",
      "url": "https://app.contoh.id/",
      "parameter": null,
      "evidence": "Header X-Frame-Options tidak ditemukan",
      "cwe": "CWE-1021",
      "wasc": "WASC-15"
    },
    {
      "id": "ZAP-003",
      "name": "Missing Anti-clickjacking Header",
      "risk": "Medium",
      "confidence": "Medium",
      "url": "https://app.contoh.id/dashboard",
      "parameter": null,
      "evidence": "Header X-Frame-Options tidak ditemukan",
      "cwe": "CWE-1021",
      "wasc": "WASC-15"
    },
    {
      "id": "ZAP-004",
      "name": "Missing Anti-clickjacking Header",
      "risk": "Medium",
      "confidence": "Medium",
      "url": "https://app.contoh.id/profile",
      "parameter": null,
      "evidence": "Header X-Frame-Options tidak ditemukan",
      "cwe": "CWE-1021",
      "wasc": "WASC-15"
    },
    {
      "id": "ZAP-005",
      "name": "X-Content-Type-Options Header Missing",
      "risk": "Low",
      "confidence": "Medium",
      "url": "https://app.contoh.id/",
      "parameter": null,
      "evidence": "Header X-Content-Type-Options tidak ditemukan",
      "cwe": "CWE-693",
      "wasc": "WASC-15"
    },
    {
      "id": "ZAP-006",
      "name": "Reflected XSS",
      "risk": "High",
      "confidence": "Medium",
      "url": "https://app.contoh.id/search",
      "parameter": "q",
      "evidence": "Input di-reflect tanpa encoding pada respons HTML",
      "cwe": "CWE-79",
      "wasc": "WASC-8"
    }
  ]
}`,

  scanner_csv: `Issue Type,Severity,URL,Parameter,Evidence,CWE,Notes
SQL Injection,Critical,https://api.contoh.id/v2/login,username,"Error-based SQLi detected: You have an error in your SQL syntax",CWE-89,Burp Active Scan
Stored XSS,High,https://api.contoh.id/v2/comments,content,"Injected payload persists and executes for other users",CWE-79,Manual verification done
IDOR,High,https://api.contoh.id/v2/users/{id}/data,user_id,"Sequential integer allows horizontal privilege escalation",CWE-284,Manual
Missing CSP,Medium,https://api.contoh.id/,,"Content-Security-Policy header absent",CWE-693,Automated
Missing CSP,Medium,https://api.contoh.id/dashboard,,"Content-Security-Policy header absent",CWE-693,Automated
Missing CSP,Medium,https://api.contoh.id/profile,,"Content-Security-Policy header absent",CWE-693,Automated
Missing CSP,Medium,https://api.contoh.id/settings,,"Content-Security-Policy header absent",CWE-693,Automated
Sensitive Data Exposure,High,https://api.contoh.id/v2/debug/config,,"Stack trace and DB credentials visible in response",CWE-209,Manual
Insecure Cookie,Low,https://api.contoh.id/,session,"Cookie missing Secure and HttpOnly flags",CWE-614,Automated`
};

/* =============================================================================
   SECTION 3: MOCK RESPONSES (canned triage results for each sample)
   ============================================================================= */
const MOCK_RESPONSES = {

  sqli: `---TRIAGE_STATUS---
Valid - Siap Diperbaiki

---SUMMARY---
SQL Injection ditemukan pada endpoint POST /api/v1/auth/login melalui parameter "username". Peneliti telah menyediakan bukti yang cukup termasuk langkah reproduksi dan screenshot. Tingkat keparahan tinggi karena memungkinkan bypass autentikasi dan akses data massal.

---CATEGORY---
OWASP: A03:2021 — Injection
CWE: CWE-89 — Improper Neutralization of Special Elements used in an SQL Command

---SEVERITY---
Label: Critical
CVSS v3.1: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
Score: 9.4
Rasional:
- AV (Attack Vector): Network — serangan dapat dilakukan dari internet tanpa akses fisik.
- AC (Attack Complexity): Low — tidak ada kondisi khusus; serangan dapat diulang secara konsisten.
- PR (Privileges Required): None — tidak memerlukan akun; penyerang anonim dapat mengeksploitasi.
- UI (User Interaction): None — tidak memerlukan tindakan dari korban.
- S (Scope): Unchanged — dampak terbatas pada sistem yang sama.
- C (Confidentiality): High — akses penuh ke seluruh data pengguna (50.000 record).
- I (Integrity): High — penyerang dapat login sebagai admin dan memodifikasi data.
- A (Availability): Low — potensi gangguan terbatas pada operasi DB normal.

---BUSINESS_IMPACT---
Penyerang yang tidak memiliki akun dapat masuk ke sistem sebagai administrator hanya dengan memanipulasi field login. Ini berarti seluruh data 50.000 pengguna (nama, email, nomor telepon, dll.) berpotensi dieksfiltrasi. Jika sistem menggunakan SQL Server dengan fitur xp_cmdshell aktif, penyerang bahkan dapat menjalankan perintah di server. Pelanggaran ini berpotensi melanggar UU PDP Pasal 65 tentang penggunaan data pribadi tanpa izin, dengan ancaman denda signifikan.

---REPRODUCTION_STEPS---
1. Buka halaman login di <TARGET>/login.
2. Pada field username, masukkan: <SQLI_PAYLOAD> (contoh: karakter kutip tunggal untuk menguji error SQL).
3. Pada field password, masukkan nilai sembarang.
4. Kirim permintaan dan amati respons server.
5. Jika respons mengembalikan sesi valid tanpa validasi password → kerentanan terkonfirmasi.

---REMEDIATION---
Jangka Pendek:
- Nonaktifkan atau tambahkan WAF rule untuk memblokir karakter SQL pada input login.
- Aktifkan logging anomali untuk mendeteksi upaya eksploitasi.
- Monitor akses admin yang tidak wajar.

Jangka Panjang:
- Implementasikan Parameterized Queries / Prepared Statements di semua query database.
- Terapkan prinsip least privilege pada akun database (jangan gunakan root/DBA untuk aplikasi).
- Lakukan code review menyeluruh pada semua endpoint yang berinteraksi dengan database.
- Implementasikan rate limiting pada endpoint login untuk mencegah brute-force.

Contoh Kode Aman (Node.js + MySQL2):
\`\`\`javascript
// TIDAK AMAN (rentan SQLi):
// const query = \`SELECT * FROM users WHERE username='\${username}'\`;

// AMAN — gunakan parameterized query:
const [rows] = await db.execute(
  'SELECT id, role FROM users WHERE username = ? AND password_hash = ?',
  [username, hashPassword(password)]  // nilai dikirim terpisah dari query
);
if (rows.length === 0) {
  return res.status(401).json({ error: 'Kredensial tidak valid' });
}
\`\`\`

---COMPLIANCE_MAPPING---
| Framework | Kontrol | Relevansi |
|---|---|---|
| ISO 27001:2022 | A.8.28 Secure coding | Parameterized query wajib dalam secure coding standard |
| OWASP ASVS v4.0 | V5.3.4 — Query parameterization | Semua query DB harus menggunakan parameterized statements |
| UU PDP (UU 27/2022) | Pasal 65 — Larangan penggunaan data tanpa izin | Pelanggaran ini mengekspos data pribadi pengguna |
| SPBE (Perpres 95/2018) | Standar Teknis Keamanan Siber | Sistem SPBE wajib menerapkan secure coding |
* Suggested mapping — verify with an auditor.

---FALSE_POSITIVE_SCORE---
Skor: 5 (0 = pasti valid, 100 = pasti false positive)
Alasan: Bukti konkret tersedia (screenshot, respons HTTP, log query). Langkah reproduksi jelas dan spesifik. Sangat kecil kemungkinan false positive.
Status: Valid

---MISSING_INFORMATION---
- Versi MySQL dan Node.js dikonfirmasi (membantu menentukan patch yang tersedia).
- Apakah ada WAF atau mekanisme perlindungan lain yang sudah ada?
- Apakah seluruh endpoint login atau hanya /api/v1/auth/login?

---ASSUMPTIONS---
- [ASUMSI] xp_cmdshell disebutkan sebagai potensi; belum dikonfirmasi aktif.
- [ASUMSI] 50.000 pengguna adalah estimasi peneliti; belum diverifikasi dari sisi server.

---SCOPE_AND_LIMITATIONS---
Analisis ini didasarkan semata-mata pada informasi dalam laporan. VulnTriage tidak melakukan scanning langsung. Semua compliance mapping bersifat indikatif — verifikasi dengan auditor bersertifikat.`,

  xss: `---TRIAGE_STATUS---
Valid - Siap Diperbaiki

---SUMMARY---
Stored XSS ditemukan pada endpoint komentar forum. Penyerang dapat menyimpan skrip berbahaya yang dieksekusi secara otomatis di browser setiap pengguna yang melihat postingan tersebut. Kurangnya flag HttpOnly pada cookie sesi meningkatkan risiko pencurian sesi.

---CATEGORY---
OWASP: A03:2021 — Injection (XSS)
CWE: CWE-79 — Improper Neutralization of Input During Web Page Generation (Cross-site Scripting)

---SEVERITY---
Label: High
CVSS v3.1: CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:L/A:N
Score: 8.0
Rasional:
- AV (Attack Vector): Network — serangan dilakukan via internet.
- AC (Attack Complexity): Low — tidak ada kondisi kompleks.
- PR (Privileges Required): Low — memerlukan akun terdaftar untuk submit komentar.
- UI (User Interaction): Required — korban harus membuka halaman yang terinfeksi.
- S (Scope): Changed — skrip berjalan di konteks browser korban, melampaui batas origin.
- C (Confidentiality): High — cookie sesi dapat dicuri (tidak ada HttpOnly).
- I (Integrity): Low — dapat memodifikasi tampilan halaman.
- A (Availability): None — tidak memengaruhi ketersediaan layanan.

---BUSINESS_IMPACT---
Setiap pengguna yang membuka postingan yang terinfeksi dapat kehilangan sesi login mereka tanpa disadari. Penyerang kemudian dapat menggunakan sesi tersebut untuk melakukan tindakan atas nama korban (account takeover). Jika forum ini memiliki pengguna aktif tinggi, satu komentar berbahaya dapat menargetkan ribuan pengguna secara bersamaan. Potensi kerugian reputasi sangat besar.

---REPRODUCTION_STEPS---
1. Login sebagai pengguna terdaftar di <TARGET>.
2. Navigasi ke halaman postingan mana pun.
3. Pada kotak komentar, kirimkan input yang mengandung tag skrip HTML dengan <PAYLOAD> (tidak akan dijabarkan).
4. Logout, kemudian login sebagai pengguna lain dan buka postingan yang sama.
5. Amati apakah konten komentar dieksekusi sebagai kode oleh browser.

---REMEDIATION---
Jangka Pendek:
- Tambahkan flag HttpOnly dan Secure pada semua cookie sesi segera.
- Tambahkan Content-Security-Policy header yang membatasi sumber skrip.
- Implementasikan validasi dan sanitasi input pada sisi server untuk field komentar.

Jangka Panjang:
- Gunakan library output encoding (mis. DOMPurify di client, ESAPI di server).
- Terapkan CSP strict mode dengan nonce per request.
- Lakukan review menyeluruh pada semua endpoint yang menampilkan input pengguna.

Contoh Kode Aman (Node.js):
\`\`\`javascript
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Sanitasi sebelum menyimpan ke database:
const safeContent = DOMPurify.sanitize(req.body.content, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'br'],
  ALLOWED_ATTR: []
});
await db.execute('INSERT INTO comments (content) VALUES (?)', [safeContent]);
\`\`\`

---COMPLIANCE_MAPPING---
| Framework | Kontrol | Relevansi |
|---|---|---|
| ISO 27001:2022 | A.8.28 Secure coding | Output encoding wajib untuk semua input pengguna |
| OWASP ASVS v4.0 | V5.3.3 — Context-sensitive output encoding | Semua output HTML harus di-encode sesuai konteks |
| UU PDP (UU 27/2022) | Pasal 35 — Kewajiban melindungi data pribadi | Cookie sesi yang dapat dicuri → pelanggaran perlindungan data |
* Suggested mapping — verify with an auditor.

---FALSE_POSITIVE_SCORE---
Skor: 8
Alasan: Peneliti mengonfirmasi eksekusi di browser dan cookie tidak memiliki HttpOnly. Sangat kecil kemungkinan false positive. Poin dikurangkan karena tidak ada bukti cookie yang benar-benar dicuri di dunia nyata.
Status: Valid

---MISSING_INFORMATION---
- Versi library/framework frontend yang digunakan.
- Apakah ada CSP yang sudah dikonfigurasi (meski tidak disebutkan)?
- Jumlah pengguna aktif yang terdampak.

---ASSUMPTIONS---
- [ASUMSI] Semua halaman postingan menampilkan komentar tanpa sanitasi; belum diverifikasi untuk seluruh endpoint.

---SCOPE_AND_LIMITATIONS---
Analisis berdasarkan laporan yang diberikan. VulnTriage tidak melakukan verifikasi langsung.`,

  idor: `---TRIAGE_STATUS---
Valid - Siap Diperbaiki

---SUMMARY---
IDOR (Insecure Direct Object Reference) pada endpoint GET /api/v2/users/{user_id}/profile memungkinkan pengguna terautentikasi mengakses data profil pengguna lain dengan mengganti nilai integer pada URL. Data yang terekspos mencakup informasi PII sensitif dari sekitar 200.000 pengguna.

---CATEGORY---
OWASP: A01:2021 — Broken Access Control
CWE: CWE-284 — Improper Access Control (dan CWE-639 — Authorization Bypass Through User-Controlled Key)

---SEVERITY---
Label: High
CVSS v3.1: CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N
Score: 6.5
Rasional:
- AV (Attack Vector): Network — dapat dieksploitasi dari internet.
- AC (Attack Complexity): Low — hanya perlu mengubah satu angka di URL.
- PR (Privileges Required): Low — memerlukan akun terdaftar (berubah ke High jika akun sulit didapat).
- UI (User Interaction): None — tidak memerlukan tindakan korban.
- S (Scope): Unchanged — dampak terbatas pada sistem yang sama.
- C (Confidentiality): High — data PII sensitif 200.000 pengguna terekspos.
- I (Integrity): None — tidak ada modifikasi data yang dilaporkan.
- A (Availability): None — tidak memengaruhi ketersediaan.

---BUSINESS_IMPACT---
Siapapun dengan akun valid dapat mengunduh data pribadi (nama, alamat, NIK, nomor telepon) dari 200.000 pengguna lain hanya dengan mengganti angka di URL. Ini merupakan pelanggaran berat terhadap UU Perlindungan Data Pribadi (UU 27/2022) dan berpotensi menghasilkan sanksi pidana hingga Rp 70 miliar bagi perusahaan (Pasal 67). Data yang bocor juga dapat digunakan untuk penipuan identitas (identity fraud).

---REPRODUCTION_STEPS---
1. Login ke aplikasi mobile banking menggunakan akun terdaftar, dapatkan JWT token.
2. Kirim permintaan: GET <TARGET>/api/v2/users/<USER_ID_ANDA>/profile dengan header Authorization: Bearer <JWT_TOKEN>.
3. Amati respons — data profil Anda muncul normal.
4. Ganti <USER_ID_ANDA> dengan nomor yang berbeda (mis. ±1) di URL.
5. Amati apakah data pengguna lain muncul dalam respons.

---REMEDIATION---
Jangka Pendek:
- Nonaktifkan endpoint sementara atau tambahkan validasi sisi server segera.
- Tambahkan logging untuk mendeteksi akses massal ke endpoint ini.

Jangka Panjang:
- Validasi bahwa user_id dalam path parameter sesuai dengan sub (subject) claim di JWT token.
- Gunakan UUID non-sequential sebagai ID eksternal untuk menggantikan integer berurutan.
- Terapkan middleware otorisasi terpusat yang dijalankan di semua endpoint.

Contoh Kode Aman (Node.js + Express):
\`\`\`javascript
// Middleware otorisasi terpusat:
function requireOwnership(req, res, next) {
  const tokenUserId = req.user.sub;        // ID dari JWT (sudah diverifikasi)
  const requestedId = req.params.user_id;  // ID dari URL path
  if (tokenUserId !== requestedId) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }
  next();
}

// Gunakan di route:
router.get('/v2/users/:user_id/profile', authenticate, requireOwnership, getProfile);
\`\`\`

---COMPLIANCE_MAPPING---
| Framework | Kontrol | Relevansi |
|---|---|---|
| ISO 27001:2022 | A.8.3 Information access restriction | Akses data harus dibatasi sesuai otorisasi |
| OWASP ASVS v4.0 | V4.2.1 — Verify that object-level authorization | Setiap akses objek harus diverifikasi kepemilikannya |
| UU PDP (UU 27/2022) | Pasal 65 & 67 — Penyalahgunaan data pribadi | Potensi sanksi pidana dan denda Rp 70M |
| SPBE | Standar keamanan API pemerintah | Semua API SPBE wajib menerapkan kontrol akses |
* Suggested mapping — verify with an auditor.

---FALSE_POSITIVE_SCORE---
Skor: 5
Alasan: Langkah reproduksi sangat jelas, peneliti menyertakan screenshot respons API. Pola IDOR klasik dengan integer berurutan sangat umum dan dapat diprediksi.
Status: Valid

---MISSING_INFORMATION---
- Apakah endpoint PUT/PATCH/DELETE pada path yang sama juga rentan?
- Apakah ada rate limiting atau anomaly detection?
- Versi API (v2) — apakah v1 juga terdampak?

---ASSUMPTIONS---
- [ASUMSI] 200.000 pengguna adalah estimasi peneliti berdasarkan observasi rentang ID.

---SCOPE_AND_LIMITATIONS---
Analisis berdasarkan laporan yang diberikan. VulnTriage tidak melakukan verifikasi langsung.`,

  incomplete: `---TRIAGE_STATUS---
Butuh Informasi Lebih

---SUMMARY---
Laporan yang dikirimkan sangat singkat dan tidak memenuhi standar minimum untuk dilakukan triage. Hanya ada satu kalimat tanpa detail teknis yang diperlukan. Tidak dapat memberikan skor CVSS atau klasifikasi tanpa informasi lebih lanjut.

---CATEGORY---
Belum dapat ditentukan — informasi tidak mencukupi.

---SEVERITY---
Belum dapat ditentukan — informasi tidak mencukupi.

---BUSINESS_IMPACT---
Belum dapat ditentukan.

---REPRODUCTION_STEPS---
Tidak tersedia.

---REMEDIATION---
Tidak dapat diberikan tanpa detail teknis.

---COMPLIANCE_MAPPING---
Tidak dapat dipetakan tanpa klasifikasi kerentanan.

---FALSE_POSITIVE_SCORE---
Skor: 50 (tidak dapat ditentukan)
Alasan: Laporan terlalu singkat untuk dinilai. Bisa jadi valid atau false positive.
Status: Butuh Validasi Manual

---MISSING_INFORMATION---
Laporan memerlukan setidaknya informasi berikut sebelum triage dapat dilanjutkan:

---CLARIFYING_QUESTIONS---
1. Apa URL/endpoint spesifik yang terdampak dan metode HTTP apa yang digunakan (GET, POST, dll.)?
2. Bagaimana langkah-langkah reproduksi? Apa yang Anda masukkan dan apa respons yang Anda dapatkan?
3. Apa bukti konkretnya? (screenshot, respons server, kode error, atau log yang menunjukkan bypass berhasil)

---ASSUMPTIONS---
Tidak ada asumsi — informasi tidak mencukupi untuk membuat asumsi apapun.

---SCOPE_AND_LIMITATIONS---
VulnTriage tidak dapat membuat triage yang bertanggung jawab berdasarkan laporan satu kalimat. Laporan yang baik melindungi peneliti dan membantu tim keamanan bertindak cepat.`,

  scanner_json: `---TRIAGE_STATUS---
Valid - Siap Diperbaiki

---SUMMARY---
Import dari OWASP ZAP mendeteksi 6 temuan pada https://app.contoh.id. Setelah deduplication, 3 temuan "Missing Anti-clickjacking Header" digabung menjadi 1 grup. Prioritas tertinggi: SQL Injection dan Reflected XSS yang memerlukan perhatian segera.

---DEDUP_GROUPS---
Grup 1: "Missing Anti-clickjacking Header" — 3 temuan digabung (ZAP-002, ZAP-003, ZAP-004)
Root cause: Header X-Frame-Options tidak dikonfigurasi di level server/application.
Rekomendasi: Tambahkan satu konfigurasi header di level reverse proxy/server.

---CATEGORY---
1. ZAP-001 SQL Injection: A03:2021 — Injection | CWE-89
2. ZAP-006 Reflected XSS: A03:2021 — Injection (XSS) | CWE-79
3. ZAP-002/003/004 Anti-clickjacking: A05:2021 — Security Misconfiguration | CWE-1021
4. ZAP-005 X-Content-Type-Options: A05:2021 — Security Misconfiguration | CWE-693

---SEVERITY---
1. SQL Injection: High | CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L | Score: 9.4
2. Reflected XSS: High | CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N | Score: 6.1
3. Missing Anti-clickjacking (grup): Medium | CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N | Score: 5.4
4. X-Content-Type-Options: Low | Score: 3.1

---PRIORITY_QUEUE---
Perbaiki Segera: ZAP-001 (SQL Injection, Score 9.4, Internet-facing, bukti dilaporkan)
Perbaiki Segera: ZAP-006 (Reflected XSS, Score 6.1, Internet-facing)
Backlog: ZAP-002/003/004 (Missing Header grup, Score 5.4, mitigasi mudah dengan 1 konfigurasi)
Backlog: ZAP-005 (Missing Header, Score 3.1)

---BUSINESS_IMPACT---
SQL Injection pada endpoint login dapat menyebabkan akses tidak sah ke seluruh database. Reflected XSS pada parameter pencarian dapat digunakan untuk phishing dan pencurian sesi. Ketiga header security yang hilang meningkatkan attack surface untuk serangan clickjacking dan MIME-sniffing.

---REMEDIATION---
1. SQL Injection: Implementasikan parameterized queries segera. Tambahkan WAF rule.
2. Reflected XSS: Encode output HTML pada parameter pencarian. Tambahkan CSP header.
3. Anti-clickjacking: Tambahkan \`X-Frame-Options: DENY\` di konfigurasi nginx/Apache.
4. MIME: Tambahkan \`X-Content-Type-Options: nosniff\` di konfigurasi server.

---COMPLIANCE_MAPPING---
| Framework | Kontrol |
|---|---|
| ISO 27001:2022 | A.8.28 Secure coding |
| OWASP ASVS v4.0 | V5.3.4, V14.4.2 |
| UU PDP | Pasal 65 — perlindungan data |
* Suggested mapping — verify with an auditor.

---FALSE_POSITIVE_SCORE---
ZAP-001 (SQLi): Skor 20 — confidence ZAP "Medium"; perlu manual verification.
ZAP-006 (Reflected XSS): Skor 25 — perlu konfirmasi eksekusi script aktual.
ZAP-002/003/004 (Anti-clickjacking): Skor 5 — header memang tidak ada, hampir pasti valid.
ZAP-005: Skor 5 — valid, mudah dikonfirmasi.
Status: ZAP-001 dan ZAP-006 Butuh Validasi Manual; lainnya Valid.

---MISSING_INFORMATION---
- Konfirmasi manual untuk SQLi dan Reflected XSS (ZAP hanya melaporkan sinyal, bukan eksekusi penuh).
- Apakah ada WAF yang mungkin memengaruhi hasil scan?

---ASSUMPTIONS---
- [ASUMSI] Confidence "Medium" dari ZAP berarti belum diverifikasi secara manual.
- [ASUMSI] Semua URL adalah internet-facing berdasarkan URL target.

---SCOPE_AND_LIMITATIONS---
Analisis berdasarkan output scanner. Scanner otomatis memiliki tingkat false positive tinggi. Verifikasi manual diperlukan sebelum mengklaim eksploitabilitas.`,

  scanner_csv: `---TRIAGE_STATUS---
Valid - Siap Diperbaiki

---SUMMARY---
Import Burp Suite CSV mendeteksi 9 temuan pada https://api.contoh.id. Setelah deduplication, 4 temuan "Missing CSP" digabung menjadi 1 grup. Temuan prioritas tertinggi: SQL Injection (Critical), Stored XSS, IDOR, dan Sensitive Data Exposure.

---DEDUP_GROUPS---
Grup 1: "Missing CSP" — 4 temuan digabung (baris 4–7)
Root cause: Content-Security-Policy tidak dikonfigurasi di level aplikasi.
Rekomendasi: 1 konfigurasi header di reverse proxy.

---CATEGORY---
1. SQL Injection: A03:2021 | CWE-89
2. Stored XSS: A03:2021 | CWE-79
3. IDOR: A01:2021 — Broken Access Control | CWE-284
4. Sensitive Data Exposure: A02:2021 — Cryptographic Failures / A05 Misconfiguration | CWE-209
5. Missing CSP (grup 4 temuan): A05:2021 | CWE-693
6. Insecure Cookie: A05:2021 | CWE-614

---SEVERITY---
1. SQL Injection: Critical | CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L | 9.4
2. Sensitive Data Exposure (DB creds in response): Critical | CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H | 9.8
3. Stored XSS: High | CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:L/A:N | 8.0
4. IDOR: High | CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N | 6.5
5. Missing CSP (grup): Medium | Score: 5.3
6. Insecure Cookie: Low | Score: 3.7

---PRIORITY_QUEUE---
Perbaiki Segera: Sensitive Data Exposure (Score 9.8, DB credentials terekspos publik!)
Perbaiki Segera: SQL Injection (Score 9.4, Internet-facing API)
Perbaiki Segera: Stored XSS (Score 8.0, verifikasi manual dilakukan)
Perbaiki Segera: IDOR (Score 6.5, data PII pengguna terekspos)
Backlog: Missing CSP grup (1 fix = 4 temuan selesai)
Backlog: Insecure Cookie (risiko rendah, perbaikan mudah)

---BUSINESS_IMPACT---
Endpoint debug yang terekspos (/v2/debug/config) menampilkan kredensial database — ini adalah temuan paling kritis dan harus ditutup dalam hitungan menit, bukan hari. SQL Injection memungkinkan akses penuh ke database. IDOR mengekspos data pribadi pengguna yang berpotensi melanggar UU PDP.

---REMEDIATION---
1. /v2/debug/config: Nonaktifkan segera! Jangan pernah mengekspos endpoint debug di produksi.
2. SQL Injection: Parameterized queries + WAF rule.
3. Stored XSS: Output encoding + DOMPurify + HttpOnly cookie.
4. IDOR: Validasi kepemilikan resource di middleware.
5. Missing CSP: Tambahkan header \`Content-Security-Policy\` di nginx.
6. Cookie: Tambahkan flag \`Secure; HttpOnly; SameSite=Strict\`.

---COMPLIANCE_MAPPING---
| Framework | Kontrol |
|---|---|
| ISO 27001:2022 | A.8.28, A.8.3, A.8.9 |
| OWASP ASVS v4.0 | V5.3.4, V4.2.1, V14.4.2 |
| UU PDP | Pasal 35, 65, 67 |
* Suggested mapping — verify with an auditor.

---FALSE_POSITIVE_SCORE---
SQL Injection: Skor 15 — Burp Active Scan, perlu manual confirm.
Stored XSS: Skor 5 — "Manual verification done" tercatat.
IDOR: Skor 5 — "Manual" tercatat.
Sensitive Data Exposure: Skor 2 — sangat spesifik, hampir pasti valid.
Missing CSP: Skor 3 — header memang tidak ada.
Insecure Cookie: Skor 3 — mudah dikonfirmasi otomatis.
Status: SQLi Butuh Validasi Manual; lainnya Valid.

---MISSING_INFORMATION---
- Konfirmasi manual SQLi (Burp active scan bisa false positive).
- Apakah /v2/debug/config dapat diakses tanpa autentikasi dari internet?

---ASSUMPTIONS---
- [ASUMSI] Semua endpoint adalah internet-facing.
- [ASUMSI] "Manual verification done" berarti Stored XSS dan IDOR sudah dikonfirmasi.

---SCOPE_AND_LIMITATIONS---
Analisis berdasarkan output CSV Burp Suite. VulnTriage tidak melakukan scanning langsung.`
};

/* =============================================================================
   SECTION 4b: I18N STRINGS & t() HELPER
   (Declared BEFORE boot() to avoid Temporal Dead Zone errors)
   ============================================================================= */
const I18N = {
  id: {
    inputPlaceholder: 'Tempel laporan kerentanan, JSON scanner, atau CSV di sini…',
    inputHint:        'Mendukung: Laporan teks · JSON scanner · CSV Burp/ZAP',
    send:             'Kirim',
    newChat:          'Laporan Baru',
    savingLabel:      'Simpan Sesi Ini',
    toastLang:        'Bahasa: Indonesia',
    analysisTitle:    'Hasil Triage',
    coverageTitle:    'Ringkasan Prioritas',
    assumptionsTitle: 'Asumsi',
    editSave:         'Simpan',
    editCancel:       'Batal',
    editedBadge:      'Diedit',
  },
  en: {
    inputPlaceholder: 'Paste vulnerability report, scanner JSON, or CSV here…',
    inputHint:        'Supports: Text report · Scanner JSON · Burp/ZAP CSV',
    send:             'Send',
    newChat:          'New Report',
    savingLabel:      'Save This Session',
    toastLang:        'Language: English',
    analysisTitle:    'Triage Result',
    coverageTitle:    'Priority Summary',
    assumptionsTitle: 'Assumptions',
    editSave:         'Save',
    editCancel:       'Cancel',
    editedBadge:      'Edited',
  },
};

function t(key) { return I18N[currentLang]?.[key] ?? I18N.id[key]; }

/* =============================================================================
   SECTION 5: LLM API CONFIG
   ============================================================================= */
let isMockMode   = true;
let systemPrompt = DEFAULT_SYSTEM_PROMPT;
let chatHistory  = [];
let lastTriageResult = null;  // stores last parsed triage for export
let isWaiting    = false;
let currentLang  = 'id';
let currentTheme = 'dark';

const LLM_CONFIG = {
  // --- OpenRouter (Active) ---
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey:   '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',
  model:    'openrouter/auto', // Otomatis memilih model gratis terbaik yang sedang online
};

let cachedLiveFreeModels = [];

// Fungsi untuk menarik daftar model gratis yang benar-benar aktif saat ini di OpenRouter
async function getLiveFreeModels() {
  if (cachedLiveFreeModels.length > 0) return cachedLiveFreeModels;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (res.ok) {
      const json = await res.json();
      const list = (json.data || [])
        .filter(m => m.id && (m.id.endsWith(':free') || (m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0')))
        .map(m => m.id);
      if (list.length > 0) {
        cachedLiveFreeModels = list;
        console.log('[VulnTriage] Model gratis OpenRouter yang aktif saat ini:', list);
        return list;
      }
    }
  } catch (err) {
    console.warn('[VulnTriage] Gagal mengambil daftar model OpenRouter:', err);
  }
  return [
    'openrouter/auto',
    'mistralai/mistral-small-3.1-instruct:free',
    'qwen/qwen-2.5-coder-32b-instruct:free',
    'qwen/qwen-2.5-7b-instruct:free'
  ];
}

async function callLLMApi(userMessage) {
  // Ambil daftar model gratis yang sedang aktif secara live di OpenRouter
  const liveModels = await getLiveFreeModels();
  const modelsToTry = Array.from(new Set([LLM_CONFIG.model, ...liveModels, 'openrouter/auto']));
  let lastError = null;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`[VulnTriage] Memanggil model: ${currentModel}...`);
      const resp = await fetch(LLM_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
          'HTTP-Referer': window.location.origin || 'http://localhost:8080',
          'X-Title': 'VulnTriage',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory.slice(-8).map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: 2500,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || data.error) {
        const errText = data.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
        console.warn(`[VulnTriage] Model ${currentModel} tidak dapat digunakan (${errText}). Mencoba model berikutnya...`);
        lastError = new Error(errText);
        continue; // Lanjut mencoba model aktif berikutnya
      }

      const content = data.choices?.[0]?.message?.content || '';
      if (!content) {
        console.warn(`[VulnTriage] Model ${currentModel} mengembalikan konten kosong.`);
        continue;
      }

      // Berhasil!
      LLM_CONFIG.model = currentModel;
      showToast(`Model Aktif: ${currentModel.split('/')[1] || currentModel}`);
      const modeNote = document.getElementById('modeNote');
      if (modeNote) modeNote.textContent = currentModel;
      const statusTxt = document.getElementById('statusText');
      if (statusTxt) statusTxt.textContent = 'Live';

      return content;
    } catch (err) {
      console.warn(`[VulnTriage] Error pada ${currentModel}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Semua model OpenRouter sedang sibuk saat ini. Coba kembali beberapa saat lagi.');
}

/* =============================================================================
   SECTION 6: DETECT SAMPLE KEY & MOCK RESPONSE
   ============================================================================= */
function detectSampleKey(text) {
  const t2 = text.toLowerCase().trim();
  if (t2.includes('"tool": "owasp zap') || t2.includes('zap-001')) return 'scanner_json';
  if (t2.includes('issue type,severity') || t2.includes('sql injection,critical')) return 'scanner_csv';
  if (t2.includes('sql injection') && t2.includes('login')) return 'sqli';
  if (t2.includes('stored xss') || (t2.includes('xss') && t2.includes('komentar'))) return 'xss';
  if (t2.includes('idor') || t2.includes('insecure direct object')) return 'idor';
  if (t2.length < 80) return 'incomplete';
  return null;
}

function getMockResponse(userText) {
  const key = detectSampleKey(userText);
  return MOCK_RESPONSES[key] || MOCK_RESPONSES.incomplete;
}

/* =============================================================================
   SECTION 7: RESPONSE PARSER — parses the structured triage output
   ============================================================================= */
function parseTriageResponse(raw) {
  if (!raw) return { raw: '' };

  const extract = (tag) => {
    const re = new RegExp(`(?:---|###|##|\\*\\*)\\s*${tag}\\s*(?:---|:?\\*\\*)?\\s*([\\s\\S]*?)(?=(?:---|###|##|\\*\\*)[A-Z_]+|$)`, 'i');
    return (raw.match(re)?.[1] || '').trim();
  };

  let status = extract('TRIAGE_STATUS');
  let summary = extract('SUMMARY');
  let category = extract('CATEGORY');
  let severity = extract('SEVERITY');
  let impact = extract('BUSINESS_IMPACT');
  let steps = extract('REPRODUCTION_STEPS');
  let remediation = extract('REMEDIATION');
  let compliance = extract('COMPLIANCE_MAPPING');
  let fpScore = extract('FALSE_POSITIVE_SCORE');
  let missing = extract('MISSING_INFORMATION');
  let clarifying = extract('CLARIFYING_QUESTIONS');
  let assumptions = extract('ASSUMPTIONS');
  let scope = extract('SCOPE_AND_LIMITATIONS');
  let dedup = extract('DEDUP_GROUPS');
  let priority = extract('PRIORITY_QUEUE');

  // If status is a paragraph (> 45 chars) and summary is empty,
  // move the full paragraph into summary so it renders as a clean summary card!
  if (status && status.length > 45 && !summary) {
    summary = status;
    const sLower = status.toLowerCase();
    if (sLower.includes('tidak ada kerentanan') || sLower.includes('informasional') || sLower.includes('review statis')) {
      status = 'Informasional — Review Statis Selesai';
    } else if (sLower.includes('valid') && !sLower.includes('tidak')) {
      status = 'Valid — Siap Diperbaiki';
    } else if (sLower.includes('butuh') || sLower.includes('needs') || sLower.includes('klarifikasi')) {
      status = 'Butuh Informasi Tambahan';
    } else {
      status = 'Kemungkinan Invalid / Informasional';
    }
  }

  // Fallback: If no tags were used at all by the model
  if (!status && !summary && !severity) {
    const sLower = raw.toLowerCase();
    if (sLower.includes('valid') && !sLower.includes('tidak') && !sLower.includes('invalid')) {
      status = 'Valid — Siap Diperbaiki';
    } else if (sLower.includes('butuh') || sLower.includes('klarifikasi')) {
      status = 'Butuh Informasi Lebih';
    } else {
      status = 'Informasional / Review Selesai';
    }
    summary = raw;
  }

  return {
    status, summary, category, severity, impact, steps, remediation,
    compliance, fpScore, missing, clarifying, assumptions, scope, dedup, priority, raw
  };
}

/* =============================================================================
   SECTION 8: STATUS HELPERS
   ============================================================================= */
function getStatusClass(statusText) {
  const s = (statusText || '').toLowerCase();
  if (s.includes('valid') && !s.includes('tidak') && !s.includes('invalid')) return 'valid';
  if (s.includes('butuh') || s.includes('needs more') || s.includes('klarifikasi')) return 'needs';
  return 'invalid';
}

function formatStatusDisplay(rawStatus) {
  if (!rawStatus) return { label: 'Informasional / Review Selesai', desc: '', cls: 'invalid' };

  const cls = getStatusClass(rawStatus);
  const sLower = rawStatus.toLowerCase();

  let label = '';
  if (sLower.includes('tidak ada kerentanan') || sLower.includes('informasional') || sLower.includes('review statis')) {
    label = 'Informasional — Review Statis';
  } else if (cls === 'valid') {
    label = 'Valid — Siap Diperbaiki';
  } else if (cls === 'needs') {
    label = 'Butuh Informasi Tambahan';
  } else {
    label = 'Kemungkinan Invalid / Informasional';
  }

  // If rawStatus is short (<= 45 chars) and single line, use it directly as the badge label
  if (rawStatus.length <= 45 && !rawStatus.includes('\n')) {
    return { label: rawStatus.trim(), desc: '', cls };
  }

  // If rawStatus is long, use the clean label and pass the full text as description
  return { label, desc: rawStatus.trim(), cls };
}

function getSeverityLabel(severityText) {
  const s = (severityText || '').toLowerCase();
  if (s.includes('critical')) return { label: 'Critical', cls: 'critical' };
  if (s.includes('high'))     return { label: 'High',     cls: 'high' };
  if (s.includes('medium'))   return { label: 'Medium',   cls: 'medium' };
  if (s.includes('low'))      return { label: 'Low',      cls: 'low' };
  return { label: 'Info', cls: 'info' };
}

function getSeverityColor(cls) {
  const map = {
    critical: '#dc2626', high: '#ea580c',
    medium: '#d97706', low: '#65a30d', info: '#0284c7',
  };
  return map[cls] || '#6b7280';
}

/* =============================================================================
   SECTION 9: BUILD TRIAGE OUTPUT UI
   ============================================================================= */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mdToHtml(text) {
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function card(titleSvg, titleText, bodyHtml, extraClass = '') {
  return `<div class="triage-card ${extraClass}">
    <div class="triage-card-title">${titleSvg} ${escHtml(titleText)}</div>
    <div class="triage-card-body">${bodyHtml}</div>
  </div>`;
}

const ICON = {
  status:     `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  summary:    `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 5h6M4 7.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  category:   `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2h4v4H2zM8 2h4v4H8zM2 8h4v4H2zM8 8h4v4H8z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  severity:   `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2l1.5 4H13l-3.5 2.5 1.3 4L7 10l-3.8 2.5L4.5 8.5 1 6h4.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  impact:     `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v5M4 4l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 10h10M2 13h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  steps:      `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M3 7h6M3 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  fix:        `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2a3 3 0 11-4.2 4.2L2 9v3h3l2.8-2.8A3 3 0 019 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  compliance: `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3v4c0 3 2 5 5 6 3-1 5-3 5-6V3L7 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5 7l1.5 1.5 2.5-2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  fp:         `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M7 4v3M7 9v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  missing:    `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l5 11H2L7 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M7 5.5v3M7 10v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  assume:     `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M5 5.5a2 2 0 013.7 1c0 1.5-1.7 1.5-1.7 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="11" r=".6" fill="currentColor"/></svg>`,
  dedup:      `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 1h7a1 1 0 011 1v8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  priority:   `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 12l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function buildTriageOutput(parsed) {
  const wrap = document.createElement('div');
  wrap.className = 'triage-result';

  // ---- STATUS ----
  const statusInfo = formatStatusDisplay(parsed.status);
  let statusHtml = `
    <div class="triage-status-wrapper">
      <div class="triage-card-title" style="margin-bottom:.45rem">${ICON.status} Status Triage</div>
      <div class="triage-status-badge-row">
        <span class="triage-status ${statusInfo.cls}">
          <span class="triage-status-dot"></span>
          ${escHtml(statusInfo.label)}
        </span>
      </div>
      ${statusInfo.desc && statusInfo.desc !== parsed.summary ? `<div class="triage-status-desc">${mdToHtml(statusInfo.desc)}</div>` : ''}
    </div>`;
  wrap.insertAdjacentHTML('beforeend', statusHtml);

  // ---- DEDUP (if present) ----
  if (parsed.dedup) {
    const groups = parsed.dedup.split('\n\n').filter(Boolean);
    let dedupHtml = groups.map(g => {
      const lines = g.trim().split('\n');
      const header = lines[0] || '';
      const countMatch = header.match(/(\d+)\s+temuan/i);
      const count = countMatch ? countMatch[1] : '';
      return `<div class="dedup-group">${ICON.dedup} ${count ? `<span class="dedup-count">${count}x</span>` : ''} <span>${escHtml(header)}</span></div>` +
        lines.slice(1).map(l => `<div style="font-size:.8rem;color:var(--text-secondary);padding:.1rem 0 .1rem 1.6rem">${mdToHtml(l)}</div>`).join('');
    }).join('');
    wrap.insertAdjacentHTML('beforeend', card(ICON.dedup, 'Deduplication & Grouping', dedupHtml));
  }

  // ---- SUMMARY ----
  if (parsed.summary) {
    wrap.insertAdjacentHTML('beforeend', card(ICON.summary, 'Ringkasan', `<p>${mdToHtml(parsed.summary)}</p>`));
  }

  // ---- CATEGORY ----
  if (parsed.category && !parsed.category.toLowerCase().includes('belum')) {
    wrap.insertAdjacentHTML('beforeend', card(ICON.category, 'Klasifikasi (OWASP / CWE)',
      `<div>${mdToHtml(parsed.category)}</div>`));
  }

  // ---- SEVERITY ----
  if (parsed.severity && !parsed.severity.toLowerCase().includes('belum')) {
    const sev = getSeverityLabel(parsed.severity);
    const cvssMatch = parsed.severity.match(/CVSS:3\.1\/[^\s\n]+/);
    const scoreMatch = parsed.severity.match(/Score:\s*([\d.]+)/);
    const cvssVector = cvssMatch ? cvssMatch[0] : '';
    const score = scoreMatch ? scoreMatch[1] : '';

    let sevHtml = `<div class="cvss-row">
      <span class="sev-badge ${sev.cls}">${escHtml(sev.label)}</span>
      ${score ? `<span class="cvss-score-big" style="color:${getSeverityColor(sev.cls)}">${escHtml(score)}</span>` : ''}
    </div>`;
    if (cvssVector) {
      sevHtml += `<div class="cvss-vector">${escHtml(cvssVector)}</div>`;
    }
    const rasionalMatch = parsed.severity.match(/Rasional:([\s\S]*?)(?=---|$)/i);
    if (rasionalMatch) {
      sevHtml += `<div style="margin-top:.6rem">${mdToHtml(rasionalMatch[1])}</div>`;
    } else {
      sevHtml += `<div style="margin-top:.4rem">${mdToHtml(parsed.severity)}</div>`;
    }
    wrap.insertAdjacentHTML('beforeend', card(ICON.severity, 'Tingkat Keparahan (CVSS v3.1)', sevHtml));
  }

  // ---- PRIORITY QUEUE ----
  if (parsed.priority) {
    const lines = parsed.priority.split('\n').filter(Boolean);
    let pqHtml = '<div class="priority-queue">';
    for (const line of lines) {
      const isNow  = /perbaiki segera.*?:/i.test(line) || /fix.?now/i.test(line);
      const isSoon = /perbaiki segera.*?2|fix.?soon/i.test(line);
      const isBL   = /backlog/i.test(line);
      const cls    = isBL ? 'backlog' : isNow ? 'fix-now' : 'fix-soon';
      const labelTxt = isBL ? 'Backlog' : 'Perbaiki Segera';
      pqHtml += `<div class="pq-item ${cls}"><span class="pq-label ${cls}">${labelTxt}</span><span>${escHtml(line.replace(/^[^:]+:\s*/,''))}</span></div>`;
    }
    pqHtml += '</div>';
    wrap.insertAdjacentHTML('beforeend', card(ICON.priority, 'Antrian Prioritas Risiko', pqHtml));
  }

  // ---- BUSINESS IMPACT ----
  if (parsed.impact) {
    wrap.insertAdjacentHTML('beforeend', card(ICON.impact, 'Dampak Bisnis', `<p>${mdToHtml(parsed.impact)}</p>`));
  }

  // ---- REPRODUCTION STEPS ----
  if (parsed.steps && parsed.steps.length > 2) {
    const stepLines = parsed.steps.split('\n').filter(l => l.trim());
    const isOl = stepLines.some(l => /^\d+\./.test(l.trim()));
    let stepsHtml;
    if (isOl) {
      stepsHtml = '<ol>' + stepLines
        .filter(l => /^\d+\./.test(l.trim()))
        .map(l => `<li>${mdToHtml(l.replace(/^\d+\.\s*/, ''))}</li>`)
        .join('') + '</ol>';
    } else {
      stepsHtml = `<div>${mdToHtml(parsed.steps)}</div>`;
    }
    wrap.insertAdjacentHTML('beforeend', card(ICON.steps, 'Langkah Reproduksi (Sanitized)', stepsHtml));
  }

  // ---- REMEDIATION ----
  if (parsed.remediation) {
    const remText = parsed.remediation;
    // extract code blocks
    const codeBlocks = [];
    const withoutCode = remText.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      codeBlocks.push({ lang, code });
      return `[[CODE_${codeBlocks.length - 1}]]`;
    });
    let remHtml = withoutCode.split('\n').map(line => {
      const cb = line.match(/\[\[CODE_(\d+)\]\]/);
      if (cb) {
        const { lang, code } = codeBlocks[parseInt(cb[1])];
        return `<pre><code class="lang-${escHtml(lang)}">${escHtml(code)}</code></pre>`;
      }
      return mdToHtml(line) + '<br>';
    }).join('');
    wrap.insertAdjacentHTML('beforeend', card(ICON.fix, 'Remediasi', remHtml));
  }

  // ---- COMPLIANCE MAPPING ----
  if (parsed.compliance) {
    // Try to build a table from | delimited rows
    const rows = parsed.compliance.split('\n').filter(l => l.includes('|') && !l.match(/^[\s|:-]+$/));
    let compHtml;
    if (rows.length > 1) {
      compHtml = '<table class="compliance-table"><thead><tr><th>Framework</th><th>Kontrol</th><th>Relevansi</th></tr></thead><tbody>';
      for (const row of rows) {
        const cols = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 2) {
          compHtml += `<tr>${cols.map(c => `<td>${mdToHtml(c)}</td>`).join('')}</tr>`;
        }
      }
      compHtml += '</tbody></table><p class="compliance-note">* Suggested mapping — verify with an auditor.</p>';
    } else {
      compHtml = `<div>${mdToHtml(parsed.compliance)}</div>`;
    }
    wrap.insertAdjacentHTML('beforeend', card(ICON.compliance, 'Pemetaan Kepatuhan (ISO 27001 · ASVS · UU PDP)', compHtml));
  }

  // ---- FALSE POSITIVE SCORE ----
  if (parsed.fpScore) {
    const scoreMatch = parsed.fpScore.match(/Skor:\s*(\d+)/i);
    const fpNum = scoreMatch ? parseInt(scoreMatch[1]) : 50;
    const fpColor = fpNum < 25 ? '#4ade80' : fpNum < 60 ? '#fbbf24' : '#f87171';
    let fpHtml = `<div class="fp-bar-wrap"><div class="fp-bar" style="width:${fpNum}%;background:${fpColor}"></div></div>
      <div style="font-size:.78rem;color:${fpColor};margin-bottom:.4rem">Skor: ${fpNum}/100 ${fpNum < 25 ? '— Kemungkinan Valid' : fpNum < 60 ? '— Butuh Validasi Manual' : '— Kemungkinan False Positive'}</div>
      <div>${mdToHtml(parsed.fpScore)}</div>`;
    wrap.insertAdjacentHTML('beforeend', card(ICON.fp, 'Skor False Positive', fpHtml));
  }

  // ---- CLARIFYING QUESTIONS / MISSING INFO ----
  if (parsed.clarifying) {
    const questions = parsed.clarifying.split('\n').filter(l => /^\d+\./.test(l.trim()));
    let qHtml = '<div class="clarifying-q">';
    if (questions.length) {
      qHtml += questions.map(q => `<div class="clarifying-q-item">${mdToHtml(q.replace(/^\d+\.\s*/, ''))}</div>`).join('');
    } else {
      qHtml += `<div>${mdToHtml(parsed.clarifying)}</div>`;
    }
    qHtml += '</div>';
    wrap.insertAdjacentHTML('beforeend', card(ICON.missing, 'Pertanyaan Klarifikasi', qHtml));
  }

  if (parsed.missing && !parsed.missing.toLowerCase().includes('tidak ada')) {
    const missingItems = parsed.missing.split('\n').filter(l => l.trim() && !l.match(/^---/));
    let misHtml = '<div class="missing-info-list">' +
      missingItems.map(item => `<div class="missing-info-item"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0;margin-top:2px"><path d="M6 1l4.3 9H1.7L6 1z" stroke="currentColor" stroke-width="1.3"/><path d="M6 4.5v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>${mdToHtml(item)}</div>`).join('')
      + '</div>';
    wrap.insertAdjacentHTML('beforeend', card(ICON.missing, 'Informasi yang Diperlukan', misHtml));
  }

  // ---- ASSUMPTIONS ----
  if (parsed.assumptions && !parsed.assumptions.toLowerCase().includes('tidak ada')) {
    wrap.insertAdjacentHTML('beforeend', card(ICON.assume, 'Asumsi', `<div>${mdToHtml(parsed.assumptions)}</div>`));
  }

  // ---- SCOPE ----
  if (parsed.scope) {
    wrap.insertAdjacentHTML('beforeend', `<div class="triage-card" style="border-color:rgba(255,255,255,.04)">
      <div class="triage-card-title" style="font-size:.68rem">${ICON.assume} Scope & Limitations</div>
      <div class="triage-card-body" style="font-size:.78rem;color:var(--text-muted)">${mdToHtml(parsed.scope)}</div>
    </div>`);
  }

  // ---- FALLBACK: NARRATIVE OUTPUT ----
  const hasSections = parsed.summary || parsed.category || parsed.severity || parsed.steps || parsed.remediation || parsed.dedup || parsed.priority;
  if (!hasSections && parsed.raw) {
    wrap.insertAdjacentHTML('beforeend', card(ICON.summary, 'Analisis & Observasi Lengkap', `<div class="triage-narrative">${mdToHtml(parsed.raw)}</div>`));
  }

  return wrap;
}

/* =============================================================================
   SECTION 10: WELCOME CARD (shown before first message)
   ============================================================================= */
const chatHistory_el = document.getElementById('chatHistory');

function renderWelcome() {
  ['btnCopyMarkdown','btnExportJSON','btnExportReport','btnExportTicket','btnScanDiff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.hidden = true; el.style.setProperty('display', 'none', 'important'); }
  });
  const fb = document.getElementById('filterBar');
  if (fb) { fb.hidden = true; fb.style.setProperty('display', 'none', 'important'); }

  chatHistory_el.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'welcome-card';
  card.id = 'welcomeCard';

  const caps = [
    { icon: `<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 11 4.3 13.5l1.4-4.3L2 6.5h4.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`, label: 'CVSS v3.1 Scoring', desc: 'Vektor & kalkulasi skor defensif' },
    { icon: `<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`, label: 'Dedup & Grouping', desc: 'Konsolidasi temuan serupa' },
    { icon: `<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 12l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`, label: 'Risk Priority Queue', desc: 'Fix Now · Fix Soon · Backlog' },
    { icon: `<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2L4 5v4c0 2.5 2 4.5 4 5 2-0.5 4-2.5 4-5V5L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`, label: 'Compliance Mapping', desc: 'ISO 27001 · ASVS · UU PDP' },
    { icon: `<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M5 4l-3 4 3 4M11 4l3 4-3 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, label: 'Scan Diff & Import', desc: 'Bandingkan export scanner' },
    { icon: `<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 2v3h3" stroke="currentColor" stroke-width="1.3"/></svg>`, label: 'Report Generator', desc: 'Markdown · JSON · Tiket' },
  ];

  card.innerHTML = `
    <div class="welcome-logo-wrap">
      <div class="welcome-logo">
        <svg width="30" height="30" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L4 6v5c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7V6L10 2z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M7 10l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="welcome-head-text">
      <h2 class="welcome-title">VulnTriage</h2>
      <div class="welcome-badge">IBM AI Builders — IT Track</div>
    </div>
    <p class="welcome-subtitle">${currentLang === 'id' ? 'Triage laporan kerentanan keamanan secara defensif dengan kalkulasi CVSS v3.1, verifikasi dedup, pemetaan kepatuhan, dan panduan remediasi teknis.' : 'Automated vulnerability triage agent: conservative CVSS v3.1 scoring, compliance mapping, and remediation priorities.'}</p>
    <div class="welcome-caps">
      ${caps.map(c => `
        <div class="welcome-cap">
          <div class="welcome-cap-icon">${c.icon}</div>
          <div class="welcome-cap-content">
            <span class="welcome-cap-name">${escHtml(c.label)}</span>
            <span class="welcome-cap-desc">${escHtml(c.desc)}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="welcome-hint">
      <span class="welcome-hint-badge">${isMockMode ? 'MOCK MODE' : 'LIVE API'}</span>
      <span>${currentLang === 'id' ? 'Pilih contoh laporan di sidebar atau tempel laporan kerentanan di bawah' : 'Pick a sample from sidebar or paste your report below'}</span>
    </div>`;

  chatHistory_el.appendChild(card);
}

/* =============================================================================
   SECTION 11: CHAT RENDERING
   ============================================================================= */
function appendUserMessage(text) {
  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const wrap = document.createElement('div');
  wrap.className = 'msg-row msg-user';
  wrap.innerHTML = `
    <div class="msg-meta">
      <span class="msg-sender">Anda</span>
      <span class="msg-time">${now}</span>
    </div>
    <div class="msg-bubble user"><pre class="msg-pre">${escHtml(text)}</pre></div>`;
  chatHistory_el.appendChild(wrap);
  scrollToBottom();
}

function appendTypingIndicator() {
  const wrap = document.createElement('div');
  wrap.className = 'msg-row msg-agent';
  wrap.id = 'typingWrap';
  wrap.innerHTML = `
    <div class="agent-avatar" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L4 6v5c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7V6L10 2z" stroke="url(#ag)" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M7 10l2 2 4-4" stroke="url(#ag)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <defs><linearGradient id="ag" x1="4" y1="2" x2="16" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="#f97316"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
      </svg>
    </div>
    <div class="typing-indicator">
      <span></span><span></span><span></span>
      <span style="font-size:.78rem;color:var(--text-muted);margin-left:.4rem;animation:none;width:auto;height:auto;background:none">Menganalisis laporan kerentanan...</span>
    </div>`;
  chatHistory_el.appendChild(wrap);
  scrollToBottom(true);
  return wrap;
}

function replaceTypingWithResponse(typingWrap, parsed, rawText) {
  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const wrap = document.createElement('div');
  wrap.className = 'msg-row msg-agent';
  wrap.innerHTML = `
    <div class="agent-avatar" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L4 6v5c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7V6L10 2z" stroke="url(#ag2)" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M7 10l2 2 4-4" stroke="url(#ag2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <defs><linearGradient id="ag2" x1="4" y1="2" x2="16" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="#f97316"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
      </svg>
    </div>
    <div class="msg-body-agent">
      <div class="msg-meta-agent">
        <span class="msg-sender">VulnTriage</span>
        <span class="msg-time">${now}</span>
      </div>
    </div>`;

  const bodyEl = wrap.querySelector('.msg-body-agent');
  bodyEl.appendChild(buildTriageOutput(parsed));
  typingWrap.replaceWith(wrap);
  scrollToBottom();

  // show export buttons
  ['btnCopyMarkdown','btnExportJSON','btnExportReport','btnExportTicket','btnScanDiff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.hidden = false; el.style.removeProperty('display'); }
  });
  updateDashboard();
}

function scrollToBottom(smooth = true) {
  setTimeout(() => {
    chatHistory_el.scrollTo({
      top: chatHistory_el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, 40);
}

/* =============================================================================
   SECTION 12: SEND MESSAGE
   ============================================================================= */
async function sendMessage(text) {
  if (!text.trim() || isWaiting) return;

  const welcomeCard = document.getElementById('welcomeCard');
  if (welcomeCard) welcomeCard.remove();

  isWaiting = true;
  document.getElementById('btnSend').disabled = true;
  const inputEl = document.getElementById('userInput');
  inputEl.value = '';
  inputEl.style.height = '';
  autoResizeTextarea(inputEl);
  updateInputCounter();

  chatHistory.push({ role: 'user', text, timestamp: Date.now() });
  appendUserMessage(text);

  const typingWrap = appendTypingIndicator();

  try {
    let rawResponse;
    if (isMockMode) {
      await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
      rawResponse = getMockResponse(text);
    } else {
      rawResponse = await callLLMApi(text);
    }

    const parsed = parseTriageResponse(rawResponse);
    lastTriageResult = parsed;
    chatHistory.push({ role: 'agent', text: rawResponse, timestamp: Date.now() });
    replaceTypingWithResponse(typingWrap, parsed, rawResponse);

  } catch (err) {
    console.error('[VulnTriage]', err);
    appendErrorMessage(`Terjadi kesalahan: ${err.message}`);
    typingWrap.remove();
  } finally {
    isWaiting = false;
    document.getElementById('btnSend').disabled = false;
    document.getElementById('userInput').focus();
  }
}

function appendErrorMessage(text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-row msg-error';
  wrap.innerHTML = `
    <div class="error-icon" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M7 4v3M7 9v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
    </div>
    <div class="msg-bubble error"><strong>Error</strong><p>${escHtml(text)}</p></div>`;
  chatHistory_el.appendChild(wrap);
  scrollToBottom();
}

/* =============================================================================
   SECTION 13: EXPORT — Markdown, JSON, Report HTML, Ticket
   ============================================================================= */
function copyMarkdown() {
  if (!lastTriageResult) { showToast('Belum ada hasil triage.'); return; }
  const p = lastTriageResult;
  const sections = [
    ['Triage Status', p.status],
    ['Ringkasan', p.summary],
    ['Kategori', p.category],
    ['Severity', p.severity],
    ['Dampak Bisnis', p.impact],
    ['Langkah Reproduksi', p.steps],
    ['Remediasi', p.remediation],
    ['Pemetaan Kepatuhan', p.compliance],
    ['Skor False Positive', p.fpScore],
    ['Informasi yang Diperlukan', p.missing],
    ['Asumsi', p.assumptions],
    ['Scope & Limitations', p.scope],
  ].filter(([, v]) => v && v.trim());

  const md = sections.map(([title, body]) => `## ${title}\n\n${body}`).join('\n\n---\n\n');

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(md).then(() => showToast('Markdown disalin ke clipboard!'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = md; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    ta.remove(); showToast('Markdown disalin!');
  }
}

function exportJSON() {
  if (!lastTriageResult) { showToast('Belum ada hasil triage.'); return; }
  const json = JSON.stringify(lastTriageResult, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `vulntriage-${Date.now()}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('JSON berhasil diunduh!');
}

function exportReportHTML() {
  if (!lastTriageResult) { showToast('Belum ada hasil triage.'); return; }
  const p = lastTriageResult;
  const sev = getSeverityLabel(p.severity);
  const statusCls = getStatusClass(p.status);
  const statusColors = { valid: '#16a34a', needs: '#d97706', invalid: '#6b7280' };

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>VulnTriage Report — ${new Date().toLocaleDateString('id-ID')}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:2rem;color:#1f2937;background:#fff}
  h1{font-size:1.6rem;border-bottom:3px solid #f97316;padding-bottom:.5rem;margin-bottom:1.5rem}
  h2{font-size:1rem;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin:1.5rem 0 .4rem}
  .status{display:inline-block;padding:.3em .9em;border-radius:999px;font-size:.78rem;font-weight:700;background:${statusColors[statusCls]}22;color:${statusColors[statusCls]};border:1px solid ${statusColors[statusCls]}44}
  .sev{display:inline-block;padding:.25em .8em;border-radius:6px;font-size:.8rem;font-weight:700}
  .sev-critical{background:#dc262622;color:#dc2626}.sev-high{background:#ea580c22;color:#ea580c}
  .sev-medium{background:#d9770622;color:#d97706}.sev-low{background:#65a30d22;color:#65a30d}
  .cvss{font-family:monospace;background:#f3f4f6;padding:.4rem .7rem;border-radius:4px;font-size:.82rem;word-break:break-all;margin:.5rem 0}
  pre{background:#f3f4f6;padding:1rem;border-radius:6px;overflow-x:auto;font-size:.82rem}
  table{width:100%;border-collapse:collapse;margin-top:.5rem}
  th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;padding:.3rem .5rem;border-bottom:2px solid #e5e7eb}
  td{padding:.4rem .5rem;border-bottom:1px solid #f3f4f6;font-size:.85rem}
  .footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:.75rem;color:#9ca3af}
  p{line-height:1.65;margin:.3rem 0}
  ol,ul{padding-left:1.4rem}li{margin:.2rem 0}
</style>
</head>
<body>
<h1>VulnTriage — Laporan Triage Kerentanan</h1>
<p style="color:#6b7280;font-size:.85rem">Dibuat: ${new Date().toLocaleString('id-ID')} · IBM AI Builders Challenge — IT Track</p>
<div style="margin:1rem 0"><span class="status">${escHtml(p.status || '')}</span></div>
<h2>Ringkasan Eksekutif</h2><p>${escHtml(p.summary || '-')}</p>
<h2>Kategori</h2><p>${escHtml(p.category || '-')}</p>
<h2>Tingkat Keparahan</h2>
<div><span class="sev sev-${sev.cls}">${sev.label}</span></div>
${p.severity.match(/CVSS:3\.1\/[^\s\n]+/) ? `<div class="cvss">${escHtml(p.severity.match(/CVSS:3\.1\/[^\s\n]+/)[0])}</div>` : ''}
<h2>Dampak Bisnis</h2><p>${escHtml(p.impact || '-')}</p>
<h2>Langkah Reproduksi</h2><pre>${escHtml(p.steps || '-')}</pre>
<h2>Remediasi</h2><pre>${escHtml(p.remediation || '-')}</pre>
<h2>Pemetaan Kepatuhan</h2><pre>${escHtml(p.compliance || '-')}</pre>
<h2>Skor False Positive</h2><p>${escHtml(p.fpScore || '-')}</p>
<h2>Informasi yang Diperlukan</h2><p>${escHtml(p.missing || 'Tidak ada')}</p>
<h2>Asumsi</h2><p>${escHtml(p.assumptions || 'Tidak ada')}</p>
<div class="footer">Laporan ini dihasilkan oleh VulnTriage AI Agent. Bersifat indikatif — verifikasi dengan security analyst bersertifikat sebelum digunakan untuk keputusan bisnis. VulnTriage tidak melakukan scanning langsung. Semua compliance mapping perlu diverifikasi dengan auditor.</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `vulntriage-report-${Date.now()}.html`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('Laporan HTML berhasil diunduh!');
}

function exportTicket() {
  if (!lastTriageResult) { showToast('Belum ada hasil triage.'); return; }
  const p = lastTriageResult;
  const sev = getSeverityLabel(p.severity);
  const ticket = `## [${sev.label.toUpperCase()}] ${(p.summary || 'Vulnerability Report').split('.')[0].substring(0, 80)}

**Severity:** ${sev.label}
**CVSS Score:** ${(p.severity.match(/Score:\s*([\d.]+)/i) || ['','N/A'])[1]}
**Category:** ${(p.category || '-').split('\n')[0]}
**Status:** ${p.status || '-'}

---

### Deskripsi
${p.summary || '-'}

### Dampak Bisnis
${p.impact || '-'}

### Langkah Reproduksi
${p.steps || '-'}

### Remediasi
${p.remediation ? p.remediation.substring(0, 600) : '-'}

### Acceptance Criteria
- [ ] Parameterized queries / output encoding diimplementasikan
- [ ] Unit test untuk input berbahaya lulus
- [ ] Security review oleh tim keamanan
- [ ] Tidak ada konsol error terkait kerentanan ini
- [ ] Compliance mapping diverifikasi dengan auditor

---
*Dibuat oleh VulnTriage AI · IBM AI Builders Challenge*
`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(ticket).then(() => showToast('Format tiket disalin ke clipboard!'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = ticket; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    showToast('Format tiket disalin!');
  }
}

/* =============================================================================
   SECTION 14: SCAN DIFF
   ============================================================================= */
function parseScanInput(text) {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const data = JSON.parse(t);
      const findings = Array.isArray(data) ? data : (data.findings || []);
      return findings.map(f => ({ id: f.id || f.name, name: f.name || f.id, severity: f.risk || f.severity || '' }));
    } catch { return []; }
  }
  // CSV
  const lines = t.split('\n').filter(l => l.trim() && !l.startsWith('Issue Type'));
  return lines.map(l => {
    const cols = l.split(',');
    return { id: cols[0]?.trim(), name: cols[0]?.trim(), severity: cols[1]?.trim() || '' };
  }).filter(f => f.name);
}

function runScanDiff() {
  const oldText = document.getElementById('diffOldInput').value;
  const newText = document.getElementById('diffNewInput').value;
  if (!oldText.trim() || !newText.trim()) { showToast('Isi kedua input terlebih dahulu.'); return; }

  const oldFindings = parseScanInput(oldText);
  const newFindings = parseScanInput(newText);

  const oldNames = new Set(oldFindings.map(f => f.name));
  const newNames = new Set(newFindings.map(f => f.name));

  const added     = newFindings.filter(f => !oldNames.has(f.name));
  const fixed     = oldFindings.filter(f => !newNames.has(f.name));
  const unchanged = newFindings.filter(f => oldNames.has(f.name));

  const resultEl = document.getElementById('diffResult');
  let html = '';

  if (added.length) {
    html += `<div class="diff-section-title new"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> Baru (${added.length})</div>`;
    html += added.map(f => `<div class="diff-item new"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> <strong>${escHtml(f.name)}</strong> <span style="color:var(--text-muted)">${escHtml(f.severity)}</span></div>`).join('');
  }
  if (fixed.length) {
    html += `<div class="diff-section-title fixed"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Diperbaiki (${fixed.length})</div>`;
    html += fixed.map(f => `<div class="diff-item fixed"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> <strong>${escHtml(f.name)}</strong></div>`).join('');
  }
  if (unchanged.length) {
    html += `<div class="diff-section-title unchanged">Tidak Berubah (${unchanged.length})</div>`;
    html += unchanged.map(f => `<div class="diff-item unchanged">${escHtml(f.name)} <span style="color:var(--text-muted)">${escHtml(f.severity)}</span></div>`).join('');
  }
  if (!html) html = '<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">Tidak ada perbedaan terdeteksi atau input tidak valid.</p>';
  resultEl.innerHTML = html;
}

/* =============================================================================
   SECTION 15: DASHBOARD
   ============================================================================= */
function updateDashboard() {
  if (!lastTriageResult) return;
  const p = lastTriageResult;
  const sev = getSeverityLabel(p.severity);

  // Count severities from last result (mock: build from priority queue)
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  if (sev.cls !== 'info') counts[sev.cls]++;

  // Try to extract counts from priority queue
  const pqText = (p.priority || '').toLowerCase();
  const sevKeys = ['critical', 'high', 'medium', 'low'];
  sevKeys.forEach(k => {
    const match = pqText.match(new RegExp(`score\\s+[\\d.]+.*?${k}`, 'gi'));
    if (match) counts[k] = Math.max(counts[k], match.length);
  });

  // Add dedup groups count
  const dedupMatch = (p.dedup || '').match(/(\d+)\s+temuan/gi);
  const dedupTotal = dedupMatch ? dedupMatch.reduce((s, m) => s + parseInt(m), 0) : 0;

  const total = Object.values(counts).reduce((a, b) => a + b, 0) + dedupTotal;

  // Build dashboard cards
  const dashCards = document.getElementById('dashCards');
  dashCards.innerHTML = [
    { cls: 'total',    num: total || 1, label: 'Total' },
    { cls: 'critical', num: counts.critical, label: 'Critical' },
    { cls: 'high',     num: counts.high,     label: 'High' },
    { cls: 'medium',   num: counts.medium,   label: 'Medium' },
    { cls: 'low',      num: counts.low,      label: 'Low' },
  ].map(c => `<div class="dash-card ${c.cls}">
    <div class="dash-card-num">${c.num}</div>
    <div class="dash-card-label">${c.label}</div>
  </div>`).join('');

  // Draw bar chart on canvas
  const canvas = document.getElementById('dashChart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bars = [
    { label: 'Critical', count: counts.critical, color: '#dc2626' },
    { label: 'High',     count: counts.high,     color: '#ea580c' },
    { label: 'Medium',   count: counts.medium,   color: '#d97706' },
    { label: 'Low',      count: counts.low,      color: '#65a30d' },
  ];
  const maxCount = Math.max(...bars.map(b => b.count), 1);
  const barW = 40, gap = 18, startX = 20, chartH = 100, baseY = 120;

  bars.forEach((b, i) => {
    const x = startX + i * (barW + gap);
    const h = (b.count / maxCount) * chartH;
    ctx.fillStyle = b.color + '99';
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, baseY - h, barW, h, [4, 4, 0, 0]);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    if (b.count > 0) ctx.fillText(b.count, x + barW / 2, baseY - h - 5);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px system-ui';
    ctx.fillText(b.label, x + barW / 2, baseY + 14);
  });

  // Legend
  const legend = document.getElementById('dashLegend');
  legend.innerHTML = bars.map(b => `<div class="dash-legend-item">
    <div class="dash-legend-dot" style="background:${b.color}"></div>
    <span>${b.label}: ${b.count}</span>
  </div>`).join('');

  // Priority queue summary
  const dashQueue = document.getElementById('dashQueue');
  const queueItems = [];
  if (counts.critical > 0) queueItems.push({ cls: 'fix-now', label: 'Perbaiki Segera', text: `${counts.critical} temuan Critical` });
  if (counts.high > 0)     queueItems.push({ cls: 'fix-now', label: 'Perbaiki Segera', text: `${counts.high} temuan High` });
  if (counts.medium > 0)   queueItems.push({ cls: 'fix-soon', label: 'Perbaiki Segera', text: `${counts.medium} temuan Medium` });
  if (counts.low > 0)      queueItems.push({ cls: 'backlog', label: 'Backlog', text: `${counts.low} temuan Low` });

  dashQueue.innerHTML = queueItems.length
    ? `<div class="dash-queue-title">Antrian Prioritas</div>` +
      `<div class="priority-queue">${queueItems.map(qi => `<div class="pq-item ${qi.cls}"><span class="pq-label ${qi.cls}">${qi.label}</span><span>${escHtml(qi.text)}</span></div>`).join('')}</div>`
    : '';
}

/* =============================================================================
   SECTION 16: TOAST
   ============================================================================= */
function showToast(message, duration = 2600) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  toast.style.opacity = '1';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.hidden = true; }, 220);
  }, duration);
}

/* =============================================================================
   SECTION 17: SETTINGS PANEL
   ============================================================================= */
function initSettings() {
  const editor = document.getElementById('systemPromptEditor');
  const panel  = document.getElementById('settingsPanel');
  const toggle = document.getElementById('btnToggleSettings');

  editor.value = systemPrompt;

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.getElementById('btnSavePrompt').addEventListener('click', () => {
    systemPrompt = editor.value.trim() || DEFAULT_SYSTEM_PROMPT;
    showToast('System prompt disimpan!');
  });
  document.getElementById('btnResetPrompt').addEventListener('click', () => {
    systemPrompt = DEFAULT_SYSTEM_PROMPT;
    editor.value  = systemPrompt;
    showToast('System prompt direset ke default.');
  });
}

/* =============================================================================
   SECTION 18: MODE TOGGLE
   ============================================================================= */
function initModeToggle() {
  const toggle    = document.getElementById('toggleMock');
  const modeLabel = document.getElementById('modeLabel');
  const modeNote  = document.getElementById('modeNote');
  const statusEl  = document.getElementById('apiStatus');
  const statusTxt = document.getElementById('statusText');

  function update() {
    isMockMode = toggle.checked;
    if (isMockMode) {
      modeLabel.textContent = 'Mock Mode';
      modeNote.textContent  = 'Demo tanpa API key';
      statusEl.className    = 'status-indicator mock';
      statusTxt.textContent = 'Mock';
    } else {
      modeLabel.textContent = 'API Mode (OpenRouter)';
      modeNote.textContent  = LLM_CONFIG.model;
      statusEl.className    = 'status-indicator live';
      statusTxt.textContent = 'Live';
    }
  }
  toggle.addEventListener('change', update);
  update();
}

/* =============================================================================
   SECTION 19: SAMPLE BUTTONS
   ============================================================================= */
function initSampleButtons() {
  document.querySelectorAll('.example-btn[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sample;
      if (!SAMPLES[key]) return;
      document.getElementById('userInput').value = SAMPLES[key];
      updateInputCounter();
      autoResizeTextarea(document.getElementById('userInput'));
      showToast('Contoh dimuat — tekan Ctrl+Enter untuk mengirim');
      // close sidebar on mobile
      if (window.innerWidth < 768) closeSidebar();
    });
  });
}

/* =============================================================================
   SECTION 20: SIDEBAR
   ============================================================================= */
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.getElementById('btnOpenSidebar').hidden = false;
}
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const btnOpen  = document.getElementById('btnOpenSidebar');
  const btnClose = document.getElementById('btnToggleSidebar');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    btnOpen.hidden = true;
  }
  function closeSidebarFull() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    btnOpen.hidden = false;
  }

  btnOpen.addEventListener('click', openSidebar);
  btnClose.addEventListener('click', closeSidebarFull);
  overlay.addEventListener('click', closeSidebarFull);

  const ro = new ResizeObserver(() => {
    if (window.innerWidth < 768) {
      btnOpen.hidden = !sidebar.classList.contains('open');
    } else { btnOpen.hidden = true; }
  });
  ro.observe(document.body);
}

/* =============================================================================
   SECTION 21: CLEAR CHAT
   ============================================================================= */
function initClearChat() {
  document.getElementById('btnClearChat').addEventListener('click', () => {
    chatHistory = [];
    lastTriageResult = null;
    renderWelcome();
    showToast(currentLang === 'id' ? 'Chat dibersihkan.' : 'Chat cleared.');
  });
}

/* =============================================================================
   SECTION 22: TEXTAREA AUTO-RESIZE & COUNTER
   ============================================================================= */
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  if (!el.value) {
    el.style.height = '';
    return;
  }
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
function updateInputCounter() {
  const len = document.getElementById('userInput').value.length;
  document.getElementById('inputCounter').textContent = len;
}
function initKeyboard() {
  const input = document.getElementById('userInput');
  input.addEventListener('input', () => { autoResizeTextarea(input); updateInputCounter(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage(input.value.trim());
    }
  });
  document.getElementById('btnSend').addEventListener('click', () => {
    sendMessage(document.getElementById('userInput').value.trim());
  });
}

/* =============================================================================
   SECTION 23: EXPORT BUTTONS WIRING
   ============================================================================= */
function initExport() {
  document.getElementById('btnCopyMarkdown')?.addEventListener('click', copyMarkdown);
  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSON);
  document.getElementById('btnExportReport')?.addEventListener('click', exportReportHTML);
  document.getElementById('btnExportTicket')?.addEventListener('click', exportTicket);
}

/* =============================================================================
   SECTION 24: DASHBOARD TOGGLE
   ============================================================================= */
function initDashboard() {
  const btn   = document.getElementById('btnDashboard');
  const panel = document.getElementById('dashboardPanel');
  const close = document.getElementById('btnCloseDashboard');

  btn.addEventListener('click', () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    btn.classList.toggle('active', !isOpen);
    if (!isOpen) updateDashboard();
  });
  close.addEventListener('click', () => {
    panel.hidden = true;
    btn.classList.remove('active');
  });
}

/* =============================================================================
   SECTION 25: SCAN DIFF TOGGLE
   ============================================================================= */
function initScanDiff() {
  const btn   = document.getElementById('btnScanDiff');
  const panel = document.getElementById('scanDiffPanel');
  const close = document.getElementById('btnCloseScanDiff');
  const run   = document.getElementById('btnRunDiff');

  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    btn.classList.toggle('active', !panel.hidden);
  });
  close.addEventListener('click', () => { panel.hidden = true; btn.classList.remove('active'); });
  run.addEventListener('click', runScanDiff);
}

/* =============================================================================
   SECTION 26: LANGUAGE TOGGLE
   ============================================================================= */
function applyLang(lang) {
  currentLang = lang;
  document.getElementById('langLabel').textContent = lang.toUpperCase();
  document.getElementById('userInput').placeholder = t('inputPlaceholder');
  const hintEl = document.getElementById('inputHintText');
  if (hintEl) hintEl.textContent = t('inputHint');
  localStorage.setItem('tf_lang', lang);
}
function initLang() {
  applyLang(localStorage.getItem('tf_lang') || 'id');
  document.getElementById('btnLang').addEventListener('click', () => {
    applyLang(currentLang === 'id' ? 'en' : 'id');
    showToast(t('toastLang'));
  });
}

/* =============================================================================
   SECTION 27: THEME
   ============================================================================= */
const THEMES = ['dark','light','hc'];
const THEME_LABELS = { dark: 'Dark', light: 'Light', hc: 'High Contrast' };
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? '' : theme);
  localStorage.setItem('vt_theme', theme);
}
function initTheme() {
  applyTheme(localStorage.getItem('vt_theme') || 'dark');
  document.getElementById('btnTheme').addEventListener('click', () => {
    const idx  = THEMES.indexOf(currentTheme);
    const next = THEMES[(idx + 1) % THEMES.length];
    applyTheme(next);
    showToast(`Tema: ${THEME_LABELS[next]}`);
  });
}

/* =============================================================================
   SECTION 28: SESSION MANAGEMENT
   ============================================================================= */
const SESSION_KEY = 'vt_sessions';
function getSessions() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]'); } catch { return []; } }
function saveSessions(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s.slice(0, 10))); }

function renderSessionList() {
  const list = document.getElementById('sessionList');
  const sessions = getSessions();
  if (!sessions.length) {
    list.innerHTML = `<span class="session-empty">${currentLang === 'id' ? 'Belum ada sesi tersimpan' : 'No saved sessions'}</span>`;
    return;
  }
  list.innerHTML = '';
  for (const sess of sessions) {
    const item = document.createElement('div');
    item.className = 'session-item';
    const d = new Date(sess.ts);
    const timeStr = d.toLocaleDateString('id-ID', { day:'2-digit', month:'short' }) + ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    item.innerHTML = `
      <div class="session-item-info">
        <span class="session-item-name">${escHtml(sess.name)}</span>
        <span class="session-item-time">${timeStr}</span>
      </div>
      <button class="session-item-del" aria-label="Hapus sesi">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;

    item.addEventListener('click', e => {
      if (e.target.closest('.session-item-del')) return;
      loadSession(sess);
    });
    item.querySelector('.session-item-del').addEventListener('click', () => {
      const all = getSessions().filter(s => s.ts !== sess.ts);
      saveSessions(all);
      renderSessionList();
      showToast(currentLang === 'id' ? 'Sesi dihapus.' : 'Session deleted.');
    });
    list.appendChild(item);
  }
}

function loadSession(sess) {
  chatHistory = [...(sess.chatHistory || [])];
  lastTriageResult = sess.triageResult || null;
  chatHistory_el.innerHTML = '';
  if (!chatHistory.length) { renderWelcome(); return; }

  for (const msg of chatHistory) {
    if (msg.role === 'user') {
      appendUserMessage(msg.text);
    } else {
      const parsed = parseTriageResponse(msg.text);
      const typingWrap = appendTypingIndicator();
      replaceTypingWithResponse(typingWrap, parsed, msg.text);
    }
  }
  showToast(`"${sess.name}" ${currentLang === 'id' ? 'dimuat.' : 'loaded.'}`);
}

function saveCurrentSession() {
  if (!chatHistory.length) {
    showToast(currentLang === 'id' ? 'Belum ada percakapan untuk disimpan.' : 'Nothing to save yet.');
    return;
  }
  const sessions = getSessions();
  const name = `Triage ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'short' })} ${new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}`;
  sessions.unshift({ name, ts: Date.now(), chatHistory: [...chatHistory], triageResult: lastTriageResult });
  saveSessions(sessions);
  renderSessionList();
  showToast(`Sesi "${name}" disimpan!`);
}

function initSession() {
  renderSessionList();
  document.getElementById('btnSaveSession').addEventListener('click', saveCurrentSession);
}

/* =============================================================================
   SECTION 29: CANVAS BACKGROUND
   ============================================================================= */
function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const NODE_COUNT = 50;
  const LINK_DIST  = 130;
  let nodes = [];

  function getParticleColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--canvas-particle').trim() || 'rgba(249,115,22,0.4)';
  }
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function createParticle() {
    return { x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5, r:1+Math.random()*2 };
  }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x<0||n.x>canvas.width)  n.vx *= -1;
      if (n.y<0||n.y>canvas.height) n.vy *= -1;
    }
    const color = getParticleColor();
    for (let i=0;i<nodes.length;i++) {
      for (let j=i+1;j<nodes.length;j++) {
        const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<LINK_DIST) {
          const alpha=(1-dist/LINK_DIST)*0.18;
          ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.strokeStyle=`rgba(249,115,22,${alpha})`; ctx.lineWidth=.7; ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle=color; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',()=>{ resize(); nodes=Array.from({length:NODE_COUNT},createParticle); });
  resize(); nodes=Array.from({length:NODE_COUNT},createParticle); draw();
}

/* =============================================================================
   SECTION 30: WELCOME MODAL
   ============================================================================= */
function initWelcomeModal() {
  const modal    = document.getElementById('welcomeModal');
  const btnStart = document.getElementById('wmStart');
  const btnClose = document.getElementById('wmClose');
  const chkDont  = document.getElementById('wmDontShow');

  if (!modal || !btnStart || !btnClose) return;
  if (localStorage.getItem('vt_modal_hide') === '1') { modal.hidden = true; return; }

  modal.hidden = false;
  modal.style.animation = 'none';
  requestAnimationFrame(() => { modal.style.animation = ''; btnStart.focus(); });

  let closing = false;
  function closeModal() {
    if (closing) return;
    closing = true;
    if (chkDont?.checked) localStorage.setItem('vt_modal_hide', '1');
    modal.style.animation  = 'none';
    modal.style.transition = 'opacity .2s ease';
    modal.style.opacity    = '0';
    setTimeout(() => {
      modal.hidden = true;
      modal.style.opacity = modal.style.transition = modal.style.animation = '';
      document.getElementById('userInput')?.focus();
    }, 220);
  }

  btnStart.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) { e.preventDefault(); closeModal(); }
  });
}

/* =============================================================================
   SECTION 31: BOOT
   ============================================================================= */
(function boot() {
  initCanvas();
  renderWelcome();
  initSettings();
  initModeToggle();
  initSampleButtons();
  initSidebar();
  initClearChat();
  initKeyboard();
  initExport();
  initTheme();
  initLang();
  initSession();
  initDashboard();
  initScanDiff();
  initWelcomeModal();

  document.getElementById('userInput').focus();
})();
