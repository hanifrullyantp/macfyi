import { GlossaryTerm } from "@/lib/types";

/** Kamus istilah — mode Sederhana (orang awam) & mode Teknis (SMA). */
export const GLOSSARY: GlossaryTerm[] = [
  {
    id: "atom-pusat", term: "Atom Pusat",
    simple: "Atom yang jadi 'tuan rumah' di tengah molekul — semua atom lain menempel padanya.",
    technical: "Atom yang menjadi pusat kerangka molekul tempat semua domain elektron dihitung dalam analisis VSEPR.",
  },
  {
    id: "atom-ligan", term: "Atom Ligan",
    simple: "Atom 'tamu' yang menempel ke atom pusat.",
    technical: "Atom yang terikat langsung pada atom pusat.",
  },
  {
    id: "elektron-valensi", term: "Elektron Valensi",
    simple: "Elektron di 'lapisan terluar' atom — hanya elektron inilah yang dipakai saat atom berikatan.",
    technical: "Elektron pada kulit terluar (tingkat energi tertinggi) suatu atom yang berperan dalam pembentukan ikatan kimia. Jumlahnya sama dengan nomor golongan utama (IA–VIIIA).",
  },
  {
    id: "golongan-unsur", term: "Golongan Unsur",
    simple: "Kolom vertikal di tabel periodik. Unsur segolongan punya jumlah elektron terluar yang sama, jadi sifatnya mirip.",
    technical: "Kolom pada tabel periodik. Untuk golongan utama (A), nomor golongan menentukan jumlah elektron valensi.",
  },
  {
    id: "periode-unsur", term: "Periode Unsur",
    simple: "Baris horizontal di tabel periodik — menunjukkan jumlah kulit elektron atom.",
    technical: "Baris pada tabel periodik yang menunjukkan tingkat energi (kulit elektron) terluar yang terisi.",
  },
  {
    id: "pasangan-elektron", term: "Pasangan Elektron",
    simple: "Dua elektron yang 'berpasangan' dan menempati ruang yang sama di sekitar atom.",
    technical: "Sepasang elektron dengan spin berlawanan yang menempati orbital yang sama.",
  },
  {
    id: "struktur-lewis", term: "Struktur Lewis",
    simple: "Gambar 'peta elektron' molekul: atom digambar dengan titik-titik elektron di sekitarnya, dan pasangan elektron ikatan ditulis sebagai garis.",
    technical: "Diagram yang menggambarkan susunan elektron valensi dalam molekul: pasangan elektron ikatan sebagai garis dan pasangan elektron bebas sebagai titik-titik.",
  },
  {
    id: "pei", term: "PEI — Pasangan Elektron Ikatan",
    simple: "Pasangan elektron yang 'dipakai bersama' dua atom — inilah yang jadi lem perekat antar atom. Digambar sebagai garis ikatan.",
    technical: "Pasangan elektron yang digunakan bersama oleh dua atom untuk membentuk ikatan kovalen. Satu garis ikatan = satu PEI.",
  },
  {
    id: "peb", term: "PEB — Pasangan Elektron Bebas",
    simple: "Pasangan elektron 'milik sendiri' satu atom yang tidak dipakai berikatan. Walaupun tidak kelihatan di bentuk akhir, ia sangat memengaruhi bentuk molekul!",
    technical: "Pasangan elektron valensi yang tidak terlibat dalam ikatan (lone pair). PEB di atom pusat menempati ruang lebih besar dan menolak domain lain lebih kuat daripada PEI.",
  },
  {
    id: "ikatan-kovalen", term: "Ikatan Kovalen",
    simple: "Ikatan yang terjadi saat dua atom 'patungan' memakai pasangan elektron yang sama.",
    technical: "Ikatan kimia yang terbentuk melalui pemakaian bersama pasangan elektron oleh dua atom.",
  },
  {
    id: "ikatan-rangkap", term: "Ikatan Rangkap",
    simple: "Saat dua atom patungan 2 pasang elektron sekaligus (rangkap dua, digambar dua garis) atau 3 pasang (rangkap tiga). Lebih kuat dan lebih pendek dari ikatan tunggal.",
    technical: "Ikatan kovalen dengan dua (σ+π) atau tiga (σ+2π) pasangan elektron bersama. Dalam VSEPR, ikatan rangkap dihitung sebagai SATU domain elektron.",
  },
  {
    id: "aturan-oktet", term: "Aturan Oktet",
    simple: "Atom cenderung ingin punya 8 elektron di kulit terluarnya (seperti gas mulia). Untuk itu mereka patungan elektron lewat ikatan.",
    technical: "Kecenderungan atom mencapai konfigurasi 8 elektron valensi (ns²np⁶). Pengecualian umum: H (duplet), Be (4), B/Al (6), dan perluasan oktet pada periode ≥3 (P, S, Cl, Xe).",
  },
  {
    id: "domain-elektron", term: "Domain Elektron",
    simple: "Satu 'wilayah ruang' berisi pasangan elektron di sekitar atom pusat. Satu ikatan (tunggal ATAU rangkap) = 1 domain; satu PEB = 1 domain.",
    technical: "Daerah di sekitar atom pusat yang ditempati sepasang (atau lebih, pada ikatan rangkap) elektron; tiap ikatan kovalen dan tiap PEB masing-masing dihitung satu domain.",
  },
  {
    id: "domain-elektron-pusat", term: "Domain Elektron di Atom Pusat",
    simple: "PENTING: yang menentukan bentuk molekul HANYA domain di sekitar atom pusat. PEB milik atom ligan tidak ikut menghitung.",
    technical: "Menurut VSEPR, geometri molekul hanya ditentukan oleh domain elektron (PEI + PEB) pada atom pusat; pasangan bebas pada atom ligan diabaikan.",
  },
  {
    id: "vsepr", term: "Teori VSEPR",
    simple: "Ide sederhana: pasangan elektron di sekitar atom pusat sama-sama bermuatan negatif, jadi mereka saling tolak sampai posisinya paling berjauhan — posisi itulah yang menentukan bentuk molekul.",
    technical: "Valence Shell Electron Pair Repulsion: domain elektron di sekitar atom pusat menyusun diri meminimalkan energi tolak-menolak, menghasilkan geometri elektron tertentu.",
  },
  {
    id: "tolakan-elektron", term: "Tolak-menolak Elektron",
    simple: "Elektron sama-sama bermuatan negatif, seperti kutub magnet yang sama — kalau didekatkan, mereka saling dorong menjauh.",
    technical: "Interaksi repulsif Coulomb antar domain elektron. Urutan kekuatan: PEB–PEB > PEB–PEI > PEI–PEI.",
  },
  {
    id: "bilangan-sterik", term: "Bilangan Sterik (Steric Number)",
    simple: "Jumlah total domain di atom pusat = (jumlah ikatan) + (jumlah PEB pusat). Angka ini menentukan 'kerangka dasar' bentuk molekul.",
    technical: "Steric number = jumlah domain ikatan + jumlah pasangan elektron bebas pada atom pusat (SN 2–6 → linear, trigonal planar, tetrahedral, trigonal bipiramidal, oktahedral).",
  },
  {
    id: "geometri-elektron", term: "Geometri Elektron",
    simple: "Bentuk kerangka SELURUH domain elektron (ikatan + pasangan bebas) di sekitar atom pusat, sebelum kita 'menyembunyikan' pasangan bebas.",
    technical: "Susunan ruang semua domain elektron (binding maupun non-binding) di sekitar atom pusat berdasarkan bilangan sterik.",
  },
  {
    id: "geometri-molekul", term: "Bentuk Molekul (Geometri Molekul)",
    simple: "Bentuk yang terlihat jika kita hanya melihat susunan ATOMNYA saja (pasangan elektron bebas dianggap tak terlihat, tapi pengaruhnya tetap ada).",
    technical: "Susunan ruang inti atom dalam molekul — geometri elektron dikurangi posisi yang ditempati PEB.",
  },
  {
    id: "sudut-ikatan", term: "Sudut Ikatan",
    simple: "Besar sudut antara dua ikatan yang bertemu di atom pusat.",
    technical: "Sudut yang dibentuk oleh dua ikatan kovalen dengan atom pusat sebagai titik sudut. PEB memperkecil sudut ikatan ideal.",
  },
  {
    id: "notasi-axe", term: "Notasi AXE",
    simple: "Singkatan bentuk molekul: A = atom pusat, X = atom yang menempel, E = pasangan elektron bebas. Contoh: AX₂E₂ untuk air.",
    technical: "Notasi VSEPR: A (atom pusat), Xₙ (n ligan terikat), Eₘ (m PEB di pusat).",
  },
  {
    id: "polaritas", term: "Polaritas Molekul",
    simple: "Apakah molekul punya 'kutub positif-negatif' (polar, seperti magnet kecil) atau tarikannya seimbang sempurna (nonpolar).",
    technical: "Ditentukan oleh momen dipol total: bergantung pada keelektronegatifan atom DAN kesimetrisan bentuk molekul.",
  },
  {
    id: "elektronegativitas", term: "Keelektronegatifan",
    simple: "Seberapa 'rakus' sebuah atom menarik elektron ikatan ke arah dirinya.",
    technical: "Kecenderungan relatif atom menarik rapatan elektron ikatan (skala Pauling; F = 3,98 tertinggi).",
  },
  {
    id: "resonansi", term: "Resonansi",
    simple: "Saat satu molekul tidak bisa digambar hanya dengan satu struktur Lewis — gambarnya 'berpindah-pindah' padahal molekul aslinya satu dan tetap.",
    technical: "Kondisi ketika struktur Lewis sebenarnya merupakan hibrida dari beberapa struktur resonansi yang setara.",
  },
  {
    id: "tabel-periodik", term: "Tabel Periodik Unsur",
    simple: "Peta semua unsur kimia, disusun rapi berdasarkan nomor atom — kolomnya (golongan) menentukan berapa elektron terluar yang dipunya tiap unsur.",
    technical: "Susunan sistematis unsur berdasarkan nomor atom yang merefleksikan konfigurasi elektron; menjadi dasar prediksi elektron valensi.",
  },
];

const BY_ID = new Map(GLOSSARY.map((t) => [t.id, t]));
export function getTerm(id: string): GlossaryTerm | undefined {
  return BY_ID.get(id);
}
