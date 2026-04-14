-- Refresh blok "penjelasan detail produk" di landing: 4 fitur + URL gambar statis /landing/detail-*.png
-- Gambar harus ikut di-deploy (folder public/landing pada build Vite). Untuk URL Storage publik, unggah via admin lalu Publikasikan.

UPDATE public.landing_site_content
SET
  content = jsonb_set(
    COALESCE(content, '{}'::jsonb),
    '{details}',
    $json$
[
  {
    "id": 1,
    "title": "Deep Scan — Ketemu Penyebab Storage Penuh dalam Menit",
    "p1": "Macfyi memetakan folder dan file yang paling “berat”, jadi Anda tidak perlu bongkar satu-satu secara manual. Anda langsung tahu harus mulai dari mana untuk hasil paling terasa.",
    "bullets": [
      "Fokus ke yang paling berdampak",
      "Tidak perlu tebak-tebakan",
      "Lebih cepat ambil keputusan"
    ],
    "image": "/landing/detail-01-deep-scan.png"
  },
  {
    "id": 2,
    "title": "Safe Cleaning — Bersih-bersih Tanpa Deg-degan",
    "p1": "Macfyi memberi penanda “aman dibersihkan” dan “perlu dicek dulu”, sehingga Anda lebih yakin saat menghapus. Anda tetap review dulu sebelum aksi, jadi kontrol ada di tangan Anda.",
    "bullets": [
      "Ada penanda kehati-hatian yang jelas",
      "Anda tetap review sebelum hapus",
      "Mengurangi risiko salah hapus file penting"
    ],
    "image": "/landing/detail-02-safe-cleaning.png"
  },
  {
    "id": 3,
    "title": "Complete Uninstall — Hapus Aplikasi Sampai Benar-benar Rapi",
    "p1": "Menghapus aplikasi sering meninggalkan sisa file yang diam-diam memakan ruang. Macfyi membantu Anda membereskan sisa-sisa itu, supaya storage tidak cepat penuh lagi.",
    "bullets": [
      "Aplikasi hilang, sisa file ikut beres",
      "Storage lebih rapi dari waktu ke waktu",
      "Mengurangi “sampah” tersembunyi setelah uninstall"
    ],
    "image": "/landing/detail-03-complete-uninstall.png"
  },
  {
    "id": 4,
    "title": "RAM Optimization — Mac Terasa Lebih Ringan Saat Dipakai",
    "p1": "Saat Mac terasa berat, bukan cuma storage yang jadi penyebab. Macfyi membantu Anda melihat apa yang paling membebani memori, supaya Anda bisa menutup atau merapikan yang tidak perlu.",
    "bullets": [
      "Tahu aplikasi mana yang paling membebani RAM",
      "Bantu kurangi beban saat kerja multitasking",
      "Mac lebih nyaman dipakai untuk aktivitas harian"
    ],
    "image": "/landing/detail-04-ram-optimization.png"
  }
]
$json$::jsonb
  ),
  updated_at = now()
WHERE id = 'default';
