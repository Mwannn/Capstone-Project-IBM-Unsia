# Expected-Quality Checklist — API Checkout

Gunakan checklist ini untuk mengevaluasi output TestForge terhadap sample `02_checkout_api.md`.

---

## Checklist Kelengkapan Test Case

### Positive Cases (minimal 2)
- [ ] Checkout berhasil — semua field valid, tanpa voucher → 201 Created + order_id
- [ ] Checkout berhasil — dengan voucher valid → diskon diterapkan, total berkurang

### Negative Cases (minimal 4)
- [ ] Checkout tanpa header Authorization → 401 Unauthorized
- [ ] Checkout dengan cart kosong → 400 atau 422 dengan pesan
- [ ] Checkout dengan item stok habis → 409 atau 422 dengan pesan
- [ ] Checkout dengan payment_method tidak valid (bukan enum) → 400
- [ ] Checkout dengan voucher expired → 422 dengan pesan
- [ ] Checkout dengan voucher tidak ditemukan → 422 dengan pesan
- [ ] Checkout tanpa field wajib (misal: tanpa cart_id) → 400

### Boundary Cases (minimal 2)
- [ ] Diskon flat = total → total = 0 (tidak negatif)
- [ ] Diskon flat > total → total di-cap 0, tidak menjadi negatif
- [ ] Cart berisi tepat 1 item (batas bawah cart yang valid)

### Edge Cases (minimal 2)
- [ ] Race condition: 2 pengguna checkout item terakhir bersamaan → hanya 1 berhasil
- [ ] cart_id berformat UUID valid tapi tidak ada di database → 404

### Security Cases (minimal 3)
- [ ] Request tanpa token → 401 (autentikasi)
- [ ] Token pengguna B mengakses cart pengguna A → 403 (otorisasi / IDOR)
- [ ] SQL Injection pada voucher_code → ditolak, tidak ada data bocor
- [ ] Manipulasi harga di request body (jika ada) → diabaikan, harga dari server

### Non-Functional (opsional)
- [ ] Response time checkout < 3 detik pada beban normal

---

## Checklist Format Output

- [ ] Menggunakan ID TC-001, TC-002, ... (berurutan)
- [ ] Ada kolom HTTP status code atau dimasukkan di "Hasil yang Diharapkan"
- [ ] Prasyarat menyebutkan kondisi autentikasi secara eksplisit
- [ ] Ada bagian "Analisis Persyaratan" dengan identifikasi endpoint + HTTP method
- [ ] Ada bagian "Ringkasan Cakupan"
- [ ] Ada bagian "Asumsi" (terutama untuk detail teknis JWT/session)

---

## Skor Minimum yang Dapat Diterima

| Dimensi | Minimum | Target |
|---------|---------|--------|
| Total test case | 12 | 16+ |
| Tipe tercakup | 5/6 | 6/6 |
| Security test case (authn + authz) | 2 | 3+ |
| Edge case race condition | 1 | 1 |
| Hallucination | 0 (dengan label) | 0 |
| Format HTTP status di output | ⚠ opsional | ✅ ada |
