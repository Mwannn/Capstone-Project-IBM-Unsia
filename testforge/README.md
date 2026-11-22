# VulnTriage — Vulnerability Report Triage Agent
### IBM Bob Capstone Project — IT Track (AI Agent)

> **Posisi Produk (*Positioning*):**  
> **VulnTriage** adalah lapisan intelijen AI defensif untuk triage, deduplikasi, dan pelaporan keamanan siber. Agen ini mengubah temuan mentah dari **SEMUA jenis scanner** (DAST, SAST) maupun laporan bug hunter menjadi rencana aksi terprioritas, siap kepatuhan regulasi Indonesia (UU PDP & SPBE), dan ramah pengembang.  
> **VulnTriage TIDAK melakukan scanning terhadap target dan TIDAK mengeksploitasi sistem apa pun.**

---

## 1. Latar Belakang & Masalah

Tim keamanan informasi (*security operations*), program bug bounty, serta tim IT pemerintah dan UMKM di Indonesia sering kali dibanjiri laporan kerentanan yang:
1. **Tidak Lengkap & Tidak Konsisten**: Pelapor sering hanya mengirim pesan satu baris tanpa endpoint, langkah reproduksi, atau bukti.
2. **Kelebihan Beban Informasi (*Alert Fatigue*)**: Scanner otomatis menghasilkan ratusan temuan duplikat atau *false positive* (misal hanya ketiadaan HTTP security header).
3. **Prioritisasi Lambat**: Temuan kritis (SQLi pada data NIK) sering terkubur di bawah tumpukan temuan berisiko rendah.
4. **Kesenjangan Bahasa & Regulasi**: Laporan teknis berbahasa Inggris membingungkan pimpinan bisnis lokal yang membutuhkan justifikasi kepatuhan hukum (seperti UU Perlindungan Data Pribadi No. 27/2022).

**VulnTriage** memecahkan masalah ini dengan menyediakan agen triage berbasis prompt berjenjang (*Layered Prompt Architecture*) yang sepenuhnya defensif, objektif, dan otomatis.

---

## 2. Arsitektur Solusi & Diagram Alir

```
[ Raw Vulnerability Input ]
  ├── Laporan Teks Bug Hunter (Bounty Report)
  ├── Ekspor Scanner Generic (JSON / CSV / DAST / SAST)
  └── Tiket Keamanan Mentah
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                 VULNTRIAGE AI AGENT CORE                    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Layer 1: Role, Context & Defensive-Only Guardrails      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                               │                             │
│                               ▼                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Layer 2: 10-Step Sequential Reasoning Engine            │ │
│ │  (A) Completeness Check (Missing >= 2? Stop & Clarify)  │ │
│ │  (B) OWASP 2021 & CWE Classification                    │ │
│ │  (C) Conservative CVSS v3.1 Scoring with Metric Rationale│ │
│ │  (D) Plain-Language Business Impact (Non-Technical)     │ │
│ │  (E) Sanitized Steps to Reproduce (<PAYLOAD> Placeholders)│
│ │  (F) Structured Remediation (Short/Long + Secure Code)  │ │
│ │  (G) False-Positive Scorer & Noise Detector (0-100)     │ │
│ │  (H) Deduplication & Root-Cause Clustering              │ │
│ │  (I) 4-Factor Risk Prioritization (Fix First/Soon/Backlog)│
│ │  (J) Compliance Mapping (UU PDP, ISO 27001, OWASP ASVS) │ │
│ │  (K) Scan-Diff Engine (New vs Fixed vs Unchanged)       │ │
│ │  (L) Self-Review & Explicit [ASUMSI] Audit Gate         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                               │                             │
│                               ▼                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Layer 3: Output Enveloping, Formatting & Honesty Rules  │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     OPERATIONAL DELIVERABLES  │   │     EXECUTIVE & COMPLIANCE    │
│ ├── Triage Status Card        │   │ ├── Ringkasan Eksekutif (Id)  │
│ ├── CVSS Vector & Rationale   │   │ ├── Pemetaan UU PDP & ISO     │
│ ├── Secure Code Pattern       │   │ ├── Dashboard Matriks Risiko  │
│ ├── 1-Click Jira/GitHub Export│   │ ├── Scan-Diff Release Report  │
│ └── Missing Info Clarification│   │ └── Printable HTML / Markdown │
└───────────────────────────────┘   └───────────────────────────────┘
```

---

## 3. Fitur Unggulan (Competitive Features)

1. **Prompt Berjenjang 3-Layer (*Layered Prompt Architecture*)**:
   - Memastikan pemisahan ketat antara identitas peran, urutan penalaran kognitif, dan pembatasan format luaran.
2. **Pemeriksaan Kelengkapan Cerdas (*Completeness Gatekeeper*)**:
   - Jika laporan kehilangan $\ge 2$ elemen esensial, agen menahan penilaian skor dan mengajukan maksimal 3 pertanyaan klarifikasi. Mencegah halusinasi data.
3. **Defensif Murni & Sanitasi Eksploit**:
   - Tidak pernah menampilkan payload aktif atau instruksi penyerangan. Semua langkah disanitasi menggunakan placeholder konseptual (`<PAYLOAD>`).
4. **Penyaring False-Positive & Noise Detector (0–100)**:
   - Memberikan skor keyakinan false-positive dengan alasan jelas. Isu teoretis seperti ketiadaan header diberi label "Butuh Validasi Manual" dan tidak memicu kepanikan.
5. **Deduplikasi & Pengelompokan Akar Masalah (*Root Cause Grouping*)**:
   - Menggabungkan temuan-temuan serupa (misal 10 titik XSS yang berasal dari satu komponen view yang sama) menjadi 1 kelompok perbaikan terpusat.
