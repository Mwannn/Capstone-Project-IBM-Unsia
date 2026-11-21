# PROMPT_ITERATIONS.md — TestForge Prompt Engineering Log

> Dokumen ini mencatat evolusi system prompt TestForge dari baseline hingga versi final.
> Setiap iterasi diuji terhadap 3 sample input: Form Login, API Checkout, File Upload.

---

## Metodologi Pengujian

Setiap versi prompt dievaluasi berdasarkan:
1. **Kelengkapan tipe** — apakah semua 6 tipe test case muncul?
2. **Format output** — apakah format ---SECTION--- dipatuhi?
3. **Relevansi** — apakah test case mencerminkan aturan bisnis yang disebutkan?
4. **Hallucination** — apakah ada persyaratan yang dikarang?
5. **Duplikasi** — apakah ada test case yang identik secara logika?
6. **Security coverage** — apakah SQL injection, XSS, IDOR minimal disebutkan?

Skala: ✅ Baik · ⚠ Cukup · ❌ Buruk

---

## v1 — Baseline

**Tanggal:** Iterasi awal
**Deskripsi perubahan:** Prompt minimal, instruksi generik tanpa format output eksplisit.

**Prompt (ringkasan):**
```
Kamu adalah asisten QA. Buat test case dari persyaratan berikut.
Pastikan mencakup skenario positif dan negatif.
```

**Hasil pengujian:**

| Kriteria | Login | Checkout | Upload | Rata-rata |
|----------|-------|----------|--------|-----------|
| Kelengkapan tipe | ⚠ | ⚠ | ⚠ | ⚠ |
| Format output | ❌ | ❌ | ❌ | ❌ |
| Relevansi | ⚠ | ⚠ | ✅ | ⚠ |
| Hallucination | ⚠ | ⚠ | ⚠ | ⚠ |
| Duplikasi | ⚠ | ❌ | ⚠ | ⚠ |
| Security coverage | ❌ | ❌ | ❌ | ❌ |

**Masalah yang ditemukan:**
- Output berupa paragraf naratif, tidak terstruktur → sulit diparsing
- Hanya menghasilkan Positive dan Negative; Boundary, Edge, Security tidak muncul
- Untuk Login: tidak ada test case untuk penguncian akun (rule bisnis paling kritis)
- Untuk Checkout: tidak ada test case race condition stok
- Duplikasi: "Login dengan password salah" muncul 2 kali dengan judul berbeda
- Tidak ada bagian Asumsi → model mengarang detail teknis tanpa label

**Kesimpulan:** Prompt terlalu terbuka. Model tidak tahu output yang diharapkan.

---

## v2 — Format Eksplisit + Tipe Wajib

**Tanggal:** Iterasi kedua
**Alasan perubahan:** Tambah format output pipe-separated, daftar tipe wajib, instruksi anti-hallucination.

**Perubahan utama:**
1. Tambah format output eksplisit: `TC-NNN|Judul|Prasyarat|Langkah|Hasil|Prioritas|Tipe`
2. Daftar tipe test case wajib: Positive, Negative, Boundary, Edge, Security, Non-Functional
3. Instruksi "tandai asumsi dengan [ASUMSI]"
4. Instruksi "jangan duplikasi test case"
5. Tambah bagian ---COVERAGE--- dan ---ASSUMPTIONS---

**Prompt tambahan (di atas baseline v1):**
```
FORMAT OUTPUT WAJIB:
---TESTCASES---
TC-001|[Judul]|[Prasyarat]|[Langkah]|[Hasil]|[High/Medium/Low]|[Positive/Negative/Boundary/Edge/Security/Non-Functional]

Harus mencakup semua tipe. Tandai asumsi dengan [ASUMSI].
---COVERAGE---
Total: N | Positive: n | ...
---ASSUMPTIONS---
- ...
```

**Hasil pengujian:**

| Kriteria | Login | Checkout | Upload | Rata-rata |
|----------|-------|----------|--------|-----------|
| Kelengkapan tipe | ✅ | ✅ | ⚠ | ✅ |
| Format output | ✅ | ✅ | ✅ | ✅ |
| Relevansi | ✅ | ✅ | ✅ | ✅ |
| Hallucination | ✅ | ⚠ | ✅ | ✅ |
| Duplikasi | ✅ | ✅ | ✅ | ✅ |
| Security coverage | ⚠ | ⚠ | ⚠ | ⚠ |

