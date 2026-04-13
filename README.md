# MacFYI — AI-assisted Mac storage cleaner

Desktop app built with **React, Vite, Tailwind CSS, and Tauri 2** (Rust). It scans **safe user locations** (e.g. `~/Library/Caches`, Downloads, Desktop, media folders), groups findings into categories (cache, duplicates, large files, backups), and moves selected items to the **Trash** using the native backend.

## Requirements

- **macOS** 11+
- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable) — for Tauri

## Development

```bash
npm install
npm run tauri:dev
```

This starts Vite on port `5173` and opens the native Tauri window (full Rust + file APIs).

**Lightweight UI preview (no `.app` install):** run `npm run dev` and open `http://localhost:5173`. The layout and flows render in the browser; Tauri `invoke` calls use mock or empty fallbacks when the APIs are unavailable, so use `tauri:dev` to exercise scanning, Trash, and disk stats.

Desktop and localhost use the same React component tree (`AppShell`, feature modules, review flow). Only the backend adapter differs (Tauri invoke vs dev fallback), so design parity stays consistent.

## Production build

```bash
npm run tauri:build
```

Default output is **`MacFYI.app`** under `src-tauri/target/release/bundle/macos/`. That is enough to run or copy to `/Applications`.

### Optional: build a `.dmg` installer

DMG creation runs extra steps (`hdiutil`, Finder layout script) and sometimes fails with errors like **Resource busy** or **`bundle_dmg.sh`**. If you need a disk image:

```bash
npm run tauri:build:dmg
```

If it fails: quit other apps using disk images, close Finder windows pointing at the bundle folder, wait a few seconds, and retry. You can always ship the `.app` inside a `.zip` instead.

## Distribution

See [docs/RELEASE_MACOS.md](docs/RELEASE_MACOS.md) for Developer ID signing and notarization.

### Admin (browser, terpisah dari app desktop)

Untuk mengelola data Supabase (`app_settings`, lisensi, aktivasi, rahasia AI): gunakan proyek **[`admin-web/`](./admin-web/README.md)**.

1. `cd admin-web && npm install && npm run dev`
2. Buka URL yang ditampilkan Vite (default **http://localhost:5173**). Jika port bentrok dengan dev app utama, jalankan:  
   `npm run dev -- --port 5174` → lalu buka **http://localhost:5174**

**Ikon aplikasi desktop**, **versi build**, dan **notifikasi pembaruan** tidak diatur dari admin web: ubah aset di `src-tauri/icons/` dan konfigurasi di `src-tauri/tauri.conf.json` (serta plugin Tauri updater jika Anda menambahkannya).

## Architecture

- **`src/App.tsx`** — Routes, disk stats, scan/clean flow, AI panel; **`src/components/AppShell.tsx`** — sidebar + header (no decorative “fake macOS window”)
- **`src/lib/backend.ts`** — Tauri `invoke` wrappers (`scan_safe_paths`, `get_disk_stats`, `move_paths_to_trash`, `open_user_trash`)
- **`src-tauri/src/commands.rs`** — Whitelist scan, heuristics, Trash integration
- **CI** — `.github/workflows/tauri-build.yml` builds on push to `main`/`master`

## Safety

- Scans are limited to configurable safe roots under the user home directory (see `commands.rs`).
- “Risky” system paths are not scanned.
- Review **Backups** and **Large files** before cleaning.
- Grant **Full Disk Access** in **System Settings → Privacy & Security** if some folders appear empty unexpectedly.

## Marketing & landing (web)

- **Ekosistem & funnel:** [docs/MARKETING_ECOSYSTEM.md](docs/MARKETING_ECOSYSTEM.md)
- **Tutorial integrasi (Supabase, Vercel, Midtrans, Resend):** [docs/TUTORIAL_INTEGRASI_STACK.md](docs/TUTORIAL_INTEGRASI_STACK.md) — panduan detail untuk pemula.
- **Landing page (Vite):** folder `macfyi-landing-page/`

---

*MacFYI Dev Team*
