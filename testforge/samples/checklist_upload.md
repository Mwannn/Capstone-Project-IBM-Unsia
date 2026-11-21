# Expected-Quality Checklist — File Upload

Gunakan checklist ini untuk mengevaluasi output TestForge terhadap sample `03_file_upload.md`.

---

## Checklist Kelengkapan Test Case

### Positive Cases (minimal 3)
- [ ] Upload JPG valid (ukuran < 5 MB, dimensi dalam range) → berhasil, foto baru tampil
- [ ] Upload PNG valid → berhasil
- [ ] Upload WEBP valid → berhasil
- [ ] Verifikasi foto lama dihapus dari storage setelah upload baru berhasil

### Negative Cases (minimal 3)
- [ ] Upload PDF → ditolak, pesan format tidak didukung
- [ ] Upload GIF atau format lain yang tidak ada di whitelist → ditolak
- [ ] Upload oleh pengguna yang belum verifikasi email → ditolak, pesan verifikasi

### Boundary Cases (minimal 4 — ini fitur kaya boundary)
- [ ] File tepat 5 MB → diterima
- [ ] File 5.01 MB → ditolak, pesan ukuran melebihi batas
- [ ] Gambar tepat 100×100 px (batas minimal) → diterima
- [ ] Gambar 99×99 px → ditolak, pesan dimensi terlalu kecil
- [ ] Gambar tepat 4000×4000 px (batas maksimal) → diterima
- [ ] Gambar 4001×4001 px → ditolak, pesan dimensi terlalu besar

### Edge Cases (minimal 2)
- [ ] Upload file 0 byte / corrupt → ditolak, pesan file tidak valid
- [ ] Upload file sangat kecil (< 1 KB, gambar 1×1 px) → ditolak karena dimensi

### Security Cases (minimal 3)
- [ ] Upload file dengan ekstensi .jpg tapi konten bukan gambar (MIME bypass) → ditolak setelah validasi MIME type
- [ ] Upload dengan nama file mengandung path traversal (../../../etc/passwd.jpg) → nama di-sanitasi, tidak ada path traversal
- [ ] Percobaan upload foto profil pengguna lain (IDOR via manipulasi user_id) → 403 Forbidden
- [ ] Upload file executable berekstensi gambar (.php.jpg) → ditolak

### Non-Functional (opsional)
- [ ] Upload file 5 MB selesai dalam waktu wajar (< 10 detik pada koneksi broadband)

---

## Checklist Format Output

- [ ] Menggunakan ID TC-001, TC-002, ... (berurutan)
- [ ] Prasyarat menyebutkan status verifikasi email pengguna
- [ ] Langkah test case menyebutkan detail file (format, ukuran, dimensi) secara eksplisit
- [ ] Boundary test case mencakup semua 3 parameter: ukuran, dimensi-min, dimensi-maks
- [ ] Ada bagian "Analisis Persyaratan" yang mengidentifikasi semua aturan bisnis
- [ ] Ada bagian "Asumsi" (terutama: validasi MIME vs ekstensi, server-side vs client-side)

---

## Skor Minimum yang Dapat Diterima

| Dimensi | Minimum | Target |
|---------|---------|--------|
| Total test case | 12 | 17+ |
| Boundary test case | 4 | 6 |
| Security test case | 2 | 4 |
| Tipe Non-Functional | opsional | 1 |
| Validasi MIME disebutkan | ✅ wajib | ✅ |
| IDOR disebutkan | ✅ wajib | ✅ |
| Hallucination | 0 (dengan label) | 0 |
