// Toggle di sini untuk switch antara UI lama dan baru.
// true = pakai UI baru, false = pakai UI lama.
export const FEATURE_FLAGS = {
  // Summary panel compact (donut chart interaktif)
  USE_COMPACT_SUMMARY_PANEL: true,

  // Dashboard layout baru (belum dipakai)
  USE_NEW_DASHBOARD_LAYOUT: false,

  // Deep scan menu baru (belum dipakai)
  USE_DEEP_SCAN_MENU: false,
} as const;
