# macOS release: signing and notarization

MacFYI is bundled with Tauri as `MacFYI.app` and a `.dmg`. For distribution outside the Mac App Store, Apple expects **Developer ID** signing and **notarization**.

## Prerequisites

- Apple Developer Program membership
- A **Developer ID Application** certificate in Keychain
- An app-specific password or API key for `notarytool`

## App icons (Dock / `.icns`)

Source of truth for the **square master** in this repo:

- [`src-tauri/icons/logo box macfyi.png`](../src-tauri/icons/logo%20box%20macfyi.png) (file name contains a space — quote the path in the shell).

From the **repository root**, regenerate all bundle icons (overwrites files under `src-tauri/icons/`):

```bash
npx tauri icon "src-tauri/icons/logo box macfyi.png"
```

Then rebuild (`npm run tauri:build`). More context on in-app vs Dock branding: [`docs/BRANDING_ASSETS.md`](BRANDING_ASSETS.md).

## `.app` vs `.dmg` (apa yang dipakai user unduh?)

- **`Macfyi.app`** (folder di `bundle/macos/`): bundle aplikasi macOS. Bisa dijalankan / disalin ke `Applications`, biasanya **bukan** file yang Anda kirim ke pelanggan mentah-mentah.
- **`.dmg`**: image disk untuk distribusi — user **drag** `.app` ke `Applications` atau jalankan installer di dalam DMG. **Ini** yang umum dipakai sebagai “unduhan installer” di website (tombol unduh di landing).

Setelah `npm run tauri:build:dmg`, cari `.dmg` di:

- `src-tauri/target/release/bundle/dmg/` (target DMG), dan/atau
- `src-tauri/target/release/bundle/macos/` (beberapa build juga menaruh DMG di sini).

Skrip `scripts/upload-latest-dmg-to-supabase.sh` memilih file `.dmg` **terbaru** di kedua lokasi itu.

## Local release build

```bash
npm ci
npm run tauri:build
```

By default this produces **`Macfyi.app`** under `src-tauri/target/release/bundle/macos/`. The DMG target is optional because `bundle_dmg.sh` can fail intermittently (e.g. `hdiutil: Resource busy`).

To try building a DMG as well:

```bash
npm run tauri:build:dmg
```

If DMG bundling fails, distribute the signed `.app` or a `.zip` of the `.app` instead.

## Otomatis: unggah DMG terbaru ke Supabase (tanpa commit file ke Git)

Binary DMG **tidak** disimpan di repo. Alur yang disarankan:

1. **Migrasi** membuat bucket Storage publik `releases` (baca `supabase/migrations/20260422103000_releases_storage_bucket.sql`) lalu `supabase db push`.
2. **Sekali** pastikan baris `app_settings` punya `download_base_url` — bisa dibiarkan kosong dulu; skrip CI bisa mengisi otomatis (lihat bawah).
3. **GitHub Actions** — workflow `Upload DMG to Supabase` (`.github/workflows/supabase-dmg-upload.yml`):
   - Jalankan manual (**Actions → Upload DMG to Supabase → Run workflow**), atau
   - Push **tag** `v*` (mis. `v0.2.1`) untuk rilis.
4. **Secrets** di repo GitHub: `SUPABASE_URL` (mis. `https://xxxx.supabase.co`), `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API — **rahasia**, jangan ke frontend). Opsional: `UPDATE_APP_SETTINGS` = `true` agar URL unduhan di `app_settings` mengikuti DMG dari workflow ini.

Workflow menjalankan `npm run tauri:build:dmg`, lalu `scripts/upload-latest-dmg-to-supabase.sh` yang:

- mengunggah ke **`releases/macfyi-latest.dmg`** (path tetap, **overwrite** setiap rilis);
- URL publik: `https://<project>.supabase.co/storage/v1/object/public/releases/macfyi-latest.dmg`;
- jika `UPDATE_APP_SETTINGS=true`, mem-**PATCH** `app_settings.download_base_url` ke URL itu dan menaikkan `config_version` agar klien memuat ulang `public-config`.

**Lokal** setelah build:

```bash
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
UPDATE_APP_SETTINGS=true ./scripts/upload-latest-dmg-to-supabase.sh
```

## Sign the app (overview)

1. Enable Hardened Runtime and entitlements as required by your feature set (Tauri sets sensible defaults).
2. Sign the `.app` with your Developer ID:

```bash
codesign --force --deep --sign "Developer ID Application: Your Name (TEAMID)" \
  --options runtime \
  path/to/MacFYI.app
```

3. Notarize with `notarytool` (Apple’s current tool):

```bash
xcrun notarytool submit path/to/MacFYI.dmg --apple-id "..." --team-id "..." --password "app-specific-password" --wait
```

4. Staple the ticket:

```bash
xcrun stapler staple path/to/MacFYi.dmg
```

Exact flags depend on whether you use `.dmg`, `.zip`, or `notarytool` with `--keychain-profile`. See [Apple’s notarization documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution).

## Bundle identifier

The app identifier is set in `src-tauri/tauri.conf.json` as `identifier` (currently `com.macfyi.desktop`). Keep it stable across releases so updates and notarization line up.

## CI

`.github/workflows/tauri-build.yml` builds on every push to `main`/`master` and uploads the bundle as an artifact. CI does **not** sign or notarize; add a separate protected workflow with Apple credentials if you need automated release uploads.

## In-app updates (Tauri updater)

The desktop app includes `tauri-plugin-updater` + `tauri-plugin-process`. A banner appears when a newer signed build is available; **Install** downloads the update and relaunches the app.

1. Generate a signing key pair (see [Tauri updater](https://v2.tauri.app/plugin/updater/)) and put the **public** key in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
2. Set `plugins.updater.endpoints` to your JSON endpoint (for example a static URL or GitHub Releases latest JSON).
3. Set `plugins.updater.active` to `true` when you are ready to ship updates (keep `false` in development if you do not host update metadata yet).
4. Each release must publish the update bundle and signature expected by that endpoint; the app must remain **Developer ID signed and notarized** so macOS allows the downloaded update.
