/* ============================================================================
   TestForge — app.js
   Chat engine · Mock mode · Export (CSV + Markdown) · Settings panel
   ============================================================================ */

/* =============================================================================
   SECTION 1: DEFAULT SYSTEM PROMPT
   (Mirrored from system_prompt.md — editable live in settings panel)
   ============================================================================= */
const DEFAULT_SYSTEM_PROMPT = `Kamu adalah TestForge, agen AI senior spesialis Quality Assurance.

TUGAS: Ubah persyaratan perangkat lunak menjadi test suite terstruktur.

LANGKAH PENALARAN (ikuti berurutan):
A) Ekstrak fitur, aktor, dan aturan bisnis dari input.
B) Jika ambigu, ajukan MAKSIMAL 3 pertanyaan klarifikasi. Jika jelas, langsung buat test case.
C) Buat test case mencakup semua tipe: Positive, Negative, Boundary, Edge, Security, Non-Functional.
D) Self-review: cek duplikasi, cakupan, boundary condition, celah keamanan.

FORMAT OUTPUT (WAJIB):
---ANALYSIS---
Fitur: [nama fitur]
Aktor: [daftar aktor]
Aturan Bisnis: [ringkasan]
---TESTCASES---
TC-001|[Judul]|[Prasyarat]|[Langkah]|[Hasil yang Diharapkan]|[High/Medium/Low]|[Positive/Negative/Boundary/Edge/Security/Non-Functional]
TC-002|...
---COVERAGE---
Total: N | Positive: n | Negative: n | Boundary: n | Edge: n | Security: n | Non-Functional: n
---ASSUMPTIONS---
- [Asumsi jika ada]

GUARDRAIL:
- Jangan mengarang persyaratan yang tidak ada; tandai asumsi dengan [ASUMSI]
- Jika input bukan persyaratan perangkat lunak, tolak dengan sopan
- Bahasa default: Indonesia; beralih ke Inggris jika pengguna menulis dalam Inggris`;

/* =============================================================================
   SECTION 2: SAMPLE REQUIREMENTS
   ============================================================================= */
const SAMPLES = {
  login: `**User Story: Form Login Pengguna**

Sebagai pengguna terdaftar, saya ingin dapat masuk ke aplikasi menggunakan email dan password agar dapat mengakses fitur yang memerlukan autentikasi.

**Kriteria Penerimaan:**
- Form memiliki dua field: Email dan Password
- Email harus dalam format valid (mengandung @, domain valid)
- Password minimal 8 karakter
- Jika berhasil login, pengguna diarahkan ke halaman dashboard
- Jika gagal (email tidak terdaftar / password salah), tampilkan pesan error "Email atau password tidak valid"
- Setelah 5 kali gagal login, akun dikunci selama 15 menit
- Tersedia tombol "Lupa Password" yang mengirim email reset
- Password disembunyikan secara default; ada toggle show/hide`,

  checkout: `**API Specification: Checkout Order**

Endpoint: POST /api/v1/orders/checkout
Auth: Bearer token (required)

Request Body:
\`\`\`json
{
  "cart_id": "string (required)",
  "shipping_address_id": "string (required)",
  "payment_method": "credit_card | transfer | wallet (required)",
  "voucher_code": "string (optional)"
}
\`\`\`

Business Rules:
- Cart harus milik pengguna yang terautentikasi
- Cart tidak boleh kosong
- Semua item dalam cart harus tersedia (stock > 0)
- Voucher, jika ada, harus valid dan belum expired
- Diskon voucher: 0–100%, tipe: persentase atau flat
- Total akhir tidak boleh negatif
- Response sukses: 201 Created dengan order_id
- Stok dikurangi secara atomik setelah pembayaran berhasil`,

  upload: `**Spesifikasi Fitur: Upload File Profil Pengguna**

Pengguna dapat mengunggah foto profil melalui halaman pengaturan akun.

Ketentuan:
- Format yang diizinkan: JPG, PNG, WEBP
- Ukuran maksimal file: 5 MB
- Dimensi minimal: 100×100 piksel
- Dimensi maksimal: 4000×4000 piksel
- File akan dikompresi otomatis menjadi 400×400 piksel dan disimpan di object storage
- Hanya pengguna yang sudah verifikasi email yang bisa mengupload
- Pengguna hanya bisa mengganti foto profil miliknya sendiri
- Preview foto ditampilkan sebelum disimpan
- Setelah berhasil, foto lama dihapus dari storage`
};

/* =============================================================================
   SECTION 3: MOCK RESPONSES
   Three full structured responses matching the agent's output format.
   ============================================================================= */
