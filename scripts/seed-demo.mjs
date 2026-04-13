#!/usr/bin/env node
/**
 * Data demo CRM / pengumuman (dev). Wajib service role.
 * Usage:
 *   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *   NODE_ENV=development node scripts/seed-demo.mjs
 */

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.NODE_ENV !== "development" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Tolak: set NODE_ENV=development atau ALLOW_DEMO_SEED=true");
  process.exit(1);
}
if (!url || !key) {
  console.error("Wajib SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function post(table, rows) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${table} ${res.status}: ${t}`);
  }
}

try {
  await post("crm_contacts", [
    {
      visitor_id: "demo_visitor_alpha",
      stage: "interested",
      source: "demo_seed",
      display_name: "Demo Lead A",
      email: "demo-a@example.invalid",
      metadata: { note: "seed-demo.mjs" },
    },
    {
      visitor_id: "demo_visitor_beta",
      stage: "payment_pending",
      source: "demo_seed",
      display_name: "Demo Lead B",
      email: "demo-b@example.invalid",
    },
  ]);

  await post("announcements", [
    {
      title: "[Demo] Selamat datang affiliate",
      content: "Ini pengumuman contoh dari seed-demo.mjs — hapus di produksi.",
      type: "info",
      audience: "affiliate",
      pinned: true,
    },
  ]);

  console.log("Seed demo selesai (crm_contacts + announcements).");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
