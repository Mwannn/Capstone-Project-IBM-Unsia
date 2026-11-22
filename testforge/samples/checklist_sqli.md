# Expected-Quality Checklist: Sample 1 (SQL Injection)

- [x] **Expected Triage Status:** `Valid - Siap Diperbaiki`
- [x] **Expected Category:** 
  - OWASP Top 10 2021: `A03:2021 – Injection`
  - CWE: `CWE-89: Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')`
- [x] **Expected Severity Range:** 
  - CVSS v3.1 Base Score: `9.0 – 9.8` (Label: **CRITICAL**)
  - Vector: `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
  - Metric Rationale: AV:N (Network), AC:L (Low), PR:N (None required for login), UI:N (None), S:U (Unchanged), C:H, I:H, A:H
- [x] **Expected Business Impact:** Penyerang dapat membajak akun administrator, mengakses data 50.000 pengguna (NIK, kredensial), melanggar UU PDP No. 27/2022 Pasal 35 dengan risiko sanksi administratif dan reputasi rusak.
- [x] **Sanitization Enforcement:** Langkah reproduksi dibersihkan, menggunakan placeholder `<PAYLOAD>` atau `admin'-- -` tanpa senjata eksploit otomatis.
- [x] **Remediation Plan:**
  - Jangka Pendek: Filter karakter SQLi di WAF.
  - Jangka Panjang: Parameterized queries / Prepared Statements.
  - Kode Aman: Contoh Node.js mysql2 / pg dengan parameterized bindings `?` atau `$1`.
- [x] **Compliance Mapping:** UU PDP Pasal 35, ISO 27001 Annex A.8.28 (Secure coding), OWASP ASVS V5.3.
- [x] **False-Positive Confidence:** $\le 10$ (Sangat Valid karena bukti query dan login dashboard nyata).
- [x] **Priority Queue:** `FIX FIRST` (Perbaiki Segera).
