# Sample 03 — Upload File Profil Pengguna

**Kategori:** Feature Specification  
**Kompleksitas:** Menengah-Tinggi  
**Digunakan untuk:** Pengujian prompt TestForge — skenario file handling & storage

---

## Deskripsi Fitur

Pengguna dapat mengunggah foto profil melalui halaman **Pengaturan Akun**.

## Ketentuan Bisnis

| Parameter | Aturan |
|-----------|--------|
| Format yang diizinkan | JPG, PNG, WEBP |
| Ukuran maksimal | 5 MB |
| Dimensi minimal | 100 × 100 piksel |
| Dimensi maksimal | 4000 × 4000 piksel |
| Output setelah upload | Dikompresi otomatis menjadi **400 × 400 piksel** |
| Penyimpanan | Object storage (cloud) |

## Aturan Akses

- Hanya pengguna yang sudah **verifikasi email** yang dapat mengupload
- Pengguna **hanya bisa mengganti foto profil miliknya sendiri**

## Alur

1. Pengguna membuka halaman Pengaturan Akun
2. Memilih file dari perangkat lokal
3. **Preview** ditampilkan sebelum disimpan
4. Pengguna mengklik tombol **Simpan**
5. Sistem memvalidasi file (format, ukuran, dimensi)
6. Jika valid: kompresi → simpan ke object storage → hapus foto lama
7. Jika tidak valid: tampilkan pesan error yang sesuai

## Pesan Error yang Diharapkan

- Format tidak didukung: `"Format file tidak didukung. Gunakan JPG, PNG, atau WEBP."`
- Ukuran terlalu besar: `"Ukuran file melebihi batas 5 MB."`
- Dimensi terlalu kecil: `"Dimensi gambar terlalu kecil (minimal 100×100 piksel)."`
- Dimensi terlalu besar: `"Dimensi gambar terlalu besar (maksimal 4000×4000 piksel)."`
- Belum verifikasi: `"Verifikasi email Anda terlebih dahulu."`
