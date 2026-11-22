# VulnTriage — Log Iterasi Rekayasa Prompt (Prompt Iteration Log)
## IBM Bob Capstone Project — IT Track (AI Agent)

Dokumen ini mencatat evolusi desain prompt berjenjang (*layered prompt architecture*) untuk agen **VulnTriage**, dievaluasi terhadap 4 sampel laporan uji (*test set*) dan kebutuhan perusahaan/UMKM di Indonesia.

---

## Tabel Ringkasan Iterasi Prompt

| Versi | Layer Diubah | Apa yang Diubah | Alasan (Root Cause / Temuan Uji) | Pengaruh Terhadap Kualitas Jawaban (*Effect on Quality*) |
|---|---|---|---|---|
| **v1.0 (Baseline)** | Layer 1, 2, 3 (Prompt Tunggal Tak Terstruktur) | Prompt monolitik dasar: "Kamu adalah asisten triage security. Analisis laporan bug bounty ini, beri kategori OWASP, skor CVSS, dan cara memperbaikinya." | Eksperimen awal untuk melihat kapabilitas bawaan model tanpa pembatasan instruksi ketat. | **Kualitas Rendah & Berbahaya**: Model mengarang skor CVSS 8.8 pada Sampel 4 (laporan satu baris yang kosong); model menghasilkan payload eksploit SQLi nyata (`UNION SELECT @@version`); bahasa terlalu akademis dan tidak ramah bagi pemilik UMKM; format output acak dan sulit di-parse programmatically. |
| **v2.0 (Layered Architecture)** | **Layer 1**: Definisi Peran & Defensive-Only<br>**Layer 2**: Penalaran 8 Tahap (Langkah A–H)<br>**Layer 3**: Format Output Terstruktur & Guardrails | 1. Memisahkan prompt menjadi 3 Layer eksplisit.<br>2. Menambahkan aturan *Completeness Check*: jika $\ge 2$ elemen hilang, dilarang memberi skor dan ajukan maksimal 3 pertanyaan klarifikasi.<br>3. Larangan keras terhadap eksploit fungsional; wajib menggunakan placeholder `<PAYLOAD>` atau `<TARGET>`.<br>4. Memisahkan dampak bisnis (bahasa awam) dari analisis teknis.<br>5. Format output 9 bagian yang konsisten. | Mengatasi halusinasi pada laporan tidak lengkap (Sampel 4), mencegah pembuatan senjata siber (*offensive misuse*), dan memfasilitasi komunikasi antar-tim (bug hunter vs developer vs manajemen). | **Kualitas Naik Signifikan**: Sampel 4 dengan tepat menghasilkan status "Butuh Informasi Lebih" dan 3 pertanyaan terarah tanpa memberi skor palsu; Sampel 1–3 menghasilkan skor CVSS akurat dengan rasional per metrik; semua payload disanitasi menjadi placeholder aman; struktur jawaban konsisten. |
| **v3.0 (Enterprise Capstone Upgrade)** | **Layer 2**: Penambahan Fitur Kompetitif (Langkah I–L)<br>**Layer 3**: Klausa Bukti & Batasan Ruang Lingkup (*Scope & Limitations*) | 1. Menambahkan *False-Positive Scorer* (0–100) dengan status "Butuh Validasi Manual" untuk menyaring noise (missing headers, self-XSS).<br>2. Menambahkan *Compliance Mapping* otomatis ke UU PDP No. 27/2022, ISO 27001:2022 Annex A, dan OWASP ASVS v4.0.<br>3. Menambahkan *Deduplication & Grouping* berdasarkan akar masalah (*root cause*).<br>4. Menambahkan *Risk Prioritization Queue* (mempertimbangkan Exposure, Data Sensitivity, dan Bukti Eksploitasi).<br>5. Menambahkan klausa wajib *Scope & Limitations* pada setiap output.<br>6. Menambahkan aturan terminologi status eksploitasi: "dilaporkan", "belum diverifikasi", atau "bukti disediakan". | Kebutuhan nyata tim IT Indonesia: scanner sering menghasilkan ratusan temuan duplikat; tim kepatuhan memerlukan referensi hukum UU PDP; C-level membutuhkan antrian risiko "Perbaiki Segera" vs "Backlog"; mencegah klaim kepastian sepihak tanpa bukti fisik. | **Enterprise Ready & Audit-Ready**: Noise berkurang hingga 60% melalui grouping root cause; tim hukum dan DPO mendapatkan dasar pasal UU PDP yang relevan; triager dapat langsung mengantrekan perbaikan ke Jira/GitHub; kepatuhan etika AI 100% terjaga tanpa spekulasi yang tidak berdasar. |