const MOCK_RESPONSES = {
  login: `---ANALYSIS---
Fitur: Autentikasi Pengguna (Form Login)
Aktor: Pengguna Terdaftar, Sistem Autentikasi, Server Email
Aturan Bisnis: Email harus valid; password minimal 8 karakter; akun terkunci setelah 5 kali gagal selama 15 menit; reset password via email tersedia.
---TESTCASES---
TC-001|Login berhasil dengan kredensial valid|Pengguna terdaftar, akun aktif|1. Buka halaman login 2. Masukkan email valid 3. Masukkan password benar 4. Klik Login|Pengguna diarahkan ke dashboard|High|Positive
TC-002|Login gagal — password salah|Pengguna terdaftar, akun aktif|1. Buka halaman login 2. Masukkan email valid 3. Masukkan password salah 4. Klik Login|Pesan error "Email atau password tidak valid" ditampilkan; tetap di halaman login|High|Negative
TC-003|Login gagal — email tidak terdaftar|Tidak ada akun untuk email|1. Masukkan email tidak terdaftar 2. Masukkan password apapun 3. Klik Login|Pesan error "Email atau password tidak valid" ditampilkan|High|Negative
TC-004|Validasi format email — tanpa karakter @|Halaman login terbuka|1. Masukkan "useremailcom" di field Email 2. Klik Login|Validasi sisi klien menolak; pesan "Format email tidak valid"|Medium|Boundary
TC-005|Validasi panjang password — 7 karakter (di bawah batas)|Halaman login terbuka|1. Masukkan email valid 2. Masukkan password 7 karakter 3. Klik Login|Sistem menolak; pesan "Password minimal 8 karakter"|Medium|Boundary
TC-006|Validasi panjang password — tepat 8 karakter (di batas)|Halaman login terbuka|1. Masukkan email valid 2. Masukkan password tepat 8 karakter benar 3. Klik Login|Login berhasil|Medium|Boundary
TC-007|Penguncian akun setelah 5 kali gagal|Pengguna terdaftar, akun aktif|1. Gagalkan login 5 kali berturut-turut dengan password salah|Akun dikunci; pesan "Akun dikunci selama 15 menit"|High|Edge
TC-008|Percobaan login ke akun yang sedang terkunci|Akun dalam status terkunci|1. Masukkan kredensial benar saat akun terkunci|Login ditolak; pesan "Akun dikunci, coba lagi dalam X menit"|High|Negative
TC-009|Field email kosong|Halaman login terbuka|1. Biarkan field Email kosong 2. Isi Password 3. Klik Login|Validasi menolak; pesan "Email tidak boleh kosong"|Medium|Edge
TC-010|Field password kosong|Halaman login terbuka|1. Isi Email valid 2. Biarkan Password kosong 3. Klik Login|Validasi menolak; pesan "Password tidak boleh kosong"|Medium|Edge
TC-011|Toggle show/hide password berfungsi|Halaman login terbuka|1. Masukkan password 2. Klik ikon show 3. Verifikasi karakter terlihat 4. Klik ikon hide|Password tersembunyi/terlihat sesuai toggle|Low|Positive
TC-012|SQL Injection pada field email|Halaman login terbuka|1. Masukkan ' OR '1'='1 pada field Email 2. Klik Login|Sistem menolak input; tidak ada data yang bocor; pesan error umum|High|Security
TC-013|XSS pada field email|Halaman login terbuka|1. Masukkan <script>alert(1)</script> pada field Email|Script tidak dieksekusi; input di-sanitasi|High|Security
TC-014|Brute force setelah reset kunci|Akun baru saja di-unlock setelah 15 menit|1. Gagalkan login 5 kali lagi setelah kunci dilepas|Akun kembali dikunci; hitungan reset dengan benar|Medium|Security
TC-015|Fungsi "Lupa Password" mengirim email reset|Halaman login terbuka, email terdaftar|1. Klik "Lupa Password" 2. Masukkan email terdaftar 3. Submit|Email reset terkirim ke alamat; pesan konfirmasi muncul|High|Positive
TC-016|"Lupa Password" dengan email tidak terdaftar|Halaman login terbuka|1. Klik "Lupa Password" 2. Masukkan email tidak terdaftar 3. Submit|Pesan konfirmasi generic ditampilkan (tidak bocorkan apakah email terdaftar)|Medium|Security
---COVERAGE---
Total: 16 | Positive: 3 | Negative: 3 | Boundary: 3 | Edge: 3 | Security: 4
---ASSUMPTIONS---
- [ASUMSI] Validasi email dilakukan baik sisi klien maupun server
- [ASUMSI] Hitungan percobaan login direset setelah login berhasil
- [ASUMSI] Token reset password memiliki masa berlaku (tidak disebutkan dalam persyaratan)`,

  checkout: `---ANALYSIS---
Fitur: Checkout Order via API
Aktor: Pengguna Terautentikasi, Sistem Pembayaran, Sistem Inventori, Sistem Voucher
Aturan Bisnis: Cart harus milik pengguna terautentikasi dan tidak boleh kosong; semua item harus tersedia; voucher opsional harus valid; total akhir ≥ 0; stok dikurangi secara atomik.
---TESTCASES---
TC-001|Checkout berhasil dengan semua field valid|Pengguna login, cart berisi item tersedia, alamat valid|1. POST /api/v1/orders/checkout dengan cart_id, shipping_address_id, payment_method valid|201 Created dengan order_id; stok berkurang|High|Positive
TC-002|Checkout berhasil dengan voucher valid|Semua kondisi TC-001, plus voucher aktif|1. POST dengan voucher_code valid|201 Created; diskon diterapkan; total berkurang sesuai|High|Positive
TC-003|Checkout tanpa Bearer token|Tidak ada header Authorization|1. POST tanpa header Authorization|401 Unauthorized|High|Security
TC-004|Checkout dengan token pengguna lain (cart bukan miliknya)|Pengguna B mencoba checkout cart milik pengguna A|1. POST dengan cart_id milik pengguna lain|403 Forbidden|High|Security
TC-005|Checkout dengan cart kosong|Pengguna login, cart kosong|1. POST dengan cart_id yang kosong|400 Bad Request; pesan "Cart tidak boleh kosong"|High|Negative
TC-006|Checkout dengan item stok habis|Pengguna login, satu item dalam cart stok = 0|1. POST dengan cart yang mengandung item tanpa stok|409 Conflict atau 422; pesan item tidak tersedia|High|Negative
TC-007|Checkout tanpa field wajib (cart_id)|Pengguna login|1. POST tanpa cart_id|400 Bad Request; pesan validasi field|High|Negative
TC-008|Checkout dengan payment_method tidak valid|Pengguna login|1. POST dengan payment_method: "bitcoin"|400 Bad Request; pesan enum tidak valid|Medium|Negative
TC-009|Checkout dengan voucher sudah expired|Pengguna login, voucher melewati tanggal berlaku|1. POST dengan voucher_code kadaluarsa|422 Unprocessable; pesan "Voucher sudah expired"|Medium|Negative
TC-010|Checkout dengan voucher tidak ditemukan|Pengguna login|1. POST dengan voucher_code acak tidak valid|422 Unprocessable; pesan "Voucher tidak valid"|Medium|Negative
TC-011|Diskon voucher flat menghasilkan total = 0|Voucher flat sama dengan total harga cart|1. POST dengan voucher yang membuat total = 0|201 Created; total = 0 (tidak negatif)|High|Boundary
TC-012|Diskon voucher flat lebih besar dari total (total negatif)|Voucher flat > total harga|1. POST dengan voucher sangat besar|Sistem meng-cap total di 0; tidak negatif; atau 422|High|Boundary
TC-013|Checkout dengan cart berisi 1 item (batas bawah)|Cart valid dengan tepat 1 item|1. POST dengan cart berisi 1 item tersedia|201 Created|Medium|Boundary
TC-014|Race condition — 2 pengguna checkout item terakhir bersamaan|Stok item = 1, dua request simultan|1. Kirim dua POST bersamaan untuk item yang sama|Hanya satu yang berhasil (201); yang lain 409 atau 422|High|Edge
TC-015|SQL Injection pada voucher_code|Pengguna login|1. POST dengan voucher_code: "' OR 1=1--"|400 atau 422; tidak ada data yang bocor|High|Security
TC-016|cart_id berformat UUID valid tapi tidak ada di DB|Pengguna login|1. POST dengan cart_id UUID yang tidak ada|404 Not Found|Medium|Edge
---COVERAGE---
Total: 16 | Positive: 2 | Negative: 5 | Boundary: 3 | Edge: 3 | Security: 3
---ASSUMPTIONS---
- [ASUMSI] Autentikasi menggunakan JWT Bearer token standar
- [ASUMSI] Pengurangan stok bersifat transaksional (atomik)
- [ASUMSI] Voucher diskon persentase tidak menyebabkan total negatif secara alami`,

  upload: `---ANALYSIS---
Fitur: Upload Foto Profil Pengguna
Aktor: Pengguna Terverifikasi, Object Storage, Sistem Kompresi Gambar
Aturan Bisnis: Format JPG/PNG/WEBP; maks 5 MB; dimensi 100×100–4000×4000 px; hanya pengguna terverifikasi email yang bisa upload; pengguna hanya bisa ubah fotonya sendiri; file lama dihapus setelah berhasil.
---TESTCASES---
TC-001|Upload berhasil dengan JPG valid|Pengguna terverifikasi, file JPG 1 MB, 500×500 px|1. Buka halaman pengaturan 2. Pilih file JPG 3. Lihat preview 4. Klik Simpan|Preview tampil; upload berhasil; foto baru muncul di profil; foto lama terhapus|High|Positive
TC-002|Upload berhasil dengan PNG valid|Pengguna terverifikasi, file PNG 2 MB|1. Pilih file PNG 400×400 px 2. Simpan|Upload berhasil; foto dikompresi ke 400×400|High|Positive
TC-003|Upload berhasil dengan WEBP valid|Pengguna terverifikasi, file WEBP 500 KB|1. Pilih file WEBP 200×200 px 2. Simpan|Upload berhasil|Medium|Positive
TC-004|Upload file dengan format tidak diizinkan (PDF)|Pengguna terverifikasi|1. Pilih file .pdf 2. Coba upload|Sistem menolak; pesan "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP"|High|Negative
TC-005|Upload file dengan format tidak diizinkan (GIF)|Pengguna terverifikasi|1. Pilih file .gif 2. Coba upload|Sistem menolak dengan pesan format tidak valid|Medium|Negative
TC-006|Upload file tepat 5 MB (di batas maksimal)|Pengguna terverifikasi|1. Pilih file JPG tepat 5.00 MB 2. Upload|Upload berhasil (di batas, termasuk)|High|Boundary
TC-007|Upload file sedikit di atas 5 MB (5.01 MB)|Pengguna terverifikasi|1. Pilih file JPG 5.01 MB 2. Upload|Sistem menolak; pesan "Ukuran file melebihi 5 MB"|High|Boundary
TC-008|Upload gambar dimensi tepat 100×100 px (batas minimal)|Pengguna terverifikasi|1. Pilih gambar 100×100 px 2. Upload|Upload berhasil; dikompresi ke 400×400|Medium|Boundary
TC-009|Upload gambar dimensi 99×99 px (di bawah batas minimal)|Pengguna terverifikasi|1. Pilih gambar 99×99 px 2. Upload|Sistem menolak; pesan "Dimensi gambar terlalu kecil (minimal 100×100 px)"|Medium|Boundary
TC-010|Upload gambar dimensi tepat 4000×4000 px (batas maksimal)|Pengguna terverifikasi|1. Pilih gambar 4000×4000 px 2. Upload|Upload berhasil; dikompresi ke 400×400|Medium|Boundary
TC-011|Upload gambar dimensi 4001×4001 px (di atas batas maksimal)|Pengguna terverifikasi|1. Pilih gambar 4001×4001 px 2. Upload|Sistem menolak; pesan "Dimensi gambar terlalu besar (maks 4000×4000 px)"|Medium|Boundary
TC-012|Upload oleh pengguna yang belum verifikasi email|Pengguna login tapi email belum diverifikasi|1. Buka halaman pengaturan 2. Pilih file 3. Klik Simpan|Sistem menolak; pesan "Verifikasi email Anda terlebih dahulu"|High|Negative
TC-013|Upload file gambar berukuran 0 byte (kosong)|Pengguna terverifikasi|1. Pilih file gambar kosong/corrupt 2. Upload|Sistem menolak; pesan "File tidak valid atau rusak"|Medium|Edge
TC-014|Upload file dengan ekstensi JPG namun konten bukan gambar (file bypass)|Pengguna terverifikasi|1. Rename file .php menjadi .jpg 2. Upload|Sistem menolak setelah validasi MIME type; bukan hanya ekstensi|High|Security
TC-015|Percobaan upload foto profil pengguna lain (IDOR)|Pengguna A mencoba mengubah foto pengguna B|1. Manipulasi request untuk menarget user_id pengguna B|403 Forbidden; foto pengguna B tidak berubah|High|Security
TC-016|Upload file dengan nama mengandung path traversal|Pengguna terverifikasi|1. Upload file dengan nama "../../../etc/passwd.jpg"|Sistem menyimpan dengan nama aman (di-sanitasi); tidak ada path traversal|High|Security
TC-017|Verifikasi foto lama dihapus setelah upload baru berhasil|Pengguna sudah memiliki foto profil|1. Upload foto baru 2. Cek storage|Foto lama tidak lagi ada di storage; hanya foto baru|Medium|Positive
---COVERAGE---
Total: 17 | Positive: 4 | Negative: 3 | Boundary: 6 | Edge: 1 | Security: 3
---ASSUMPTIONS---
- [ASUMSI] Validasi format dilakukan dengan memeriksa MIME type, bukan hanya ekstensi file
- [ASUMSI] Kompresi dilakukan server-side sebelum penyimpanan ke object storage
- [ASUMSI] Preview ditampilkan client-side sebelum file dikirim ke server`
};

