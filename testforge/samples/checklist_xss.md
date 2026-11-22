# Expected-Quality Checklist: Sample 2 (Stored XSS)

- [x] **Expected Triage Status:** `Valid - Siap Diperbaiki`
- [x] **Expected Category:** 
  - OWASP Top 10 2021: `A03:2021 – Injection`
  - CWE: `CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')`
- [x] **Expected Severity Range:** 
  - CVSS v3.1 Base Score: `7.0 – 8.0` (Label: **HIGH**)
  - Vector: `CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:L/A:N`
  - Metric Rationale: PR:L (Perlu login user), UI:R (Korban harus buka halaman komentar), S:C (Scope berubah ke DOM browser), C:H (Cookie auth dapat dicuri tanpa HttpOnly).
- [x] **Expected Business Impact:** Pembajakan akun pengguna/admin via pencurian session cookie, manipulasi tampilan forum, potensi defacement.
- [x] **Remediation Plan:**
  - Jangka Pendek: Pasang atribut `HttpOnly` dan `SameSite=Lax` pada cookie sesi; pasang Content-Security-Policy (CSP).
  - Jangka Panjang: Kontekstual HTML Entity Encoding sebelum render data ke DOM atau gunakan library DOMPurify.
  - Kode Aman: Pola DOMPurify / templating escape.
- [x] **Compliance Mapping:** UU PDP Pasal 35, ISO 27001 Annex A.8.28, OWASP ASVS V5.3.
- [x] **False-Positive Confidence:** $\le 15$ (Valid).
- [x] **Priority Queue:** `FIX FIRST` atau `FIX SOON`.