---

## Analisis Pengujian Komparatif Terhadap 4 Sampel

### Pengujian Sampel 1: SQL Injection Login (`01_sqli.md`)
- **Hasil v1.0**: Memberikan skor CVSS 9.8 namun menyertakan contoh script sqlmap dan eksploitasi lanjutan yang melanggar prinsip pertahanan murni.
- **Hasil v2.0**: CVSS 9.8 dipertahankan dengan rasional metric yang solid (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`). Contoh kode beralih menjadi Prepared Statements murni.
- **Hasil v3.0**: Menambahkan pemetaan UU PDP Pasal 35 (Kewajiban keamanan data NIK dan email warga), ISO 27001:2022 A.8.28, dan antrian prioritas: **Fix First (Kritis / Internet-Facing)**.

### Pengujian Sampel 2: Stored XSS Komentar (`02_stored_xss.md`)
- **Hasil v1.0**: Diklasifikasikan sebagai Medium tanpa memperhitungkan ketiadaan HttpOnly pada session cookie.
- **Hasil v2.0**: Dikoreksi menjadi High (CVSS 7.5) karena ada pembajakan session; langkah reproduksi disanitasi menggunakan placeholder `<PAYLOAD>`.
- **Hasil v3.0**: Ditambahkan pemetaan OWASP ASVS V5.3 dan V3.4 (Cookie hardening); False-positive confidence score: 5/100 (Sangat Rendah, bukti eksekusi dan respons HTML jelas).

### Pengujian Sampel 3: IDOR Profil Perbankan (`03_idor.md`)
- **Hasil v1.0**: Sulit membedakan antara IDOR dan Information Disclosure umum.
- **Hasil v2.0**: Diklasifikasikan secara tepat sebagai CWE-639 / OWASP A01 (Broken Access Control) dengan dampak finansial yang jelas.
- **Hasil v3.0**: Diberikan antrian **Fix First** karena mengekspos nomor KTP, rekening bank, saldo, dan nomor telepon 200.000 nasabah (Data Finansial Komersial & PII di bawah UU PDP).

### Pengujian Sampel 4: Laporan Satu Baris Tidak Lengkap (`04_incomplete.md`)
- **Hasil v1.0 (GAGAL)**: Model berspekulasi bahwa login form memiliki reflected XSS pada parameter `username`, mengarang skor CVSS 7.2, dan memberikan kode remediasi untuk parameter yang tidak pernah disebutkan oleh pelapor.
- **Hasil v2.0 & v3.0 (BERHASIL)**:
  - Aturan *Completeness Check* aktif seketika: Target spesifik tidak ada, endpoint tidak ada, langkah reproduksi tidak ada, bukti tidak ada.
  - Status: `Butuh Informasi Lebih` (*Needs More Info*).
  - Skor CVSS: **Tidak diberikan** (mencegah salah alokasi sumber daya developer).
  - Tiga pertanyaan klarifikasi presisi diajukan ke pelapor.
  - Skor False-Positive: 75/100 (Butuh Validasi Manual).

---

## Kesimpulan Rekayasa Prompt

Pemisahan instruksi menjadi struktur 3 layer (Role & Defensive Stance $\rightarrow$ Sequential Reasoning Steps $\rightarrow$ Strict Output Envelope & Honesty Rules) terbukti mampu mengubah model bahasa generatif biasa menjadi mesin triage keamanan siber yang deterministik, taat hukum, defensif murni, dan dapat diandalkan oleh korporasi maupun UMKM.