/* =============================================================================
   SECTION 4: STATE
   ============================================================================= */
let isMockMode    = true;
let systemPrompt  = DEFAULT_SYSTEM_PROMPT;
let chatHistory   = [];          // { role: 'user'|'agent', text, timestamp }
let lastTestCases = [];          // array of parsed TC objects for export
let isWaiting     = false;
let currentLang   = 'id';        // 'id' | 'en'
let currentTheme  = 'dark';      // 'dark' | 'light' | 'hc'
let activeFilters = new Set();   // set of type strings currently shown

/* =============================================================================
   SECTION 4b: I18N STRINGS & t() HELPER
   (Declared here — before boot() — to avoid TDZ errors)
   ============================================================================= */
const I18N = {
  id: {
    inputPlaceholder: 'Tempel user story, API spec, atau PRD di sini…',
    inputHint:        'Mendukung: User Story · API Spec · PRD',
    send:             'Kirim',
    newChat:          'Chat Baru',
    savingLabel:      'Simpan Sesi Ini',
    toastLang:        'Bahasa: Indonesia',
    analysisTitle:    'Analisis Persyaratan',
    tcTitle:          'Test Cases',
    coverageTitle:    'Ringkasan Cakupan',
    assumptionsTitle: 'Asumsi',
    editSave:         'Simpan',
    editCancel:       'Batal',
    editedBadge:      'Diedit',
  },
  en: {
    inputPlaceholder: 'Paste your user story, API spec, or PRD here…',
    inputHint:        'Supports: User Story · API Spec · PRD',
    send:             'Send',
    newChat:          'New Chat',
    savingLabel:      'Save This Session',
    toastLang:        'Language: English',
    analysisTitle:    'Requirement Analysis',
    tcTitle:          'Test Cases',
    coverageTitle:    'Coverage Summary',
    assumptionsTitle: 'Assumptions',
    editSave:         'Save',
    editCancel:       'Cancel',
    editedBadge:      'Edited',
  },
};

function t(key) { return I18N[currentLang]?.[key] ?? I18N.id[key]; }

// ============================================================================
// SECTION 5: LLM API CALL (real mode)
// Replace the values below with your actual endpoint and key.
// ============================================================================
const LLM_CONFIG = {
  // --- IBM watsonx.ai example ---
  // endpoint: 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation',
  // apiKey: 'YOUR_IBM_WATSONX_API_KEY',
  // modelId: 'ibm/granite-13b-chat-v2',
  // projectId: 'YOUR_PROJECT_ID',

  // --- OpenAI-compatible example ---
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey:   'YOUR_OPENAI_API_KEY',
  model:    'gpt-4o-mini',
};

/**
 * Calls the real LLM API (OpenAI-compatible format).
 * Swap out the request body structure for IBM watsonx if needed.
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function callLLMApi(userMessage) {
  const response = await fetch(LLM_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: LLM_CONFIG.model,
      messages: [
        { role: 'system',  content: systemPrompt },
        ...chatHistory
          .filter(m => m.role !== 'agent' || !m.isWelcome)
          .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'Tidak ada respons dari API.';
}

/* =============================================================================
   SECTION 6: RESPONSE PARSER
   Parses the structured ---SECTION--- format into DOM components.
   ============================================================================= */

/**
 * Detect which sample key a message matches, for mock routing.
 * @param {string} text
 * @returns {'login'|'checkout'|'upload'|'generic'}
 */
function detectSampleKey(text) {
  const t = text.toLowerCase();
  if (t.includes('login') || t.includes('masuk') || t.includes('autentik')) return 'login';
  if (t.includes('checkout') || t.includes('order') || t.includes('cart') || t.includes('keranjang')) return 'checkout';
  if (t.includes('upload') || t.includes('foto') || t.includes('gambar') || t.includes('file')) return 'upload';
  return 'generic';
}

/**
 * Returns a mock response based on content keywords.
 * @param {string} userText
 * @returns {string}
 */
