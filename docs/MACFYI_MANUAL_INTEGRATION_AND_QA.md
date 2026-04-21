# Panduan integrasi & uji coba Macfyi (bahasa Indonesia)

Dokumen ini dibuat untuk dua jenis pembaca:

1. **Anda yang tidak ahli teknologi** — ikuti bagian **“Untuk pemula”** dan checklist **“Coba di Mac Anda”**.
2. **Developer / tim ops** — ikuti bagian **“Untuk tim teknis”** yang berisi pengaturan server, pembayaran, dan automation.

---

## Untuk pemula: Macfyi itu apa singkatnya?

Macfyi adalah aplikasi di Mac untuk membantu melihat pemakaian penyimpanan dan membersihkan file dengan aman (misalnya memindah ke Trash, bukan hapus permanen).

Beberapa hal **butuh internet dan akun penyedia layanan** (untuk pembayaran, lisensi, atau pembaruan). Yang lain bisa jalan **di komputer Anda saja**.

---

## Untuk pemula: cara uji aplikasi di Mac Anda

**Persiapan**

1. Pasang aplikasi Macfyi versi yang akan diuji (biasanya file `.dmg` atau dari TestFlight — sesuai cara distribusi tim Anda).
2. Pastikan Anda punya **izin sebagai pengguna biasa** di Mac (tidak perlu root).

**Langkah uji cepat (15–30 menit)**

| Langkah | Apa yang Anda lakukan | Yang “benar” terlihat seperti apa |
|--------|-------------------------|-----------------------------------|
| 1 | Buka Macfyi | Bukan layar putih kosong lama; ada tampilan mulai atau halaman utama. |
| 2 | Buka fitur **Disk Explorer** (atau nama tab serupa di aplikasi Anda) | Ada ringkasan pemakaian disk atau daftar folder. |
| 3 | Lihat lokasi default | Awalnya biasanya folder rumah Anda (`~`), bukan seluruh sistem dari akar `/`. |
| 4 | Klik satu folder untuk “masuk ke dalam” | Daftar berubah; ada **breadcrumb** (jejak lokasi seperti A → B → C). |
| 5 | Klik salah satu breadcrumb untuk mundur | Anda kembali ke level folder sebelumnya tanpa aplikasi tutup mendadak. |
| 6 | Buka folder yang tidak boleh dibaca sistem | Muncul pesan jelas (bukan aplikasi crash). |

**Disk Explorer — perilaku yang perlu Anda perhatikan**

- **Label risiko** (nama bisa beda di UI): folder cache sering dianggap lebih “aman”; folder sistem bisa “terkunci” dan tidak bisa dipilih untuk dibuang.
- **Banner akses disk penuh (FDA):** kalau macOS belum memberi izin penuh, biasanya ada peringatan kuning dan tombol membuka **Pengaturan Sistem**. Setelah izin diberikan, peringatan bisa hilang atau berubah jadi positif.
- **Pilih file + Trash:** centang baris yang boleh dipilih → muncul aksi → **Pindah ke Trash** harus minta **konfirmasi** dulu. Batal = tidak ada perubahan.
- **Ringkasan AI:** saat menganalisis folder, teks tidak boleh menampilkan nama pengguna lengkap di path seperti `/Users/namaanda/...` (biasanya sudah disamarkan).
- **Export laporan:** dari Disk Explorer, export **JSON** atau **TXT** — file biasanya tersimpan di folder **Download** dengan nama seperti `macfyi-disk-report-...`.

**Matikan internet sebentar (uji offline)**

1. Matikan Wi‑Fi atau cabut kabel LAN.
2. Buka lagi Macfyi → navigasi Disk Explorer.

Yang diharapkan: aplikasi tetap bisa menjelajah folder (sesuai izin macOS); kalau ada pesan tentang pengaturan dari server, itu wajar selama aplikasi tidak error berulang tanpa pesan.

---

## Untuk pemula: daftar centang QA (boleh dicetak)

Centang □ saat Anda sudah mencoba.

### Navigasi & Disk Explorer

- □ Tab Disk Explorer terbuka dan tidak blank.
- □ Bisa masuk folder dan keluar lewat breadcrumb.
- □ Folder terkunci/tidak bisa dibaca tidak membuat aplikasi crash.

### Banner izin disk (FDA)

- □ Kalau belum ada izin: ada penjelasan dan tombol ke Pengaturan.
- □ Setelah izin diberikan: status terlihat lebih “aman” atau peringatan hilang.

### Pilihan & Trash

- □ Baris “aman” bisa dicentang; yang terkunci tidak bisa dipilih untuk aksi berbahaya.
- □ “Pindah ke Trash” selalu minta konfirmasi.
- □ Setelah sukses, daftar ter-refresh.

