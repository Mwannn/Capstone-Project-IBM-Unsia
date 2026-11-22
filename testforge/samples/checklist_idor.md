# Expected-Quality Checklist: Sample 3 (IDOR)

- [x] **Expected Triage Status:** `Valid - Siap Diperbaiki`
- [x] **Expected Category:** 
  - OWASP Top 10 2021: `A01:2021 – Broken Access Control`
  - CWE: `CWE-639: Authorization Bypass Through User-Controlled Key`
- [x] **Expected Severity Range:** 
  - CVSS v3.1 Base Score: `7.5 – 8.5` (Label: **HIGH**)
  - Vector: `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`
  - Metric Rationale: PR:L (Butuh login akun biasa), UI:N (Tanpa klik korban), C:H (Paparan massal 200.000 data nasabah perbankan).
- [x] **Expected Business Impact:** Kebocoran masif data nasabah perbankan (nomor KTP, rekening bank, saldo, nomor telepon). Melanggar UU PDP No. 27/2022 Pasal 35 dan 65 dengan potensi denda pidana dan sanksi Bank Indonesia / OJK.
- [x] **Remediation Plan:**
  - Jangka Pendek: Verifikasi otorisasi di middleware: `token.sub === req.params.user_id`.
  - Jangka Panjang: Terapkan RBAC/ABAC terpusat dan ganti sekuensial integer dengan UUID v4.
  - Kode Aman: Middleware `requireOwnership` di Express/Node.js.
- [x] **Compliance Mapping:** UU PDP Pasal 35 & 65, ISO 27001 Annex A.8.2 & A.8.3, OWASP ASVS V4.1.
- [x] **Priority Queue:** `FIX FIRST` (Perbaiki Segera).