function getMockResponse(userText) {
  const key = detectSampleKey(userText);
  if (key !== 'generic') return MOCK_RESPONSES[key];
  return `---ANALYSIS---
Fitur: [Tidak terdeteksi — mohon berikan persyaratan perangkat lunak yang lebih spesifik]
Aktor: Belum dapat ditentukan
Aturan Bisnis: Belum dapat ditentukan
---TESTCASES---
TC-001|Contoh test case placeholder|Persyaratan tersedia|1. Lakukan aksi 2. Verifikasi hasil|Hasil sesuai ekspektasi|Medium|Positive
---COVERAGE---
Total: 1 | Positive: 1 | Negative: 0 | Boundary: 0 | Edge: 0 | Security: 0 | Non-Functional: 0
---ASSUMPTIONS---
- Ini adalah respons placeholder. Berikan persyaratan yang jelas untuk mendapatkan test suite lengkap.`;
}

/**
 * Parse raw structured text into sections.
 * @param {string} raw
 * @returns {{ analysis: string, testcases: TCObject[], coverage: string, assumptions: string[] }}
 */
function parseResponse(raw) {
  const sections = {
    analysis:    '',
    testcasesRaw: '',
    coverage:    '',
    assumptions: []
  };

  const analysisMatch     = raw.match(/---ANALYSIS---([\s\S]*?)(?=---TESTCASES---|$)/);
  const testcasesMatch    = raw.match(/---TESTCASES---([\s\S]*?)(?=---COVERAGE---|$)/);
  const coverageMatch     = raw.match(/---COVERAGE---([\s\S]*?)(?=---ASSUMPTIONS---|$)/);
  const assumptionsMatch  = raw.match(/---ASSUMPTIONS---([\s\S]*?)$/);

  if (analysisMatch)    sections.analysis     = analysisMatch[1].trim();
  if (testcasesMatch)   sections.testcasesRaw = testcasesMatch[1].trim();
  if (coverageMatch)    sections.coverage     = coverageMatch[1].trim();
  if (assumptionsMatch) {
    sections.assumptions = assumptionsMatch[1].trim()
      .split('\n')
      .map(l => l.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  }

  // Parse test cases: pipe-separated
  const testcases = sections.testcasesRaw
    .split('\n')
    .filter(line => /^TC-\d+/.test(line.trim()))
    .map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        id:        parts[0] || '',
        title:     parts[1] || '',
        precond:   parts[2] || '',
        steps:     parts[3] || '',
        expected:  parts[4] || '',
        priority:  parts[5] || 'Medium',
        type:      parts[6] || 'Positive',
      };
    });

  return { ...sections, testcases };
}

/* =============================================================================
   SECTION 7: DOM RENDERING
   ============================================================================= */

/**
 * Maps type string to CSS class.
 * @param {string} type
 */
function typeClass(type) {
  const map = {
    'positive':       'type-positive',
    'negative':       'type-negative',
    'boundary':       'type-boundary',
    'edge':           'type-edge',
    'edge case':      'type-edge',
    'security':       'type-security',
    'non-functional': 'type-nonfunc',
    'non_functional': 'type-nonfunc',
  };
  return map[type.toLowerCase()] || 'type-positive';
}

/**
 * Builds the agent response DOM node from parsed data.
 * @param {{ analysis, testcases, coverage, assumptions }} parsed
 * @returns {HTMLElement}
 */
function buildAgentOutput(parsed) {
  const wrap = document.createElement('div');

  // — Analysis block —
  if (parsed.analysis) {
    const ab = document.createElement('div');
    ab.className = 'analysis-block';
    parsed.analysis.split('\n').filter(Boolean).forEach(line => {
      const colonIdx = line.indexOf(':');
      const row = document.createElement('div');
      row.className = 'analysis-row';
      if (colonIdx > -1) {
        const key = document.createElement('span');
        key.className = 'analysis-key';
        key.textContent = line.slice(0, colonIdx);
        const val = document.createElement('span');
        val.className = 'analysis-val';
        val.textContent = line.slice(colonIdx + 1).trim();
        row.appendChild(key);
        row.appendChild(val);
      } else {
        row.textContent = line;
      }
      ab.appendChild(row);
    });
    wrap.appendChild(ab);
  }

  // — Test cases table —
  if (parsed.testcases.length > 0) {
    const title = document.createElement('div');
    title.className = 'tc-section-title';
    title.textContent = `Test Cases (${parsed.testcases.length})`;
    wrap.appendChild(title);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'tc-table-wrap';

    const table = document.createElement('table');
    table.className = 'tc-table';
    table.setAttribute('aria-label', 'Tabel test case');

    // Header
    table.innerHTML = `<thead><tr>
      <th>ID</th>
      <th>Judul</th>
      <th>Prasyarat</th>
      <th>Langkah</th>
      <th>Hasil yang Diharapkan</th>
      <th>Prioritas</th>
      <th>Tipe</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    for (const tc of parsed.testcases) {
      const tr = document.createElement('tr');
      tr.dataset.type = tc.type;
      tr.dataset.tcid = tc.id;
      tr.innerHTML = `
        <td class="tc-id">${escHtml(tc.id)}</td>
        <td class="editable">${escHtml(tc.title)}</td>
        <td class="editable">${escHtml(tc.precond)}</td>
        <td class="editable">${formatSteps(tc.steps)}</td>
        <td class="editable">${escHtml(tc.expected)}</td>
        <td><span class="prio-badge prio-${tc.priority.toLowerCase()}">${escHtml(tc.priority)}</span></td>
        <td><span class="type-badge ${typeClass(tc.type)}">${escHtml(tc.type)}</span></td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
  }

  // — Coverage block + donut chart —
  if (parsed.coverage) {
    const cb = document.createElement('div');
    cb.className = 'coverage-block';
    const h4 = document.createElement('h4');
    h4.textContent = t('coverageTitle') || 'Ringkasan Cakupan';
    const row = document.createElement('div');
    row.className = 'coverage-row';
    row.innerHTML = parsed.coverage.split('|').map(part => {
      const [label, val] = part.split(':').map(s => s.trim());
      return val ? `<span class="coverage-chip">${escHtml(label)} <span>${escHtml(val)}</span></span>` : '';
    }).join('');
    cb.append(h4, row);

    // Donut chart
    const donut = buildDonutChart(parsed.coverage);
    if (donut) cb.appendChild(donut);

    wrap.appendChild(cb);
  }

  // — Assumptions —
  if (parsed.assumptions.length > 0) {
    const ab2 = document.createElement('div');
    ab2.className = 'coverage-block';
    ab2.style.marginTop = '.4rem';
    ab2.innerHTML = `<h4>Asumsi</h4>`;
    const ul = document.createElement('ul');
    ul.className = 'assumptions-list';
    for (const a of parsed.assumptions) {
      const li = document.createElement('li');
      li.textContent = a;
      ul.appendChild(li);
    }
    ab2.appendChild(ul);
    wrap.appendChild(ab2);
  }

  return wrap;
}

/**
 * Formats step strings "1. ... 2. ..." as ordered list items.
 */