6. **Antrean Prioritas Risiko 4-Faktor (*Risk Prioritization Queue*)**:
   - Menghitung prioritas perbaikan berdasarkan: Skor CVSS + Eksposur Lingkungan (Internet vs Internal) + Sensitivitas Data + Ada/Tidaknya Bukti Nyata. Menghasilkan kategori tindakan: **Fix First**, **Fix Soon**, atau **Backlog**.
7. **Pemetaan Regulasi Indonesia (*Compliance Mapping*)**:
   - Memetakan setiap temuan ke **UU Perlindungan Data Pribadi (UU PDP No. 27/2022)**, **ISO 27001:2022 Annex A**, dan **OWASP ASVS v4.0** dengan catatan kehati-hatian (*audit recommendation*).
8. **Pembanding Pemindaian (*Scan-Diff View*)**:
   - Membandingkan hasil pemindaian siklus sebelumnya dengan siklus terkini untuk mendeteksi temuan **New**, **Fixed**, dan **Unchanged**.
9. **Generator Laporan Dwi-Bahasa (*Executive & Technical Report*)**:
   - Menghasilkan ringkasan dampak bisnis untuk manajemen non-teknis dalam Bahasa Indonesia dan rincian teknis untuk pengembang, dapat diunduh dalam format Markdown atau dicetak langsung ke PDF/HTML.
10. **Eksportir Tiket Pengembang 1-Klik**:
    - Format siap salin ke issue tracker **Jira** atau **GitHub Issues** lengkap dengan Acceptance Criteria.
11. **Dashboard Interaktif**:
    - Ringkasan statistik keparahan, visualisasi chart canvas, dan pelacak antrean prioritas.
12. **Mode Uji Tanpa API Key (*Mock Mode*) & Live System Prompt Editor**:
    - Dilengkapi respons mock instan untuk demonstrasi lancar tanpa ketergantungan internet/kunci API, serta editor prompt sistem untuk pengujian variasi prompt secara langsung.

---

## 4. Cara Menjalankan Aplikasi

Aplikasi dibangun menggunakan **Vanilla HTML5, CSS3, dan JavaScript murni** tanpa dependensi eksternal, tanpa framework berat, dan tanpa CDN pihak ketiga.

### Langkah Cepat:
1. Buka folder `testforge/` di file explorer Anda.
2. Klik dua kali berkas `index.html` untuk membukanya di browser modern apa pun (Chrome, Edge, Firefox, Safari).

### Atau Jalankan Menggunakan HTTP Server Lokal:
```bash
cd c:\project\ibm-project\testforge
# Menggunakan Python:
python -m http.server 8080

# Atau menggunakan npx serve:
npx serve .
```
Akses di browser: `http://localhost:8080`

---

## 5. Struktur Berkas Proyek

```
testforge/
├── index.html              # Antarmuka web chat playground, dashboard, scan diff, dan ekspor
├── style.css               # Desain UI modern dark theme (WCAG AA compliant, responsive)
├── app.js                  # Engine logika frontend, parser scanner, risk algorithm, mock responses, API client
├── system_prompt.md        # Prompt sistem 3-layer lengkap (v3.0)
├── PROMPT_ITERATIONS.md    # Log eksperimen dan perbandingan kualitas v1 -> v2 -> v3
├── README.md               # Dokumentasi arsitektur, cara pakai, dan batasan solusi
└── samples/
    ├── 01_sqli.md             # Laporan valid: SQL Injection form login
    ├── 02_stored_xss.md       # Laporan valid: Stored XSS pada kolom komentar
    ├── 03_idor.md             # Laporan valid: IDOR pada data profil nasabah perbankan
    ├── 04_incomplete.md       # Laporan 1 baris tidak lengkap (uji coba klarifikasi)
    ├── checklist_sqli.md      # Expected quality checklist: SQLi
    ├── checklist_xss.md       # Expected quality checklist: Stored XSS
    ├── checklist_idor.md      # Expected quality checklist: IDOR
    ├── checklist_incomplete.md # Expected quality checklist: Incomplete
    ├── scanner_export_v1.json # Mock ekspor scanner OWASP ZAP (JSON)
    ├── scanner_export_v2.csv  # Mock ekspor scanner Burp Suite (CSV)
    └── samples_checklist.md   # Rekap checklist evaluasi mutu untuk semua sampel
```

---

## 6. Batasan Sistem & Ruang Lingkup (*Scope & Limitations*)

1. **Bukan Alat Pemindai Aktif**: VulnTriage tidak mengirim paket jaringan, tidak melakukan *port scanning*, dan tidak menjalankan *fuzzing* terhadap target. Analisis bergantung sepenuhnya pada keakuratan data yang dimasukkan.
2. **Ketergantungan terhadap Bukti Masukan**: Jika pelapor memberikan informasi palsu atau fiktif, agen menandai status sebagai "Perlu Validasi Manual" atau "Asumsi", namun tidak dapat memverifikasi keberadaan server secara fisik di dunia nyata.
3. **Kepatuhan Bersifat Rekomendasi (*Indicative Compliance*)**: Pemetaan pasal UU PDP dan kontrol ISO 27001 merupakan panduan percepatan kerja bagi tim kepatuhan internal, bukan fatwa hukum resmi atau sertifikasi auditor.
4. **Perlindungan Privasi**: Pengguna diwajibkan menyensor (*redact*) token rahasia produksi, kunci API, atau NIK asli sebelum memasukkan laporan ke dalam sistem publik.
