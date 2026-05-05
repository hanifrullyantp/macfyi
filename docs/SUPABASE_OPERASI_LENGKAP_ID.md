# Operasi Supabase (ringkas)

Dokumen ini merangkum langkah operasional yang sering dipakai untuk proyek Macfyi. Untuk migrasi admin baru, lihat juga **`docs/MACFYI_ADMIN_MIGRATION.md`**.

## URL situs & redirect (Auth)

- **`site_url`**: produksi memakai `https://macfyi.com` (lihat `supabase/config.toml`).
- **`additional_redirect_urls` / URI allow list**: harus mencakup origin tempat pengguna kembali setelah magic link / OAuth / reset password, termasuk wildcard path bila perlu.

### Konsol admin (path + opsional subdomain)

Pastikan URL berikut ada di **Redirect URLs** (Dashboard Supabase) dan di repo pada `supabase/config.toml` serta default **`scripts/patch-supabase-auth-urls.sh`**:

| URL | Keterangan |
|-----|------------|
| `https://macfyi.com/admin` | Konsol di path (SPA di situs marketing) |
| `https://macfyi.com/admin/**` | Rute bawah /admin |
| `https://adm.macfyi.com` | Opsi host terpisah |
| `https://adm.macfyi.com/**` | Rute bawah origin adm |

Lihat [`ADMIN_SUBDOMAIN.md`](ADMIN_SUBDOMAIN.md).

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

### AI: `ai-chat` dan `ai-provider-health`

- **`ai-chat`**: chat assistant desktop; membaca kunci dari tabel `platform_api_keys` (service role), mencoba penyedia **Groq** lalu **Gemini**. Deploy: `supabase functions deploy ai-chat`. Kebijakan JWT (verify / no-verify) diselaraskan dengan cara app memanggil function (anon + session opsional, sama seperti function desktop lain).
- **`ai-provider-health`**: **probe** singkat per penyedia (request minimal ke API Gemini dan Groq) agar app desktop dapat menampilkan status koneksi per penyedia. Membaca kunci yang sama dari `platform_api_keys` (aktif + nilai valid), **bukan** mengirim kunci ke klien. Rate limit ringan: 24 panggilan per jam per kombinasi `deviceFingerprint` (body) + IP (`x-forwarded-for`). Respons JSON memuat `providers.gemini` / `providers.groq` (status `ok` | `error` | `not_configured` | `inactive`, plus `httpStatus` / `code` bila relevan) dan `checkedAt`. Jika limit terlampaui: HTTP **429**, body berisi `error: "RATE_LIMIT"`.
- **Deploy**: `supabase functions deploy ai-provider-health` — gunakan **`--no-verify-jwt`** hanya jika function dipanggil seperti function publik lain (anon key dari app) dan tim keamanan menyetujui; jika verify JWT aktif, pastikan header Authorization cocok dengan kebijakan gateway Supabase.
- **Admin** tetap sumber kebenaran untuk mengatur dan menguji kunci (halaman API Keys); aplikasi desktop hanya menampilkan hasil probe dari Edge ini.

### Desktop: login kode (pairing)

- **Migrasi**: `supabase/migrations/20260426120000_desktop_pairing_codes.sql` — tabel `desktop_pairing_codes` (akses langsung diblok untuk klien; Edge memakai service role), plus policy **`admin_delete_activations`** agar admin bisa menghapus baris `activations` (reset ganti Mac).
- **`create-desktop-pairing`**: dipanggil dari web setelah user Supabase login (JWT user). Menghasilkan kode pendek + `expires_at`. Deploy: `supabase functions deploy create-desktop-pairing` (verifikasi JWT aktif di Dashboard jika relevan).
- **`exchange-desktop-pairing`**: dipanggil dari app desktop dengan **anon key** + body JSON `code`, `device_fingerprint`. Menukar kode menjadi session (`token`, `email`, `is_pro`, `license_id`). Deploy: `supabase functions deploy exchange-desktop-pairing` — biasanya **publik** (`--no-verify-jwt`) karena app mengirim anon bearer; validasi tetap di kode function.
- **App (Vite)**: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan opsional `VITE_EXCHANGE_DESKTOP_PAIRING_URL` jika URL function tidak mengikuti default `.../functions/v1/exchange-desktop-pairing`. Untuk membuka login web dari app: `VITE_WEB_LOGIN_URL` atau default ke `https://macfyi.com/login?redirect=/desktop-connect`.
- **Admin**: halaman **Lisensi** → detail lisensi menampilkan fingerprint (disamarkan) + **Reset aktivasi** untuk mengosongkan ikatan perangkat.

## RLS & kunci

- **Frontend admin**: hanya **anon key** + pengguna dengan `app_metadata.role = admin`.
- **Service role**: hanya server / secret — jangan di-bundle ke Vite.
