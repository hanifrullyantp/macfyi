#!/usr/bin/env node
/**
 * Hapus baris seed demo (id visitor tetap). Dev only.
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
};

async function main() {
  const v = ["demo_visitor_alpha", "demo_visitor_beta"].join(",");
  const res = await fetch(`${url}/rest/v1/crm_contacts?visitor_id=in.(${v})`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }

  const titleEnc = encodeURIComponent("[Demo] Selamat datang affiliate");
  const a = await fetch(`${url}/rest/v1/announcements?title=eq.${titleEnc}`, {
    method: "DELETE",
    headers,
  });
  if (!a.ok) {
    console.error(await a.text());
    process.exit(1);
  }

  console.log("Reset demo selesai.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
