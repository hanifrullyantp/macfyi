/**
 * Feature flags produk. Auth dibangun penuh namun dinonaktifkan —
 * seluruh pengguna berjalan sebagai "guest" dengan sesi lokal.
 */
export const FEATURES = {
  AUTH_ENABLED: false,
  TEACHER_DASHBOARD_REQUIRES_AUTH: true,
  NARRATION_ENABLED_BY_DEFAULT: true,
  SIMPLE_LANGUAGE_MODE_DEFAULT: true,
} as const;