**Masalah yang masih ditemukan:**
- Security test case terlalu generik ("coba SQL injection") — tanpa payload spesifik atau expected result detail
- Untuk Checkout: model mengarang detail database (tipe kolom stok) tanpa label [ASUMSI]
- Untuk Upload: tipe Non-Functional (performa upload file besar) tidak muncul sama sekali
- Langkah test case kadang 1 baris, tidak terstruktur "1. ... 2. ..."
- Tidak ada instruksi self-review → beberapa boundary condition terlewat

**Kesimpulan:** Format berhasil diperbaiki signifikan. Security dan boundary masih lemah.

---

## v3 — Self-Review + Security Detail + Reasoning Steps

**Tanggal:** Iterasi final (versi aktif)
**Alasan perubahan:** Tambah chain-of-thought reasoning (Langkah A/B/C/D), perkuat security, paksa self-review.

**Perubahan utama dari v2:**
1. **Langkah A** — instruksi eksplisit untuk ekstrak fitur + aktor + aturan bisnis + alur
2. **Langkah B** — klarifikasi maks 3 pertanyaan jika ambigu; jika jelas, langsung lanjut
3. **Langkah C** — deskripsi per tipe lebih detail (terutama Security: "SQL injection, XSS, IDOR, authz")
4. **Langkah D** — self-review checklist sebelum menghasilkan output final
5. **Guardrail diperkuat** — 5 aturan eksplisit termasuk "jika input bukan persyaratan perangkat lunak, tolak dengan sopan"
6. **Instruksi langkah** — "tulis langkah sebagai daftar bernomor: 1. ... 2. ..."
7. **Priority definition** — High/Medium/Low didefinisikan eksplisit

**Hasil pengujian:**

| Kriteria | Login | Checkout | Upload | Rata-rata |
|----------|-------|----------|--------|-----------|
| Kelengkapan tipe | ✅ | ✅ | ✅ | ✅ |
| Format output | ✅ | ✅ | ✅ | ✅ |
| Relevansi | ✅ | ✅ | ✅ | ✅ |
| Hallucination | ✅ | ✅ | ✅ | ✅ |
| Duplikasi | ✅ | ✅ | ✅ | ✅ |
| Security coverage | ✅ | ✅ | ✅ | ✅ |

**Perbaikan yang terukur:**
- Login: boundary password (7 / 8 / 9 karakter) kini selalu muncul
- Checkout: race condition stok kini selalu muncul sebagai Edge case
- Upload: MIME type bypass (rename .php → .jpg) dan IDOR kini muncul konsisten
- Security: payload spesifik (SQL injection, XSS, path traversal) dengan expected result jelas
- Self-review: jumlah duplikasi turun dari rata-rata 1.3 ke 0 per run
- Asumsi kini selalu dilabeli [ASUMSI] dengan konsisten

**Sisa kelemahan yang diketahui:**
- Non-Functional test case masih jarang untuk input yang tidak menyebutkan SLA/performa
- Pada input sangat pendek (< 50 kata), model cenderung langsung generate tanpa klarifikasi
- Langkah test case panjang kadang terpotong jika token limit model rendah

---

## Ringkasan Komparatif

| Versi | Total TC avg | Tipe tercakup | Security TC avg | Hallucination | Format ✅ |
|-------|-------------|---------------|-----------------|---------------|-----------|
| v1 | 6–8 | 2/6 | 0 | Sering | ❌ |
| v2 | 10–13 | 5/6 | 1–2 | Jarang | ✅ |
| v3 | 15–17 | 6/6 | 3–4 | Tidak ada | ✅ |

---

## Proposal Iterasi Selanjutnya (v4)

Jika TestForge dikembangkan lebih lanjut:

1. **Few-shot examples** — sertakan 1–2 contoh pasangan input/output lengkap langsung di system prompt untuk model dengan instruksi-following lemah
2. **Dynamic clarification** — instruksikan model untuk mendeteksi ambiguitas secara lebih granular (field tanpa validasi, actor tanpa permission boundary)
3. **Test data generation** — tambah kolom "Data Uji" pada output tabel dengan nilai konkret
4. **Language detection yang lebih robust** — gunakan library deteksi bahasa ringan atau heuristik karakter untuk mixed-language input
5. **Non-Functional template** — sertakan template SLA default (response time < 2 detik, availability 99.9%) jika tidak disebutkan dalam persyaratan
