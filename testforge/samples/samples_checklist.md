# Test Set Quality Checklists — VulnTriage

Dokumen ini mendefinisikan kriteria pengujian mutu (*expected-quality checklist*) untuk 4 laporan fiktif dan 2 berkas ekspor scanner di direktori `samples/`.

---

## 1. Sample 1: SQL Injection Form Login (`01_sqli.md`)
- **Expected Category:** OWASP `A03:2021 – Injection`, `CWE-89`
- **Expected Severity Range:** CVSS v3.1 `9.0 – 9.8` (Critical)
- **Triage Status:** `Valid - Siap Diperbaiki`
- **Missing Information:** Tidak ada (laporan lengkap)
- **Compliance:** UU PDP Pasal 35, ISO 27001 Kontrol A.8.28, OWASP ASVS V5.3
- **Priority Queue:** `Fix First`

---

## 2. Sample 2: Stored XSS Komentar (`02_stored_xss.md`)
- **Expected Category:** OWASP `A03:2021 – Injection`, `CWE-79`
- **Expected Severity Range:** CVSS v3.1 `7.0 – 8.0` (High)
- **Triage Status:** `Valid - Siap Diperbaiki`
- **Missing Information:** Tidak ada (laporan lengkap)
- **Compliance:** UU PDP Pasal 35, ISO 27001 Kontrol A.8.28, OWASP ASVS V5.3 & V3.4
- **Priority Queue:** `Fix First` / `Fix Soon`

---

## 3. Sample 3: IDOR Profil Nasabah Perbankan (`03_idor.md`)
- **Expected Category:** OWASP `A01:2021 – Broken Access Control`, `CWE-639`
- **Expected Severity Range:** CVSS v3.1 `7.5 – 8.5` (High)
- **Triage Status:** `Valid - Siap Diperbaiki`
- **Missing Information:** Tidak ada (laporan lengkap)
- **Compliance:** UU PDP Pasal 35 & 65, ISO 27001 Kontrol A.8.2 & A.8.3, OWASP ASVS V4.1
- **Priority Queue:** `Fix First`

---

## 4. Sample 4: Laporan Satu Baris Tidak Lengkap (`04_incomplete.md`)
*Input: "Ada celah keamanan di website saya. Password bisa dibypass."*
- **Expected Triage Status:** `Butuh Informasi Lebih` (Needs More Info)
- **Rule Enforcement:** 4 dari 5 elemen hilang $\rightarrow$ **Dilarang memberi skor numerik CVSS**.
- **Expected Clarifying Questions:** Tepat 3 pertanyaan klarifikasi (URL target, langkah reproduksi, bukti respons).
- **False-Positive Confidence:** $60 – 85$ (Tinggi / Butuh Validasi Manual).
- **Priority Queue:** `Backlog` (Menunggu Data).

---

## 5. Scanner Exports: Dedup & Scan-Diff Verification
- **Scanner Export v1 (`scanner_export_v1.json`)**: 6 temuan ZAP. 3 temuan header X-Frame-Options digabung menjadi 1 kelompok akar masalah (*Missing HTTP Defense-in-Depth Headers*).
- **Scanner Export v2 (`scanner_export_v2.csv`)**: 9 temuan Burp Suite. 4 temuan CSP digabung menjadi 1 kelompok akar masalah.
