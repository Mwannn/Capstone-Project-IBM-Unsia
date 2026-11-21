# Sample 01 — Form Login Pengguna

**Kategori:** User Story  
**Kompleksitas:** Menengah  
**Digunakan untuk:** Pengujian prompt TestForge — skenario autentikasi

---

## User Story

> Sebagai pengguna terdaftar, saya ingin dapat masuk ke aplikasi menggunakan email dan password agar dapat mengakses fitur yang memerlukan autentikasi.

## Kriteria Penerimaan

- Form memiliki dua field: **Email** dan **Password**
- Email harus dalam format valid (mengandung @, domain valid)
- Password minimal **8 karakter**
- Jika berhasil login, pengguna diarahkan ke halaman **dashboard**
- Jika gagal (email tidak terdaftar / password salah), tampilkan pesan error:  
  `"Email atau password tidak valid"`
- Setelah **5 kali gagal** login, akun dikunci selama **15 menit**
- Tersedia tombol **"Lupa Password"** yang mengirim email reset ke alamat terdaftar
- Password disembunyikan secara default; ada **toggle show/hide**

## Konteks Teknis (opsional)

- Platform web (responsive)
- Autentikasi menggunakan session atau JWT (tidak dispesifikkan lebih lanjut)
- Tidak ada SSO / OAuth dalam scope ini
