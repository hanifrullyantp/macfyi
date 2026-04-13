#!/usr/bin/env node
/**
 * Buat pengguna Supabase Auth pertama dengan role admin.
 * Hanya jalankan di lingkungan tepercaya (service role = akses penuh DB).
 *
 * Usage:
 *   export SUPABASE_URL="https://xxxx.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Settings → API → service_role
 *   node scripts/create-admin.mjs admin@domain.com passwordKuKuat
 */

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !serviceKey) {
  console.error("Wajib: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const endpoint = `${url}/auth/v1/admin/users`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  }),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

if (!res.ok) {
  console.error("Gagal membuat admin:", res.status, body);
  process.exit(1);
}

console.log("Admin dibuat:", body.user?.id ?? body.id ?? body);
console.log("Login di admin-web / landing penyunting dengan email ini.");