function formatSteps(steps) {
  const parts = steps.split(/\d+\.\s+/).filter(Boolean);
  if (parts.length <= 1) return escHtml(steps);
  return '<ol style="padding-left:1.2em;margin:0">' +
    parts.map(s => `<li>${escHtml(s.trim())}</li>`).join('') +
    '</ol>';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =============================================================================
   SECTION 8: CHAT RENDERING
   ============================================================================= */
const chatHistory_el = document.getElementById('chatHistory');

/* SVG icons for welcome cap-cards (no emoji) */
const CAP_ICONS = [
  /* Positive/Negative */ `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3" opacity=".4"/></svg>`,
  /* Boundary/Edge */     `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.2" opacity=".4"/></svg>`,
  /* Security */          `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l5 2v4c0 3-2.5 5.5-5 6C5.5 13.5 3 11 3 8V4l5-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 8l1.5 1.5L10 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  /* Non-Functional */    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4v4l3 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  /* Export CSV */        `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 13h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  /* Markdown */          `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="8" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3"/><path d="M5 1h9a1 1 0 011 1v8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
];
const CAP_LABELS = ['Positive & Negative','Boundary & Edge','Security','Non-Functional','Export CSV','Markdown'];

function renderWelcome() {
  const card = document.createElement('div');
  card.className = 'welcome-card';

  const logo = document.createElement('div');
  logo.className = 'welcome-logo';
  logo.setAttribute('aria-hidden', 'true');
  logo.innerHTML = `<svg width="30" height="30" viewBox="0 0 20 20" fill="none"><path d="M7 2h6M8 2v6L4 15a1 1 0 00.9 1.5h10.2A1 1 0 0016 15l-4-7V2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="13" r=".9" fill="#fff" opacity=".8"/><circle cx="11" cy="15" r=".6" fill="#fff" opacity=".6"/></svg>`;

  const title = document.createElement('h2');
  title.className = 'welcome-title';
  title.textContent = currentLang === 'id'
    ? 'Selamat datang di TestForge'
    : 'Welcome to TestForge';

  const sub = document.createElement('p');
  sub.className = 'welcome-sub';
  sub.textContent = currentLang === 'id'
    ? 'Tempel persyaratan perangkat lunak — user story, API spec, atau PRD — dan agen AI akan membuat test suite lengkap secara otomatis.'
    : 'Paste your software requirement — user story, API spec, or PRD — and the AI agent will generate a complete test suite.';

  const caps = document.createElement('div');
  caps.className = 'welcome-caps';
  CAP_ICONS.forEach((svg, i) => {
    const c = document.createElement('div');
    c.className = 'cap-card';
    c.innerHTML = `<span class="cap-icon">${svg}</span><span class="cap-label">${escHtml(CAP_LABELS[i])}</span>`;
    caps.appendChild(c);
  });

  const hint = document.createElement('div');
  hint.className = 'welcome-hint';
  const badge = document.createElement('span');
  badge.className = 'welcome-mode-badge';
  badge.id = 'welcomeMode';
  badge.textContent = isMockMode ? '● Mock' : '● Live';
  const hintText = currentLang === 'id'
    ? '— pilih contoh di sidebar atau ketik persyaratan sendiri'
    : '— pick an example from the sidebar or type your own';
  hint.append(currentLang === 'id' ? 'Mode aktif: ' : 'Active mode: ', badge, ' ' + hintText);

  card.append(logo, title, sub, caps, hint);
  chatHistory_el.appendChild(card);
}

function appendUserMessage(text) {
  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const msg = document.createElement('div');
  msg.className = 'msg user';
  msg.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">U</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-name">Anda</span>
        <span>${now}</span>
      </div>
      <div class="msg-bubble">${escHtml(text)}</div>
    </div>
  `;
  chatHistory_el.appendChild(msg);
  scrollToBottom();
}

function appendTypingIndicator() {
  const wrap = document.createElement('div');
  wrap.className = 'typing-wrap';
  wrap.id = 'typingWrap';
  wrap.innerHTML = `
    <div class="msg-avatar" aria-hidden="true" style="background:var(--grad-success)">T</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatHistory_el.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function replaceTypingWithResponse(typingWrap, parsed, rawText) {
  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const msg = document.createElement('div');
  msg.className = 'msg agent';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.setAttribute('aria-hidden', 'true');
  avatarEl.textContent = 'T';

  const bodyEl = document.createElement('div');
  bodyEl.className = 'msg-body';

  const metaEl = document.createElement('div');
  metaEl.className = 'msg-meta';
  metaEl.innerHTML = `
    <span class="msg-name">TestForge</span>
    <span>${now}</span>
    <span class="status-indicator ${isMockMode ? 'mock' : 'live'}" style="font-size:.65rem;padding:.1em .5em">
      <span class="status-dot"></span>${isMockMode ? 'Mock' : 'Live'}
    </span>
  `;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (parsed.testcases.length > 0) {
    bubble.appendChild(buildAgentOutput(parsed));
  } else {
    // Fallback: plain text (clarifying question, refusal, etc.)
    bubble.textContent = rawText;
  }

  bodyEl.appendChild(metaEl);
  bodyEl.appendChild(bubble);
  msg.appendChild(avatarEl);
  msg.appendChild(bodyEl);

  typingWrap.replaceWith(msg);
  scrollToBottom();
}

function scrollToBottom() {
  chatHistory_el.scrollTop = chatHistory_el.scrollHeight;
}

/* =============================================================================
   SECTION 9: SEND MESSAGE FLOW
   ============================================================================= */
async function sendMessage(text) {
  if (isWaiting || !text.trim()) return;
  isWaiting = true;

  const input  = document.getElementById('userInput');
  const btnSend = document.getElementById('btnSend');
  input.value  = '';
  btnSend.disabled = true;

  appendUserMessage(text);
  chatHistory.push({ role: 'user', text });

  const typingWrap = appendTypingIndicator();

  // Simulate realistic delay for mock mode
  const delay = isMockMode ? 900 + Math.random() * 600 : 0;

  try {
    let rawResponse;

    if (isMockMode) {
      await new Promise(r => setTimeout(r, delay));
      rawResponse = getMockResponse(text);
    } else {
      rawResponse = await callLLMApi(text);
    }

    const parsed = parseResponse(rawResponse);
    lastTestCases = parsed.testcases;

    replaceTypingWithResponse(typingWrap, parsed, rawResponse);
    chatHistory.push({ role: 'agent', text: rawResponse });

    // Show topbar action buttons if we have test cases
    if (lastTestCases.length > 0) {
      document.getElementById('btnExportCSV').hidden    = false;
      document.getElementById('btnCopyMarkdown').hidden = false;
      document.getElementById('btnShareLink').hidden    = false;
      document.getElementById('btnFilter').hidden       = false;
      buildFilterChips();
    }

  } catch (err) {
    typingWrap.remove();
    appendErrorMessage(`Terjadi kesalahan: ${err.message}`);
    console.error('[TestForge]', err);
  } finally {
    isWaiting = false;
    btnSend.disabled = false;
    input.focus();
  }
}

function appendErrorMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'msg agent';
  msg.innerHTML = `
    <div class="msg-avatar" aria-hidden="true" style="background:var(--danger)">!</div>
    <div class="msg-body">
      <div class="msg-meta"><span class="msg-name" style="color:var(--danger)">Error</span></div>
      <div class="msg-bubble" style="border-color:rgba(248,113,113,.3)">${escHtml(text)}</div>
    </div>
  `;
  chatHistory_el.appendChild(msg);
  scrollToBottom();
}

/* =============================================================================
   SECTION 10: EXPORT — CSV
   ============================================================================= */
function exportCSV() {
  if (!lastTestCases.length) { showToast('Belum ada test case untuk diekspor.'); return; }

  const headers = ['ID', 'Judul', 'Prasyarat', 'Langkah', 'Hasil yang Diharapkan', 'Prioritas', 'Tipe'];
  const rows    = lastTestCases.map(tc =>
    [tc.id, tc.title, tc.precond, tc.steps, tc.expected, tc.priority, tc.type]
      .map(val => `"${String(val).replace(/"/g, '""')}"`)
      .join(',')
  );

  const csv  = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `testforge_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✔ CSV berhasil diunduh!');
}

/* =============================================================================
   SECTION 11: EXPORT — COPY AS MARKDOWN
   ============================================================================= */
function copyMarkdown() {
  if (!lastTestCases.length) { showToast('Belum ada test case untuk disalin.'); return; }

  const header = '| ID | Judul | Prasyarat | Langkah | Hasil yang Diharapkan | Prioritas | Tipe |';
  const sep    = '|----|-------|-----------|---------|----------------------|-----------|------|';
  const rows   = lastTestCases.map(tc =>
    `| ${tc.id} | ${tc.title} | ${tc.precond} | ${tc.steps} | ${tc.expected} | ${tc.priority} | ${tc.type} |`
  );

  const md = [header, sep, ...rows].join('\n');

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(md).then(() => showToast('✔ Markdown disalin ke clipboard!'));
  } else {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = md;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('✔ Markdown disalin!');
  }
}

/* =============================================================================
   SECTION 12: TOAST NOTIFICATION
   ============================================================================= */
function showToast(message, duration = 2600) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 220);
  }, duration);
}

/* =============================================================================
   SECTION 13: SETTINGS PANEL — SYSTEM PROMPT EDITOR
   ============================================================================= */
function initSettings() {
  const editor    = document.getElementById('systemPromptEditor');
  const btnToggle = document.getElementById('btnToggleSettings');
  const panel     = document.getElementById('settingsPanel');
  const btnSave   = document.getElementById('btnSavePrompt');
  const btnReset  = document.getElementById('btnResetPrompt');

  editor.value = systemPrompt;

  btnToggle.addEventListener('click', () => {
    const isHidden = panel.hidden;
    panel.hidden   = !isHidden;
    btnToggle.setAttribute('aria-expanded', String(isHidden));
    if (isHidden) editor.focus();
  });

  btnSave.addEventListener('click', () => {
    systemPrompt = editor.value.trim() || DEFAULT_SYSTEM_PROMPT;
    panel.hidden = true;
    btnToggle.setAttribute('aria-expanded', 'false');
    showToast('✔ System prompt disimpan!');
  });

  btnReset.addEventListener('click', () => {
    editor.value = DEFAULT_SYSTEM_PROMPT;
    systemPrompt = DEFAULT_SYSTEM_PROMPT;
    showToast('↺ System prompt direset ke default.');
  });
}

/* =============================================================================
   SECTION 14: MODE TOGGLE
   ============================================================================= */
function initModeToggle() {
  const toggle      = document.getElementById('toggleMock');
  const label       = document.getElementById('modeLabel');
  const note        = document.getElementById('modeNote');
  const statusEl    = document.getElementById('apiStatus');
  const statusText  = document.getElementById('statusText');

  toggle.addEventListener('change', () => {
    isMockMode = toggle.checked;
    label.textContent = isMockMode ? 'Mock Mode' : 'Live Mode (API)';
    note.textContent  = isMockMode
      ? 'Demo tanpa API key'
      : 'Pastikan LLM_CONFIG sudah diisi API key';
    statusEl.className  = `status-indicator ${isMockMode ? 'mock' : 'live'}`;
    statusText.textContent = isMockMode ? 'Mock' : 'Live';

    // Update welcome card badge if still visible
    const welcomeMode = document.getElementById('welcomeMode');
    if (welcomeMode) {
      welcomeMode.textContent = isMockMode ? '● Mock' : '● Live';
      welcomeMode.style.background = isMockMode
        ? 'rgba(251,191,36,.12)' : 'rgba(74,222,128,.12)';
      welcomeMode.style.color  = isMockMode ? 'var(--warning)' : 'var(--success)';
      welcomeMode.style.border = isMockMode
        ? '1px solid rgba(251,191,36,.2)' : '1px solid rgba(74,222,128,.2)';
    }
  });
}

/* =============================================================================
   SECTION 15: SAMPLE BUTTONS
   ============================================================================= */
function initSampleButtons() {
  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key    = btn.dataset.sample;
      const sample = SAMPLES[key];
      if (!sample) return;

      const input = document.getElementById('userInput');
      input.value = sample;
      updateInputCounter();
      autoResizeTextarea(input);
      input.focus();

      // Auto-close sidebar on mobile
      if (window.innerWidth <= 720) closeSidebar();

      showToast('✔ Contoh dimuat — tekan Ctrl+Enter untuk generate');
    });
  });
}

/* =============================================================================
   SECTION 16: SIDEBAR TOGGLE (mobile)
   ============================================================================= */
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const btnOpen  = document.getElementById('btnOpenSidebar');
  const btnClose = document.getElementById('btnToggleSidebar');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  }
  function closeSidebarFull() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  btnOpen.addEventListener('click', openSidebar);
  btnClose.addEventListener('click', () => {
    if (window.innerWidth <= 720) closeSidebarFull();
  });
  overlay.addEventListener('click', closeSidebarFull);
}

/* =============================================================================
   SECTION 17: CLEAR CHAT
   ============================================================================= */
function initClearChat() {
  document.getElementById('btnClearChat').addEventListener('click', () => {
    chatHistory_el.innerHTML = '';
    chatHistory   = [];
    lastTestCases = [];
    activeFilters.clear();
    ['btnExportCSV','btnCopyMarkdown','btnShareLink','btnFilter'].forEach(id => {
      document.getElementById(id).hidden = true;
    });
    document.getElementById('filterBar').hidden = true;
    renderWelcome();
    if (window.innerWidth <= 720) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('active');
    }
    showToast(currentLang === 'id' ? 'Riwayat chat dihapus.' : 'Chat cleared.');
  });
}

/* =============================================================================
   SECTION 18: KEYBOARD SHORTCUTS
   ============================================================================= */
/* Auto-resize textarea to fit content */
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

/* Update character counter */
function updateInputCounter() {
  const val = document.getElementById('userInput').value;
  document.getElementById('inputCounter').textContent = val.length;
}

function initKeyboard() {
  const input   = document.getElementById('userInput');
  const btnSend = document.getElementById('btnSend');

  input.addEventListener('input', () => {
    autoResizeTextarea(input);
    updateInputCounter();
  });

  // Ctrl+Enter to send
  input.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(input.value.trim());
    }
  });

  btnSend.addEventListener('click', () => sendMessage(input.value.trim()));
}

/* =============================================================================
   SECTION 19: WIRE UP EXPORT BUTTONS
   ============================================================================= */
function initExport() {
  document.getElementById('btnExportCSV').addEventListener('click',    exportCSV);
  document.getElementById('btnCopyMarkdown').addEventListener('click', copyMarkdown);
}

/* =============================================================================
   SECTION 20: BOOT
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
  initFilter();
  initSession();
  initShareLink();
  initInlineEdit();
  initWelcomeModal();

  document.getElementById('userInput').focus();
})();

/* =============================================================================
   SECTION 20b: WELCOME POPUP MODAL
   ============================================================================= */
function initWelcomeModal() {
  const modal    = document.getElementById('welcomeModal');
  const btnStart = document.getElementById('wmStart');
  const btnClose = document.getElementById('wmClose');
  const chkDont  = document.getElementById('wmDontShow');

  if (!modal || !btnStart || !btnClose) return; // guard: elements must exist

  // Respect "don't show again" preference
  if (localStorage.getItem('tf_modal_hide') === '1') {
    modal.hidden = true;
    return;
  }

  // Show modal — stop any lingering CSS animation so it can be overridden later
  modal.hidden = false;
  modal.style.animation = 'none'; // will be re-applied on next paint by CSS class
  requestAnimationFrame(() => {
    modal.style.animation = '';   // restore so wmFadeIn / wmSlideUp play correctly
    btnStart.focus();
  });

  let closing = false; // prevent double-close

  function closeModal() {
    if (closing) return;
    closing = true;

    if (chkDont && chkDont.checked) {
      localStorage.setItem('tf_modal_hide', '1');
    }

    // Freeze animation, then fade out via inline style
    modal.style.animation  = 'none';
    modal.style.transition = 'opacity .2s ease';
    modal.style.opacity    = '0';

    setTimeout(() => {
      modal.hidden           = true;
      modal.style.opacity    = '';
      modal.style.transition = '';
      modal.style.animation  = '';
      const inp = document.getElementById('userInput');
      if (inp) inp.focus();
    }, 220);
  }

  btnStart.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);

  // Close on backdrop click (outside the panel)
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) {
      e.preventDefault();
      closeModal();
    }
  });
}

/* =============================================================================
   SECTION 21: CANVAS PARTICLE BACKGROUND
   ============================================================================= */
function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');

  // Particle definition
  const PARTICLE_COUNT = 70;
  const particles = [];

  // Colour based on CSS var (read once; re-read on theme change)
  function getParticleColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--canvas-particle').trim() || 'rgba(79,128,255,0.5)';
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      r:    1 + Math.random() * 2.2,
      vx:   (Math.random() - .5) * .4,
      vy:   (Math.random() - .5) * .4,
      a:    .2 + Math.random() * .5,
    };
  }

  resize();
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());
  window.addEventListener('resize', resize);

  const CONNECTION_DIST = 130;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = getParticleColor();

    // Update + draw dots
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = p.a;
      ctx.fill();
    }

    // Draw connections
    ctx.globalAlpha = 1;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * .18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth   = .8;
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  draw();
}

/* =============================================================================
   SECTION 22: THEME SWITCHER (dark → light → high-contrast → dark)
   ============================================================================= */
const THEMES = ['dark', 'light', 'hc'];
const THEME_LABELS = { dark: 'Dark', light: 'Light', hc: 'High Contrast' };

function applyTheme(theme) {
  currentTheme = theme;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  localStorage.setItem('tf_theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('tf_theme') || 'dark';
  applyTheme(saved);

  document.getElementById('btnTheme').addEventListener('click', () => {
    const idx  = THEMES.indexOf(currentTheme);
    const next = THEMES[(idx + 1) % THEMES.length];
    applyTheme(next);
    showToast(`Tema: ${THEME_LABELS[next]}`);
  });
}

/* =============================================================================
   SECTION 23: LANGUAGE TOGGLE (ID ↔ EN)
   (I18N const and t() helper are defined in Section 4b above boot())
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
  const saved = localStorage.getItem('tf_lang') || 'id';
  applyLang(saved);

  document.getElementById('btnLang').addEventListener('click', () => {
    const next = currentLang === 'id' ? 'en' : 'id';
    applyLang(next);
    showToast(t('toastLang'));
  });
}

/* =============================================================================
   SECTION 24: FILTER TEST CASES BY TYPE / PRIORITY
   ============================================================================= */
const TYPE_COLORS = {
  'Positive':       { bg: 'var(--tag-positive)', color: 'var(--success)',  border: 'rgba(34,197,94,.3)'   },
  'Negative':       { bg: 'var(--tag-negative)', color: 'var(--danger)',   border: 'rgba(248,113,113,.3)' },
  'Boundary':       { bg: 'var(--tag-boundary)', color: '#93c5fd',         border: 'rgba(96,165,250,.3)'  },
  'Edge':           { bg: 'var(--tag-edge)',      color: 'var(--warning)',  border: 'rgba(251,191,36,.3)'  },
  'Security':       { bg: 'var(--tag-security)',  color: 'var(--cyan)',     border: 'rgba(34,163,255,.3)'  },
  'Non-Functional': { bg: 'var(--tag-nonfunc)',   color: '#2dd4bf',         border: 'rgba(45,212,191,.3)'  },
};

function buildFilterChips() {
  const bar    = document.getElementById('filterBar');
  const chips  = document.getElementById('filterChips');
  chips.innerHTML = '';

  const types = [...new Set(lastTestCases.map(tc => tc.type))];
  if (!types.length) { bar.hidden = true; return; }

  bar.hidden = false;
  document.getElementById('btnFilter').hidden = false;

  types.forEach(type => {
    const c   = TYPE_COLORS[type] || { bg: 'var(--bg-glass)', color: 'var(--text-secondary)', border: 'var(--border)' };
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (activeFilters.size === 0 || activeFilters.has(type) ? ' active' : '');
    chip.dataset.type = type;
    chip.style.cssText = `background:${c.bg};color:${c.color};border-color:${c.border}`;
    chip.innerHTML = `${escHtml(type)}<svg class="filter-chip-x" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

    chip.addEventListener('click', () => {
      if (activeFilters.has(type)) {
        activeFilters.delete(type);
      } else {
        activeFilters.add(type);
      }
      applyFilters();
      buildFilterChips();
    });
    chips.appendChild(chip);
  });
}

