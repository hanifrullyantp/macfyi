# Macfyi (native macOS)

Aplikasi SwiftUI untuk macOS 14+ yang berdiri **terpisah** dari stack Tauri/React di root repo.

## Membuka proyek

1. Pasang **Xcode 15+** (Swift 5.9+ direkomendasikan; `Observation` tidak dipakai — proyek memakai `ObservableObject`).
2. Buka `native/Macfyi/Macfyi.xcodeproj`.
3. Pilih skema **Macfyi** dan jalankan (**⌘R**).

> Catatan: Build dari terminal membutuhkan `xcode-select -s /Applications/Xcode.app/Contents/Developer` (bukan hanya Command Line Tools).

## Isi

- **DesignSystem** — `MacFYITheme.swift` (token warna merah premium + gradien orb), `Color+Hex.swift`.
- **Onboarding** — 6 slide (Bahasa Indonesia), bookmark folder lewat `NSOpenPanel`, `UserDefaults` `hasCompletedOnboarding`.
- **Orb** — `OrbButtonView` mengambang di pojok kanan bawah konten.
- **Suara** — `SoundManager` (`NSSound` sistem).
- **Notifikasi** — `AppNotifications` + izin di Info.plist.
- **Performa** — RAM (`host_statistics64`), daftar proses (`ps`), LaunchAgents (parse plist), login items (`LSSharedFileList`), tugas pemeliharaan (DNS flush, `diskutil verifyVolume`, dll.).

## Lokalisasi

- `Macfyi/id.lproj/Localizable.strings` — default (development region `id`).
- `Macfyi/en.lproj/Localizable.strings` — bahasa Inggris.

## Sandboxing

`Macfyi.entitlements` memakai App Sandbox + akses file yang dipilih pengguna. Beberapa path sistem untuk LaunchAgents dapat kosong tanpa **Full Disk Access** — UI menjelaskan batasan tersebut.
