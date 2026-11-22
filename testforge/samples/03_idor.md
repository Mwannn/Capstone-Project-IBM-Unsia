# Sample 3: Insecure Direct Object Reference (IDOR) pada Data Profil

**Aplikasi:** Mobile Banking App — API v2  
**Endpoint terdampak:** `GET /api/v2/users/{user_id}/profile`  
**Peneliti:** C (Ethical Hacker)  
**Tanggal:** 2026-11-19  

## Deskripsi Singkat:
Endpoint profil pengguna menggunakan ID numerik sekuensial yang dapat ditebak (`sequential integer`). Autentikasi dilakukan dengan token JWT yang valid, namun server tidak memverifikasi apakah `user_id` dalam path parameter sesuai dengan subject ID (`sub`) dalam token JWT pengguna yang sedang login. Sehingga Pengguna A dapat membaca profil Pengguna B hanya dengan mengganti angka ID di URL.

## Langkah Reproduksi:
1. Login sebagai pengguna biasa, peroleh JWT token sah
2. Akses endpoint: `GET /api/v2/users/12345/profile` dengan Authorization header Bearer token Anda
3. Respons mengembalikan data profil pengguna ID 12345 (milik sendiri)
4. Ubah angka path parameter menjadi `12344` atau `12346`
5. Respons tetap mengembalikan data profil lengkap pengguna lain dengan HTTP 200 OK

## Data yang Terekspos:
- Nama lengkap, alamat rumah, NIK / nomor KTP
- Nomor rekening bank dan riwayat saldo
- Email, nomor telepon, dan tanggal lahir

## Bukti:
- Respons API JSON berhasil menampilkan data pribadi nasabah lain
- Potensi dampak menyeluruh terhadap ~200.000 akun nasabah

## Dampak:
Pelanggaran kerahasiaan data pribadi massal, melanggar ketentuan UU Perlindungan Data Pribadi (UU PDP No. 27/2022) Pasal 35 dan Pasal 65 tentang penggunaan data pribadi tanpa hak.