function applyFilters() {
  const rows = document.querySelectorAll('.tc-table tbody tr[data-type]');
  rows.forEach(row => {
    const type = row.dataset.type;
    if (activeFilters.size === 0 || activeFilters.has(type)) {
      row.classList.remove('filtered-out');
    } else {
      row.classList.add('filtered-out');
    }
  });
}

function initFilter() {
  document.getElementById('btnFilterClear').addEventListener('click', () => {
    activeFilters.clear();
    document.getElementById('filterBar').hidden = true;
    document.getElementById('btnFilter').hidden = true;
    applyFilters();
  });
  document.getElementById('btnFilter').addEventListener('click', () => {
    document.getElementById('filterBar').hidden = false;
  });
}

/* =============================================================================
   SECTION 25: SESSION HISTORY (localStorage multi-session)
   ============================================================================= */
const SESSION_KEY = 'tf_sessions';

function getSessions() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]'); }
  catch { return []; }
}
function saveSessions(sessions) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

function renderSessionList() {
  const list = document.getElementById('sessionList');
  const sessions = getSessions();
  list.innerHTML = '';

  if (!sessions.length) {
    const em = document.createElement('span');
    em.className = 'session-empty';
    em.textContent = currentLang === 'id' ? 'Belum ada sesi tersimpan' : 'No saved sessions';
    list.appendChild(em);
    return;
  }

  sessions.forEach((sess, i) => {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `
      <span class="session-item-icon">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M4 4h4M4 6h3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
      </span>
      <div class="session-item-info">
        <div class="session-item-name">${escHtml(sess.name)}</div>
        <div class="session-item-date">${new Date(sess.ts).toLocaleDateString('id-ID', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <button class="session-item-del" aria-label="Hapus sesi" data-idx="${i}">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </button>`;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.session-item-del')) return;
      loadSession(sess);
    });
    item.querySelector('.session-item-del').addEventListener('click', (e) => {
      e.stopPropagation();
      const all = getSessions();
      all.splice(i, 1);
      saveSessions(all);
      renderSessionList();
      showToast(currentLang === 'id' ? 'Sesi dihapus.' : 'Session deleted.');
    });
    list.appendChild(item);
  });
}

