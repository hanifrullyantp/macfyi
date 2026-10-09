// Gunakan: npx tsx scripts/seedAdmin.ts
// Pastikan SUPABASE_SERVICE_ROLE_KEY ada di .env (tidak ter-expose di client)

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedAdmin() {
  console.log("Memulai seeding admin...");
  const email = "hanif.rullyant@gmail.com";
  const password = "syantique";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already registered")) {
      console.log("Email sudah terdaftar, mencoba update role...");
      // Ambil user ID jika sudah ada
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existing = users.users.find(u => u.email === email);
      if (existing) {
        await supabaseAdmin.from("profiles").upsert({
          id: existing.id,
          email,
          full_name: "Admin Utama",
          role: "admin",
        });
        console.log("Role admin berhasil di-update untuk:", existing.id);
      }
    } else {
      throw error;
    }
  } else {
    await supabaseAdmin.from("profiles").insert({
      id: data.user.id,
      email,
      full_name: "Admin Utama",
      role: "admin",
    });
    console.log("Admin baru berhasil dibuat:", data.user.id);
  }
  console.log("PENTING: Segera ganti password 'syantique' setelah login!");
}

seedAdmin().catch(console.error);
