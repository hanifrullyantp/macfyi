# Operasi Supabase (ringkas)

Dokumen ini merangkum langkah operasional yang sering dipakai untuk proyek Macfyi. Untuk migrasi admin baru, lihat juga **`docs/MACFYI_ADMIN_MIGRATION.md`**.

## URL situs & redirect (Auth)

- **`site_url`**: produksi memakai `https://macfyi.com` (lihat `supabase/config.toml`).
- **`additional_redirect_urls` / URI allow list**: harus mencakup origin tempat pengguna kembali setelah magic link / OAuth / reset password, termasuk wildcard path bila perlu.

### Admin produksi di `/admin`

Pastikan URL berikut ada di **Redirect URLs** (Dashboard Supabase) dan di repo pada `supabase/config.toml` serta default **`scripts/patch-supabase-auth-urls.sh`**:

| URL | Keterangan |
|-----|------------|
| `https://macfyi.com/admin` | Origin halaman admin (hash/query callback) |
| `https://macfyi.com/admin/**` | Deep link & navigasi di bawah `/admin` |

`https://macfyi.com/**` sudah mencakup banyak path; entri eksplisit di atas memudahkan audit dan cocok dengan dokumentasi produk.

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

## RLS & kunci

- **Frontend admin**: hanya **anon key** + pengguna dengan `app_metadata.role = admin`.
- **Service role**: hanya server / secret — jangan di-bundle ke Vite.
