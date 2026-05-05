/** Judul halaman admin (breadcrumb, judul dokumen opsional). */
export const ADMIN_PAGE_TITLE: Record<string, string> = {
  "/dashboard": "Dasbor",
  "/analytics": "Analitik",
  "/live": "Aktivitas langsung",
  "/licenses": "Lisensi",
  "/transactions": "Transaksi",
  "/promo-pricing": "Promo & harga",
  "/affiliates": "Afiliasi",
  "/withdrawals": "Penarikan",
  "/crm": "CRM",
  "/landing": "Halaman utama",
  "/app-settings": "Pengaturan aplikasi",
  "/platform": "Pengaturan platform",
  "/api-keys": "API Keys",
  "/marketing": "Marketing",
  "/releases": "Releases",
  "/events": "Promo events",
  "/wa-templates": "Template WhatsApp",
  "/announcements": "Pengumuman",
  "/edge-functions": "Edge monitor",
  "/logs": "Log sistem",
  "/admin-users": "Admin sistem",
};

export function getAdminPageTitle(pathname: string): string {
  const base = pathname.split("?")[0] ?? pathname;
  return ADMIN_PAGE_TITLE[base] ?? "Halaman";
}
