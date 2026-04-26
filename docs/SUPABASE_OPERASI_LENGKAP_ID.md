# Operasi Supabase (ringkas)

Dokumen ini merangkum langkah operasional yang sering dipakai untuk proyek Macfyi. Untuk migrasi admin baru, lihat juga **`docs/MACFYI_ADMIN_MIGRATION.md`**.

## URL situs & redirect (Auth)

- **`site_url`**: produksi memakai `https://macfyi.com` (lihat `supabase/config.toml`).
- **`additional_redirect_urls` / URI allow list**: harus mencakup origin tempat pengguna kembali setelah magic link / OAuth / reset password, termasuk wildcard path bila perlu.

### Konsol admin (produksi: `admin.macfyi.com`)

Pastikan URL berikut ada di **Redirect URLs** (Dashboard Supabase) dan di repo pada `supabase/config.toml` serta default **`scripts/patch-supabase-auth-urls.sh`**:

| URL | Keterangan |
|-----|------------|
| `https://admin.macfyi.com` | Origin halaman admin |
| `https://admin.macfyi.com/**` | Deep link & rute di bawah origin |

(Opsional) URL lama `https://macfyi.com/admin` tetap ada di list selama transisi; traffic umum diarahkan 308 ke subdomain. Lihat [`ADMIN_SUBDOMAIN.md`](ADMIN_SUBDOMAIN.md).

`https://macfyi.com/**` sudah mencakup banyak path; entri di atas memudahkan audit.

### Patch URL via API

Dengan token Management (`SUPABASE_ACCESS_TOKEN`):

```bash
./scripts/patch-supabase-auth-urls.sh
```

Override bila perlu: `AUTH_SITE_URL`, `AUTH_URI_ALLOW_LIST`.

### Sinkron dari repo ke hosted

Setelah mengedit `config.toml`, terapkan ke proyek terhubung sesuai alur tim Anda (mis. `supabase config push` atau penyesuaian manual di Dashboard).

## Edge Functions

- Deploy: `supabase functions deploy <nama-function>` (tambahkan `--no-verify-jwt` hanya jika function memang publik dan sudah disetujui secara keamanan).
- Log runtime: **Supabase Dashboard → Edge Functions → Logs**.

### Desktop: login kode (pairing)

- **Migrasi**: `supabase/migrations/20260426120000_desktop_pairing_codes.sql` — tabel `desktop_pairing_codes` (akses langsung diblok untuk klien; Edge memakai service role), plus policy **`admin_delete_activations`** agar admin bisa menghapus baris `activations` (reset ganti Mac).
- **`create-desktop-pairing`**: dipanggil dari web setelah user Supabase login (JWT user). Menghasilkan kode pendek + `expires_at`. Deploy: `supabase functions deploy create-desktop-pairing` (verifikasi JWT aktif di Dashboard jika relevan).
- **`exchange-desktop-pairing`**: dipanggil dari app desktop dengan **anon key** + body JSON `code`, `device_fingerprint`. Menukar kode menjadi session (`token`, `email`, `is_pro`, `license_id`). Deploy: `supabase functions deploy exchange-desktop-pairing` — biasanya **publik** (`--no-verify-jwt`) karena app mengirim anon bearer; validasi tetap di kode function.
- **App (Vite)**: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan opsional `VITE_EXCHANGE_DESKTOP_PAIRING_URL` jika URL function tidak mengikuti default `.../functions/v1/exchange-desktop-pairing`. Untuk membuka login web dari app: `VITE_WEB_LOGIN_URL` atau default ke `https://macfyi.com/login?redirect=/desktop-connect`.
- **Admin**: halaman **Lisensi** → detail lisensi menampilkan fingerprint (disamarkan) + **Reset aktivasi** untuk mengosongkan ikatan perangkat.

## RLS & kunci

- **Frontend admin**: hanya **anon key** + pengguna dengan `app_metadata.role = admin`.
- **Service role**: hanya server / secret — jangan di-bundle ke Vite.
