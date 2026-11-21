# Sample 02 — API Checkout Order

**Kategori:** API Specification  
**Kompleksitas:** Tinggi  
**Digunakan untuk:** Pengujian prompt TestForge — skenario transaksi e-commerce

---

## Spesifikasi API

**Endpoint:** `POST /api/v1/orders/checkout`  
**Autentikasi:** Bearer token (required)  
**Content-Type:** `application/json`

### Request Body

```json
{
  "cart_id":             "string (required)",
  "shipping_address_id": "string (required)",
  "payment_method":      "credit_card | transfer | wallet (required)",
  "voucher_code":        "string (optional)"
}
```

### Business Rules

1. Cart **harus milik** pengguna yang terautentikasi
2. Cart **tidak boleh kosong**
3. Semua item dalam cart harus **tersedia** (stock > 0)
4. Voucher, jika ada, harus **valid** dan **belum expired**
5. Diskon voucher: 0–100%, tipe: persentase atau flat nominal
6. **Total akhir tidak boleh negatif** (di-cap di 0 jika diskon melebihi subtotal)
7. Stok dikurangi secara **atomik** setelah pembayaran berhasil

### Response

| Status | Kondisi |
|--------|---------|
| `201 Created` | Checkout berhasil, body: `{ "order_id": "string" }` |
| `400 Bad Request` | Field wajib tidak ada atau tipe salah |
| `401 Unauthorized` | Token tidak valid atau tidak ada |
| `403 Forbidden` | Cart bukan milik pengguna |
| `409 Conflict` | Stok tidak mencukupi (race condition) |
| `422 Unprocessable` | Voucher tidak valid / expired / logika bisnis gagal |
