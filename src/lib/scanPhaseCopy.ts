/** Friendly Indonesian progress lines while scanning (mapped from %). */
export function getDashboardScanPhase(pct: number): { label: string; detail: string } {
  const p = Math.min(100, Math.max(0, pct));
  if (p < 14) {
    return {
      label: "Memeriksa cache aplikasi…",
      detail: "Browser, Xcode, npm, dan lainnya",
    };
  }
  if (p < 30) {
    return {
      label: "Mencari sisa aplikasi yang sudah dihapus…",
      detail: "File yang tertinggal di Library",
    };
  }
  if (p < 46) {
    return {
      label: "Menganalisis folder Downloads…",
      detail: "Installer dan file lama",
    };
  }
  if (p < 62) {
    return {
      label: "Mencari file berukuran besar…",
      detail: "Video, backup, virtual machine",
    };
  }
  if (p < 78) {
    return {
      label: "Memeriksa detail penyimpanan…",
      detail: "Dokumen, media, dan container",
    };
  }
  if (p < 92) {
    return {
      label: "Memeriksa Trash…",
      detail: "File yang belum dikosongkan",
    };
  }
  return {
    label: "Menyiapkan laporan…",
    detail: "Menghitung total dan mengkategorikan",
  };
}
