# Moleculab Admin Setup

Untuk mengaktifkan fitur CMS, Anda harus membuat user dengan role `admin`.

## Cara Setup Admin Utama

1. Dapatkan `SERVICE_ROLE_KEY` dari dashboard Supabase Anda (Project Settings -> API).
2. Tambahkan ke file `.env` lokal Anda:
   ```
   SUPABASE_SERVICE_ROLE_KEY=isi_dengan_key_anda
   ```
3. Jalankan script seed:
   ```bash
   npx tsx scripts/seedAdmin.ts
   ```
4. Login ke aplikasi dengan:
   - Email: `hanif.rullyant@gmail.com`
   - Password: `syantique`
5. **PENTING:** Segera ganti password Anda setelah login pertama kali untuk keamanan.

## Fitur Admin
- **Inline Edit:** Arahkan kursor ke teks di Landing Page atau Lab untuk mengedit konten langsung.
- **Content Manager:** Akses `/admin/content-manager` untuk mengelola semua override database.