### AI & privasi

- □ Ringkasan AI tidak menampilkan path rumah lengkap dengan nama pengguna Anda.

### Export

- □ Export berhasil; file ada di **Download**; nama mengandung `macfyi-disk-report` dan tanggal/waktu.

### Pembayaran (hanya jika Anda menguji pembelian)

- □ Halaman checkout terbuka; bisa bayar dengan **kartu uji** sesuai panduan Midtrans sandbox.
- □ Setelah bayar, lisensi atau email aktivasi sesuai alur tim Anda (uji di lingkungan **sandbox**, bukan uang sungguhan kecuali disengaja).

---

## Untuk tim teknis: mengapa ada dua jenis tugas?

- **Integrasi manual** = menyambungkan Macfyi dengan layanan luar (Midtrans, email, database Supabase, jadwal cron). Ini **tidak bisa otomatis 100%** tanpa login dashboard dan rahasia API.
- **QA manual** = orang sungguhan membuka aplikasi dan mencatat bug — mesin tes otomatis tidak mengganti pengalaman nyata di Mac.

---

## Untuk tim teknis: integrasi yang disetup manual

Gunakan **staging** dulu, baru produksi. Simpan rahasia API di **Supabase Secrets / dashboard**, jangan di Git.

### A. Midtrans (produksi)

**Tujuan:** pembayaran online resmi mengirim notifikasi ke server Anda.

**Langkah ringkas:**

