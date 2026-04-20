# Laporan audit & QA Macfyi (ringkas, bahasa Indonesia)

**Tanggal catatan:** 2026-04-20 (sesuai implementasi tes & harness)

---

## Ringkasan satu halaman

| Topik | Keterangan singkat |
|--------|---------------------|
| Yang sudah dikerjakan di kode | Harness tes (Vitest), tes frontend & shared Supabase, modul `midtransSignature`, tes Rust untuk Disk Explorer, contoh file `.env`. |
| Yang masih harus Anda / tim lakukan manual | Mengatur Midtrans produksi, email SMTP, cron, penandatanganan Mac, analytics — lihat [MACFYI_MANUAL_INTEGRATION_AND_QA.md](MACFYI_MANUAL_INTEGRATION_AND_QA.md). |
| Cakupan tes frontend (perkiraan) | Sekitar **15%** statement di folder `src/` (lihat `npm run test:coverage`). |
| Tes Rust Disk Explorer | **14 tes** lulus (`cargo test --lib`). |

---

## Prioritas: sebelum rilis ke publik

1. **Rahasia produksi** — Pastikan di proyek Supabase **hosted** sudah terisi: `MIDTRANS_SERVER_KEY`, pengaturan SMTP, `CRON_SECRET`, dll. File `.env.example` hanya contoh, **bukan** tempat rahasia sungguhan.
2. **URL webhook** — Di dashboard Midtrans (dan Lynk jika dipakai), URL notifikasi harus mengarah ke function `payment-webhook` yang sudah di-deploy.

---

## Prioritas tinggi (sprint ini)

1. **ESLint** — Tambahkan `eslint.config.js` agar `npm run lint` bisa dipakai di CI.
2. **Landing → analytics** — Pastikan event penting mengirim ke function `track-event` jika CRM dipakai.
3. **Telemetri dengan consent** — Pastikan `sendClientTelemetry` hanya kirim data sensitif setelah pengguna setuju (sesuai kebijakan).

---

## Prioritas sedang / rendah

- Ukuran bundle utama besar (~950 kB); bisa dipecah lagi jika startup terasa berat.
- `cargo clippy` masih ada peringatan di modul lain (bukan dari tes Disk Explorer).

---

## Status checklist integrasi (setelah pass kode)

| Item | Status singkat |
|------|----------------|
| Midtrans produksi | Per lingkungan (staging vs prod) |
| Email SMTP | Per lingkungan |
| Lynk.id | Opsional |
| Supabase produksi | Operasional |
| Cron terjadwal | Operasional |
| Code signing macOS | Operasional |
| CI GitHub Actions | Opsional |
| Analytics | Opsional |
| Sentry | Opsional |

---

## Hasil tes otomatis (referensi)

| Pengecekan | Hasil |
|------------|--------|
| Vitest (frontend) | **39 lulus**, 0 gagal |
| `cargo test --lib` | **14 tes** Disk Explorer + suite lib hijau |
| `npx tsc --noEmit` | Lulus |
| `cargo check` | Lulus |
| `cargo clippy` | Lulus (ada warning di kode lama) |
| `npm run build` | Lulus (`dist/` ~1,9 MB) |
| ESLint | Belum dikonfigurasi di root |

---

## Privasi & keamanan (cek cepat)

- Prompt AI Disk Explorer memakai ringkasan path yang disamarkan, bukan path absolut pengguna di prompt.
- Alur bersih tidak memakai `remove_file` untuk hapus permanen di path yang diaudit; pemindahan ke Trash lewat alur aplikasi.
- Tanda tangan Midtrans ada di [`supabase/functions/_shared/midtransSignature.ts`](../supabase/functions/_shared/midtransSignature.ts).

---

## Nama file export

Laporan Disk Explorer: **`macfyi-disk-report-{timestamp}.{json|txt}`** di folder **Download**.

---

## Langkah lanjut yang disarankan

1. Tambah konfigurasi ESLint + skrip `lint` (~1–2 jam).
2. Naikkan coverage untuk cabang store AI lokal jika perlu (~2–4 jam).
3. Jalankan checklist QA manual pada build yang sudah di-sign (~2 jam).

Untuk **tutorial langkah demi langkah** integrasi dan uji untuk orang awam + developer, buka **[MACFYI_MANUAL_INTEGRATION_AND_QA.md](MACFYI_MANUAL_INTEGRATION_AND_QA.md)**.