function loadSession(sess) {
  chatHistory_el.innerHTML = '';
  chatHistory   = sess.chatHistory || [];
  lastTestCases = sess.testCases   || [];

  chatHistory.forEach(m => {
    if (m.role === 'user') {
      appendUserMessage(m.text);
    } else {
      const parsed = parseResponse(m.text);
      const dummy  = document.createElement('div');
      dummy.id = 'typingWrap';
      chatHistory_el.appendChild(dummy);
      replaceTypingWithResponse(dummy, parsed, m.text);
    }
  });

  if (lastTestCases.length) {
    document.getElementById('btnExportCSV').hidden    = false;
    document.getElementById('btnCopyMarkdown').hidden = false;
    document.getElementById('btnShareLink').hidden    = false;
    document.getElementById('btnFilter').hidden       = false;
    buildFilterChips();
  }
  showToast(`"${sess.name}" ${currentLang === 'id' ? 'dimuat.' : 'loaded.'}`);
}

function saveCurrentSession() {
  if (!chatHistory.length && !lastTestCases.length) {
    showToast(currentLang === 'id' ? 'Belum ada percakapan untuk disimpan.' : 'Nothing to save yet.');
    return;
  }
  const name = `Sesi ${new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})} (${lastTestCases.length} TC)`;
  const sessions = getSessions();
  sessions.unshift({ name, ts: Date.now(), chatHistory: [...chatHistory], testCases: [...lastTestCases] });
  if (sessions.length > 10) sessions.pop(); // keep latest 10
  saveSessions(sessions);
  renderSessionList();
  showToast(currentLang === 'id' ? `Sesi disimpan: "${name}"` : `Session saved: "${name}"`);
}