1. Login [Dashboard Midtrans](https://dashboard.midtrans.com/).
2. Buka pengaturan **Payment Notification URL**.
3. Isi URL webhook:  
   `https://<project-ref>.supabase.co/functions/v1/payment-webhook`  
   (ganti `<project-ref>` dengan proyek Supabase Anda.)
4. Di Supabase → **Edge Functions → Secrets**, set `MIDTRANS_SERVER_KEY` dengan **server key produksi** dari Midtrans.
5. Sesuaikan mode produksi/sandbox sesuai dokumentasi deployment Anda.
6. Dokumentasi Midtrans: [docs.midtrans.com](https://docs.midtrans.com/).

### B. Email (SMTP / Resend)

**Tujuan:** kirim email lisensi atau notifikasi setelah bayar.

**Langkah ringkas:**

1. Pilih penyedia SMTP transaksional (bukan dari Macfyi — dari penyedia Anda).
2. Di Supabase secrets, isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (untuk email lisensi: **alamat email polos**, contoh `orders@domain.com`), dan opsional `OPS_ALERT_EMAIL`.
3. Uji satu pembayaran di sandbox → cek log function `payment-webhook` → pastikan email terkirim.

Panduan CLI terpusat (secret, `db push`, deploy, cron): [SUPABASE_OPERASI_LENGKAP_ID.md](./SUPABASE_OPERASI_LENGKAP_ID.md).

### C. Lynk.id (opsional)

**Tujuan:** jalur checkout alternatif ke Midtrans.

**Langkah ringkas:**

1. Admin landing → tab **Checkout** → pilih **Lynk.id** → **Simpan gateway ke server**.
2. **Pilih salah satu:** (a) isi **URL tautan checkout Lynk** lalu **Publikasikan** konten (mode hosted link), atau (b) set secret `LYNK_CREATE_URL` + token/API key di Supabase (`supabase secrets set --env-file …`) untuk mode API server.
3. Webhook Lynk arahkan ke `…/payment-webhook` yang sama seperti Midtrans; set `LYNK_WEBHOOK_SECRET` di produksi.

Detail: [CHECKOUT_GATEWAY_LYNK.md](./CHECKOUT_GATEWAY_LYNK.md).

### D. Supabase (produksi)

**Tujuan:** database, auth, dan Edge Functions berjalan di cloud.

**Langkah ringkas:**

1. Jalankan migrasi database (`supabase db push` atau lewat CI) — atau skrip `./scripts/supabase-bootstrap.sh` dari root repo.
2. Deploy semua function yang dipakai (`supabase functions deploy ...` atau skrip yang sama).
3. Tinjau **Row Level Security (RLS)** untuk tabel sensitif (sudah di migrasi; pastikan migrasi terbaru ter-push).

### E. Cron / tugas terjadwal (`scheduled-ops`)

**Tujuan:** tugas harian/mingguan (mis. komisi afiliasi) jalan otomatis.

**Langkah ringkas:**

1. Buat secret `CRON_SECRET` (string panjang acak).
2. Di Supabase, jadwalkan pemanggilan function `scheduled-ops` dengan header  
   `Authorization: Bearer <CRON_SECRET>`  
   (atau header alternatif sesuai kode.)

### F. Code signing & notarisasi macOS

**Tujuan:** pengguna tidak mendapat peringatan “developer tidak dikenal”.

**Langkah ringkas:** ikuti [docs/RELEASE_MACOS.md](RELEASE_MACOS.md) dan program [Apple Developer](https://developer.apple.com/programs/).

### G. GitHub Actions (opsional)

**Tujuan:** build otomatis setiap merge ke branch utama.

**Langkah ringkas:** workflow = tes → `cargo check` / `cargo test` → build Tauri → sign → unggah artefak. Lihat [tauri-action](https://github.com/tauri-apps/tauri-action).

### H. Analytics (PostHog / GA) — opsional

**Tujuan:** mengukur kunjungan dan konversi **dengan izin pengguna** sesuai kebijakan produk.

### I. Sentry — opsional

**Tujuan:** melacak error di produksi; aktifkan hanya jika kebijakan privasi mengizinkan dan ada consent.

### J. Saluran distribusi

**Tujuan:** memutuskan DMG langsung, Mac App Store, atau Setapp — masing-masing punya aturan sandbox dan entitlement berbeda.

---

## Untuk developer: perintah pengecekan cepat di mesin lokal

Jalankan dari folder root proyek `macfyi` (bukan dipisah koma):

```bash
cd /path/ke/macfyi
npx tsc --noEmit
npm run test
npm run build
cd src-tauri && cargo test --lib && cargo clippy && cargo check
```

**Catatan:** ESLint belum dikonfigurasi di root (`eslint.config.js` belum ada); `npx eslint src/` baru bermakna setelah file itu ditambahkan.

---

## Pengukuran cold start (performa nyata)

Tujuan: membedakan **waktu sampai splash hilang** vs **waktu sampai UI pertama responsif**, dan dampak prefetch Smart Care (sekarang **ditunda sampai interaksi pertama** — klik atau tombol keyboard — setelah boot).

1. **Log cepat di dev** — di `src/App.tsx`, boot menandai `setAppBootReady(true)` setelah disk + percobaan `public-config` + jeda minimum splash (~750 ms). Anda bisa menambah sementara `console.debug("[boot]", performance.now(), ...)` di titik tersebut (hapus sebelum rilis) atau memakai **Performance** tab di DevTools (Tauri WebView).
2. **Instruments (Time Profiler)** — profil proses app saat cold launch; catat waktu sampai main thread “idle” setelah window tampil.
3. **Checklist QA manual** — tanpa jaringan: pastikan banner biru *public-config* muncul (salinan offline-first) dan **Retry** berhasil saat server kembali; pastikan ringkasan Smart Care tidak memicu prefetch berat sebelum pengguna menyentuh layar/keyboard.

---

## Istilah singkat (glosarium)

| Istilah | Arti sederhana |
|---------|----------------|
| **Supabase** | Layanan backend (database + function) di internet tempat Macfyi bisa ambil konfigurasi atau proses pembayaran. |
| **Edge Function** | Program kecil yang jalan di server Supabase saat ada HTTP request (webhook pembayaran, dll.). |
| **Webhook** | Panggilan otomatis dari Midtrans/Lynk ke server Anda: “pembayaran ini sudah berhasil”. |
| **Sandbox** | Mode uji pembayaran dengan kartu uji — bukan uang sungguhan. |
| **Secret** | Kunci API / password yang disimpan aman di dashboard, bukan di kode. |
| **FDA (Full Disk Access)** | Izin macOS agar aplikasi bisa membaca banyak folder sistem untuk ukuran file yang akurat. |

---

## Nama file export Disk Explorer

Laporan diekspor ke folder **Download** dengan pola nama:

`macfyi-disk-report-{tanggal-waktu}.{json atau txt}`

Contoh: `macfyi-disk-report-20260420-143022.json`.

---

## Modal “Buka Macfyi Pro” setelah bersih

- Angka ruang yang dibebaskan (**misalnya 1,2 GB**) sekarang diambil dari **hasil bersih sesi terakhir** di Mac Anda (bukan angka tetap seperti “3,2 GB”).
- **Admin** bisa mengatur teks lewat Supabase → `platform_settings` (kunci `desktop.upgrade_paywall.*`) dan halaman admin **Marketing**; setelah simpan, app memuat ulang lewat **public-config** (bisa butuh ~setengah menit karena cache).
- Jika admin mematikan `use_session_clean_amount`, subjudul memakai teks generik / marketing yang Anda isi, **tanpa** memakai angka dari sesi.

---

*Terakhir disesuaikan untuk pembaca Indonesia dan langkah-langkah yang lebih mudah diikuti.*
