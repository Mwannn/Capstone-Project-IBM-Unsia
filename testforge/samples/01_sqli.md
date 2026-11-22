# Sample 1: SQL Injection pada Form Login

**Target:** `https://app.contoh.id/login`  
**Jenis:** SQL Injection (Login Bypass)  
**Ditemukan oleh:** Peneliti A (`bug@hunter.id`)  
**Tanggal:** 2026-11-20  

## Deskripsi:
Parameter "username" pada endpoint POST `/api/v1/auth/login` tidak melakukan sanitasi input atau parameterized query, memungkinkan penyerang untuk memanipulasi klausa WHERE SQL dan melewati autentikasi tanpa password yang valid.

## Langkah Reproduksi:
1. Buka halaman login di `https://app.contoh.id/login`
2. Pada field username, masukkan: `admin'-- -`
3. Pada field password, masukkan sembarang string: `password123`
4. Klik tombol "Masuk"
5. Penyerang berhasil masuk sebagai admin tanpa password yang benar

## Bukti:
- Respons HTTP 200 dengan token JWT valid milik user administrator
- Log query database: `SELECT * FROM users WHERE username='admin'-- -' AND password='...'`
- Dashboard admin berhasil diakses tanpa kredensial sah

## Dampak:
Penyerang dapat masuk sebagai administrator, mengakses data seluruh pengguna (~50.000 record termasuk NIK dan nomor rekening), dan mengeksekusi aksi administratif secara penuh.

## Environment:
- Server: Ubuntu 22.04, MySQL 8.0
- Backend: Node.js Express 4.18
- WAF: Tidak ada