function initSession() {
  renderSessionList();
  document.getElementById('btnSaveSession').addEventListener('click', saveCurrentSession);
}

/* =============================================================================
   SECTION 26: SHARE LINK (URL-encoded last test cases)
   ============================================================================= */
function initShareLink() {
  document.getElementById('btnShareLink').addEventListener('click', () => {
    if (!lastTestCases.length) { showToast(currentLang === 'id' ? 'Belum ada hasil.' : 'No results yet.'); return; }
    const payload = btoa(encodeURIComponent(JSON.stringify(lastTestCases)));
    const url = `${location.origin}${location.pathname}#tc=${payload}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() =>
        showToast(currentLang === 'id' ? 'Link disalin ke clipboard!' : 'Link copied to clipboard!', 3000)
      );
    } else {
      prompt('Salin link ini:', url);
    }
  });

  // On load, check for shared #tc= hash
  const hash = location.hash;
  if (hash.startsWith('#tc=')) {
    try {
      const data = JSON.parse(decodeURIComponent(atob(hash.slice(4))));
      if (Array.isArray(data) && data.length) {
        lastTestCases = data;
        document.getElementById('btnExportCSV').hidden    = false;
        document.getElementById('btnCopyMarkdown').hidden = false;
        document.getElementById('btnShareLink').hidden    = false;
        document.getElementById('btnFilter').hidden       = false;
        // Render as agent message
        const dummy = document.createElement('div');
        dummy.id = 'typingWrap';
        chatHistory_el.appendChild(dummy);
        replaceTypingWithResponse(dummy, { analysis: 'Dimuat dari link bersama.', testcases: data, coverage: `Total: ${data.length}`, assumptions: [] }, '');
        buildFilterChips();
        showToast(currentLang === 'id' ? `${data.length} test case dimuat dari link.` : `${data.length} test cases loaded from link.`);
      }
    } catch (_) { /* invalid hash — ignore */ }
  }
}

/* =============================================================================
   SECTION 27: INLINE CELL EDIT
   ============================================================================= */
function initInlineEdit() {
  // Delegate click to table cells marked as editable
  document.addEventListener('click', e => {
    const td = e.target.closest('td.editable');
    if (!td || td.querySelector('.cell-editor')) return; // already editing

    const originalText = td.dataset.original ?? td.textContent.trim();
    td.dataset.original = originalText;

    const isLong = originalText.length > 40;
    const editor = document.createElement(isLong ? 'textarea' : 'input');
    editor.className = 'cell-editor';
    editor.value = originalText;
    if (isLong) { editor.rows = 2; }

    const actions = document.createElement('div');
    actions.className = 'cell-editor-actions';
    const saveBtn   = document.createElement('button');
    saveBtn.className = 'cell-save-btn';
    saveBtn.textContent = t('editSave');
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cell-cancel-btn';
    cancelBtn.textContent = t('editCancel');
    actions.append(saveBtn, cancelBtn);

    td.textContent = '';
    td.append(editor, actions);
    editor.focus();

    function commitEdit() {
      const newVal = editor.value.trim() || originalText;
      td.textContent = newVal;
      td.dataset.original = newVal;

      // Update lastTestCases data
      const tr  = td.closest('tr');
      const col = [...tr.cells].indexOf(td);
      const id  = tr.dataset.tcid;
      const tc  = lastTestCases.find(t => t.id === id);
      if (tc) {
        const colMap = [null,'title','precond','steps','expected','priority','type'];
        if (colMap[col]) tc[colMap[col]] = newVal;
      }

      // Mark row as edited
      if (!tr.querySelector('.tc-edited-badge')) {
        const idCell = tr.cells[0];
        const badge  = document.createElement('span');
        badge.className = 'tc-edited-badge';
        badge.textContent = t('editedBadge');
        idCell.appendChild(badge);
      }
    }

    saveBtn.addEventListener('click', commitEdit);
    cancelBtn.addEventListener('click', () => {
      td.textContent = originalText;
    });
    editor.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
      if (e.key === 'Escape') { td.textContent = originalText; }
    });
  });
}

/* =============================================================================
   SECTION 28: DONUT CHART (SVG, rendered per response)
   ============================================================================= */
function buildDonutChart(coverage) {
  // Parse coverage string "Total: 16 | Positive: 3 | Negative: 5 | ..."
  const counts = {};
  const colorMap = {
    'Positive':       '#4ade80',
    'Negative':       '#f87171',
    'Boundary':       '#93c5fd',
    'Edge':           '#fbbf24',
    'Security':       '#22d3ee',
    'Non-Functional': '#2dd4bf',
  };

  coverage.split('|').forEach(part => {
    const [k, v] = part.split(':').map(s => s.trim());
    if (k && v && k !== 'Total') {
      const n = parseInt(v, 10);
      if (!isNaN(n) && n > 0) counts[k] = n;
    }
  });

  const entries = Object.entries(counts);
  if (!entries.length) return null;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return null;

  // Build SVG donut
  const SIZE   = 80;
  const STROKE = 12;
  const R      = (SIZE - STROKE) / 2;
  const CIRC   = 2 * Math.PI * R;
  const CX = SIZE / 2, CY = SIZE / 2;

  let svgPaths = '';
  let offset   = 0;
  for (const [type, count] of entries) {
    const frac   = count / total;
    const dash   = frac * CIRC;
    const color  = colorMap[type] || '#888';
    svgPaths += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-dasharray="${dash.toFixed(2)} ${(CIRC - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${CX} ${CY})"/>`;
    offset += dash;
  }

  const wrap = document.createElement('div');
  wrap.className = 'donut-wrap';

  const svgEl = document.createElement('div');
  svgEl.className = 'donut-svg';
  svgEl.innerHTML = `<svg width="${SIZE}" height="${SIZE}" class="donut-svg" viewBox="0 0 ${SIZE} ${SIZE}">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="${STROKE}"/>
    ${svgPaths}
    <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="var(--text-primary)">${total}</text>
  </svg>`;

  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  for (const [type, count] of entries) {
    const item = document.createElement('div');
    item.className = 'donut-legend-item';
    item.innerHTML = `<span class="donut-legend-dot" style="background:${colorMap[type] || '#888'}"></span><span class="donut-legend-label">${escHtml(type)}</span><span class="donut-legend-val">${count}</span>`;
    legend.appendChild(item);
  }

  wrap.append(svgEl, legend);
  return wrap;
}
