/**
 * Konfigurasi Monefyi — sesuaikan sebelum deploy.
 * Jangan commit service_role key; anon key aman di klien jika RLS Supabase ketat.
 */
(function () {
  window.MONEFYI_CONFIG = {
    supabaseUrl: "https://zzwqfmdyncxbolestkqp.supabase.co",
    supabaseAnonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FmbWR5bmN4Ym9sZXN0a3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI3OTQsImV4cCI6MjA4MTkxODc5NH0.qtvqzDicRmIixFh3A46ExuitpAXDWaYHmB7NVBxsc7w",
    fnParse: "asfin-parse-transaction",
    fnCoach: "ai-user-coach",
    checkoutMonthly: "https://lynk.id/asfin-ai/9zexz9z5wom1/checkout",
    checkoutLifetime: "https://lynk.id/asfin-ai/j3q0x5ke3g49/checkout",
    adminEmails: ["admin@asfin.app"],
    /** Deploy di subpath? Contoh: '/monefyi' (tanpa slash akhir). Kosongkan jika di root domain. */
    basePath: "",
  };
})();
