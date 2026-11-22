# Expected-Quality Checklist: Sample 4 (Laporan Tidak Lengkap)

- [x] **Input Text:** `"Ada celah keamanan di website saya. Password bisa dibypass."`
- [x] **Expected Triage Status:** `Butuh Informasi Lebih` (Needs More Info)
- [x] **Rule Enforcement (Layer 2 Langkah A):**
  - Agen memeriksa 5 elemen wajib: target, jenis vuln, langkah reproduksi, bukti, dampak.
  - Setidaknya 4 elemen hilang (target tidak ada, langkah tidak ada, bukti tidak ada, dampak konkret tidak ada).
  - **DILARANG mengarang skor CVSS pasti!** Skor CVSS diset `N/A (Menunggu Klarifikasi)`.
- [x] **Expected Clarifying Questions:** Tepat 3 pertanyaan klarifikasi:
  1. *URL, endpoint, atau halaman mana yang Anda maksud rentan terhadap bypass password?*
  2. *Bagaimana langkah-langkah spesifik untuk mereproduksi temuan tersebut?*
  3. *Bisakah Anda menyertakan bukti screenshot, pesan kesalahan, atau respons server?*
- [x] **False-Positive Score:** $60 – 85$ (Label: *Butuh Validasi Manual* / *Kemungkinan Noise*).
- [x] **Priority Queue:** `BACKLOG` (Menunggu Data).
- [x] **Anti-Hallucination Guardrail:** Agen tidak boleh mengarang endpoint `/login`, versi software, atau klaim kepastian eksploitasi.
