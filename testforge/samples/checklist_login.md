# Expected-Quality Checklist — Form Login

Gunakan checklist ini untuk mengevaluasi output TestForge terhadap sample `01_login_form.md`.

---

## Checklist Kelengkapan Test Case

### Positive Cases (minimal 2)
- [ ] Login berhasil dengan email dan password valid → redirect ke dashboard
- [ ] Toggle show/hide password berfungsi
- [ ] Fungsi "Lupa Password" mengirim email reset ke alamat terdaftar

### Negative Cases (minimal 3)
- [ ] Login gagal — password salah → pesan error "Email atau password tidak valid"
- [ ] Login gagal — email tidak terdaftar → pesan error yang sama (tidak bocorkan apakah email ada)
- [ ] Login ke akun yang sedang terkunci → ditolak dengan pesan durasi kunci

### Boundary Cases (minimal 2)
- [ ] Password tepat 7 karakter (satu di bawah batas) → ditolak
- [ ] Password tepat 8 karakter (tepat di batas) → diterima
- [ ] Email tanpa karakter @ → validasi format gagal

### Edge Cases (minimal 2)
- [ ] Field email kosong → validasi menolak
- [ ] Field password kosong → validasi menolak
- [ ] Gagal login ke-5 → akun dikunci (pengujian tepat di batas counter)

### Security Cases (minimal 3)
- [ ] SQL Injection pada field email → ditolak, tidak ada data yang bocor
- [ ] XSS pada field email atau password → script tidak dieksekusi
- [ ] Brute force (5 kali gagal, unlock, 5 kali lagi) → akun kembali dikunci
- [ ] "Lupa Password" dengan email tidak terdaftar → respons generic (tidak bocorkan keberadaan akun)

### Non-Functional (opsional, nilai plus)
- [ ] Waktu respons login < 2 detik pada koneksi normal

---

## Checklist Format Output

- [ ] Menggunakan ID TC-001, TC-002, ... (berurutan, tidak ada lompatan)
- [ ] Setiap TC memiliki 7 kolom: ID, Judul, Prasyarat, Langkah, Hasil, Prioritas, Tipe
- [ ] Prioritas: hanya High/Medium/Low
- [ ] Tipe: hanya dari daftar 6 tipe yang valid
- [ ] Ada bagian "Analisis Persyaratan" di awal
- [ ] Ada bagian "Ringkasan Cakupan" dengan distribusi per tipe
- [ ] Ada bagian "Asumsi" dengan label [ASUMSI] jika model menyimpulkan

---

## Skor Minimum yang Dapat Diterima

| Dimensi | Minimum | Target |
|---------|---------|--------|
| Total test case | 10 | 15+ |
| Tipe tercakup | 5/6 | 6/6 |
| Security test case | 2 | 4 |
| Boundary test case | 2 | 3 |
| Hallucination (jumlah) | 0 (dengan label) | 0 |
| Duplikasi logika | 0 | 0 |
