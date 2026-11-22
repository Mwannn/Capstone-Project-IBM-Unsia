# Sample 2: Stored Cross-Site Scripting (XSS) pada Kolom Komentar

**Target:** `https://forum.contoh.id/post/comments`  
**Jenis:** Stored Cross-Site Scripting (XSS)  
**Tingkat (estimasi pelapor):** High  
**Ditemukan oleh:** Security Researcher B  
**Tanggal:** 2026-11-18  

## Deskripsi:
Endpoint pengiriman komentar pada `POST /api/comments` tidak melakukan sanitasi input atau HTML entity encoding pada field `content`. Skrip JavaScript berbahaya yang dimasukkan ke dalam komentar disimpan secara permanen di database dan dieksekusi di peramban setiap pengguna yang membuka postingan tersebut.

## Langkah Reproduksi:
1. Login sebagai pengguna terdaftar mana pun
2. Buka salah satu halaman postingan publik
3. Pada kolom komentar, kirim komentar yang memuat payload script tag
4. Setiap pengguna lain atau admin yang membuka postingan tersebut akan mengeksekusi payload dalam sesi browser mereka

## Bukti:
- Komentar PoC tersimpan pada Post ID 1337
- Browser developer tools mengonfirmasi inline script dieksekusi saat halaman dimuat
- Cookie session auth dapat dibaca melalui `document.cookie` (ketiadaan flag `HttpOnly`)

## Dampak:
Penyerang dapat mencuri cookie sesi seluruh pengunjung postingan, melakukan pembajakan akun (Account Takeover), mengalihkan korban ke situs phishing, atau memanipulasi konten visual.

## Environment:
- Backend: PHP 8.2 / Laravel 10
- Database: PostgreSQL 15
- Header CSP: Tidak ada Content-Security-Policy
