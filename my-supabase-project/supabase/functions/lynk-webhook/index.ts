// Supabase Edge Function: lynk-webhook
// Handles Lynk.id webhook event `payment.received`.
// - Creates/invites user (if needed)
// - Records order (best effort)
// - Updates membership in public.user_plans (monthly/lifetime) with renewal rules
// - Sends confirmation email (optional, via Resend)
//
// Required env vars (Supabase Edge Function Settings):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// Optional env vars:
// - LYNK_SIGNATURE_TOKEN          (if set, webhook must include header X-Lynk-Signature exactly equal to this token)
// - RESEND_API_KEY                (if set, sends confirmation email via Resend)
// - RESEND_FROM_EMAIL             (e.g. "Monefyi <no-reply@monefyi.com>")
// - APP_URL                       (default: https://app.monefyi.com)
// - MONTHLY_DAYS                  (default: 30)
//
// Notes:
// - Do NOT call resetPasswordForEmail here (by requirement).
// - inviteUserByEmail sends Supabase invitation email to new users.
// - For existing users, we do not modify password.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toISO(dt: Date) {
  return dt.toISOString();
}

function toDateOnlyISO(dt: Date) {
  return dt.toISOString().slice(0, 10);
}

function parseQty(item: any): number {
  const q = Number(item?.qty ?? 1);
  if (!Number.isFinite(q) || q <= 0) return 1;
  return Math.floor(q);
}

function mapPackageFromItem(item: any) {
  const title = String(item?.title ?? "").toLowerCase();
  if (title.includes("lifetime")) {
    return { planType: "lifetime" as const, durationDays: null as number | null, productLabel: "Lifetime" };
  }
  // default monthly
  return { planType: "monthly" as const, durationDays: Number(pickEnv("MONTHLY_DAYS", "30")) || 30, productLabel: "Bulanan" };
}

function moneyIDR(n: number) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("id-ID").format(v);
}

async function sendEmailViaResend(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = pickEnv("RESEND_API_KEY", "");
  const from = pickEnv("RESEND_FROM_EMAIL", "");

  console.log("📧 Email send attempt:", {
    to: params.to,
    from: from || "(not set)",
    subject: params.subject,
    apiKeyPresent: !!apiKey,
  });

  if (!apiKey || !from) {
    console.warn("⚠️ RESEND_API_KEY or RESEND_FROM_EMAIL not configured - email skipped");
    return { ok: false, skipped: true, reason: "RESEND not configured" };
  }

  if (!params.to || !params.to.includes("@")) {
    console.error("❌ Invalid recipient email:", params.to);
    return { ok: false, skipped: true, reason: "Invalid recipient email format" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  const txt = await res.text().catch(() => "");

  console.log("📬 Resend API response:", {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    bodySnippet: txt.slice(0, 400),
  });

  if (!res.ok) {
    return { ok: false, skipped: false, reason: `Resend error ${res.status}: ${txt.slice(0, 400)}` };
  }
  return { ok: true, skipped: false };
}

function buildConfirmationEmail(opts: {
  appUrl: string;
  name: string;
  email: string;
  planType: "monthly" | "lifetime";
  qty: number;
  amount: number;
  startISO: string | null;
  endISO: string | null;
  isNewUser: boolean;
  generatedPassword: string | null;
}) {
  const intro = `Hi ${opts.name || ""},<br/><br/>Terima kasih sudah melakukan pembayaran di Monefyi.`;

  let planInfo = "";
  if (opts.planType === "lifetime") {
    planInfo = `
      <b>Paket:</b> Lifetime<br/>
      <b>Masa aktif:</b> Selamanya (tanpa tanggal kadaluarsa, selama layanan Monefyi berjalan).<br/>
    `;
  } else {
  const startStr = opts.startISO ?? "-";
  const endStr = opts.endISO ?? "-";

  planInfo = `
      <b>Paket:</b> Bulanan (1 bulan) × ${opts.qty}<br/>
      <b>Masa aktif:</b> ${startStr} s/d ${endStr}<br/>
      Setelah tanggal tersebut, akses akan berhenti jika tidak diperpanjang.<br/>
    `;
}

  const loginInfo = opts.isNewUser
    ? `Akun kamu sudah dibuat. Berikut password untuk login (jangan dibagikan):<br/><br/>
       <div style="padding:10px 12px; border:1px dashed rgba(15,23,42,.20); border-radius:10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px;">${opts.generatedPassword || ''}</div>
       <br/>Silakan login di <a href="${opts.appUrl}">${opts.appUrl}</a> menggunakan email ini dan password di atas.`
    : `Akun kamu sudah aktif. Kamu bisa login dengan email & password yang sama (password tidak berubah).`;

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; line-height:1.5; color:#0f172a">
    <h2 style="margin:0 0 8px;">Konfirmasi Pembayaran Monefyi</h2>
    <div style="color:#334155; font-size:14px;">${intro}</div>
    <div style="margin-top:14px; padding:12px 14px; border:1px solid rgba(15,23,42,.12); border-radius:12px;">
      ${planInfo}
      <b>Total pembayaran:</b> Rp ${moneyIDR(opts.amount)}<br/>
    </div>
    <div style="margin-top:14px; font-size:14px; color:#334155;">
      ${loginInfo}
    </div>
    <div style="margin-top:16px;">
      <a href="${opts.appUrl}" style="display:inline-block; padding:10px 14px; background:#10b981; color:white; text-decoration:none; border-radius:10px; font-weight:700;">Buka Monefyi App</a>
    </div>
    <div style="margin-top:14px; font-size:12px; color:#64748b;">Jika ada kendala login, gunakan fitur “Lupa password” di aplikasi.</div>
  </div>
  `;

  return {
    subject: "Konfirmasi Pembayaran Monefyi",
    html,
  };
}

serve(async (req) => {
  console.log("🔔 Webhook received:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  // Optional signature check (token-based)
  const expectedSig = pickEnv("LYNK_SIGNATURE_TOKEN", "");
  if (expectedSig) {
    const got = (req.headers.get("X-Lynk-Signature") || "").trim();
    if (!got || got !== expectedSig) {
      console.error("❌ Invalid signature:", { expected: expectedSig, got });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: jsonHeaders });
    }
  }

  const SUPABASE_URL = pickEnv("SUPABASE_URL");
  const SERVICE_ROLE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), { status: 500, headers: jsonHeaders });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  console.log("🔧 Supabase client initialized");

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400, headers: jsonHeaders });
  }

  console.log("📦 Webhook payload:", JSON.stringify(payload, null, 2));

  const event = payload?.event;
  const data = payload?.data;
  const messageAction = String(data?.message_action || "");
  const messageCode = String(data?.message_code ?? "");
  const messageId = String(data?.message_id || "");
  const messageData = data?.message_data;

  console.log("🔍 Event details:", { event, messageAction, messageCode, messageId });

  // IMPORTANT FIX:
  // Hanya cek event & message_action.
  // Jangan pakai message_code, karena dari log nilainya kosong ("").
  if (event !== "payment.received" || messageAction !== "SUCCESS") {
    console.log("⏭️ Skipping: not a successful payment event (based on event/action)");
    return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers: jsonHeaders });
  }

  const refId = String(messageData?.refId || messageData?.ref_id || "");
  const createdAt = String(messageData?.createdAt || messageData?.created_at || "");

  // IMPORTANT FIX:
  // Sesuaikan dengan payload Lynk: customer_email / customer_name / customer_phone
  const customerEmail = String(
    messageData?.customer?.email ??
    messageData?.customer_email ??
    messageData?.email ??
    ""
  ).trim().toLowerCase();

  const customerName = String(
    messageData?.customer?.name ??
    messageData?.customer_name ??
    ""
  ).trim();

  const customerPhone = String(
    messageData?.customer?.phone ??
    messageData?.customer_phone ??
    ""
  ).trim();

  console.log("👤 Customer info:", { customerEmail, customerName, customerPhone });

  const item = (messageData?.items?.[0]) ?? {};
  const qty = parseQty(item);
  const totals = messageData?.totals || {};
  const amount = Number(totals?.customerPay ?? totals?.grandTotal ?? totals?.totalPrice ?? 0) || 0;

  console.log("🧾 Order basic:", { refId, createdAt, qty, amount, itemTitle: item?.title });

  if (!customerEmail) {
    console.error("❌ Missing customer email after mapping");
    return new Response(JSON.stringify({ error: "Missing customer email" }), { status: 400, headers: jsonHeaders });
  }

  // 1) Idempotency guard
  let alreadyProcessed = false;
  try {
    const { data: ins, error } = await supa
      .from("lynk_webhook_events")
      .insert({ message_id: messageId || null, ref_id: refId || null, email: customerEmail, payload })
      .select("id")
      .maybeSingle();

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        alreadyProcessed = true;
        console.log("⚠️ Already processed (duplicate message_id/ref_id)");
      }
    } else {
      console.log("✅ Idempotency record inserted:", ins);
    }
  } catch (err) {
    console.warn("⚠️ Idempotency insert error (ignored):", err.message);
  }

  if (alreadyProcessed) {
    return new Response(JSON.stringify({ ok: true, alreadyProcessed: true }), { status: 200, headers: jsonHeaders });
  }

  // 2) Ensure user exists (do NOT reset password)
  let userId = "";
  let isNewUser = false;
  let generatedPassword: string | null = null;

  const appUrl = pickEnv("APP_URL", "https://app.monefyi.com");

  console.log("👥 Looking for existing user:", customerEmail);

  const perPage = 200;
  let page = 1;
  while (!userId && page <= 50) {
    const list = await supa.auth.admin.listUsers({ page, perPage });
    if (list.error) {
      console.error("❌ listUsers error:", list.error);
      break;
    }
    const users = list.data?.users || [];
    const u = users.find((x) => String(x.email || "").toLowerCase() === customerEmail);
    if (u?.id) {
      userId = u.id;
      console.log("✅ Existing user found:", userId);
      break;
    }
    if (users.length < perPage) break;
    page++;
  }

  if (!userId) {
    console.log("🆕 Creating new user with random password...");
    const pw = crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "A!";
    generatedPassword = pw;

    const createRes = await supa.auth.admin.createUser({
      email: customerEmail,
      password: pw,
      email_confirm: true,
      user_metadata: { name: customerName, phone: customerPhone },
    });

    if (createRes.error || !createRes.data?.user?.id) {
      console.error("❌ Failed to create user:", createRes.error);
      return new Response(JSON.stringify({ error: "Failed to create user" }), { status: 500, headers: jsonHeaders });
    }

    userId = createRes.data.user.id;
    isNewUser = true;
    console.log("✅ New user created:", userId);
  }

  // 3) Record order (best effort)
  const orderRow = {
    ref_id: refId || null,
    email: customerEmail,
    name: customerName,
    phone: customerPhone,
    item_title: String(item?.title || ""),
    qty,
    amount,
    created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
    raw_payload: payload,
  };

  try {
    const r1 = await supa.from("orders").insert(orderRow);
    if (r1.error) {
      console.warn("⚠️ Insert into orders failed, trying lynk_orders:", r1.error.message);
      await supa.from("lynk_orders").insert(orderRow);
    } else {
      console.log("✅ Order saved to orders");
    }
  } catch (err) {
    console.warn("⚠️ Order insert exception (orders), trying lynk_orders:", err.message);
    try {
      await supa.from("lynk_orders").insert(orderRow);
      console.log("✅ Order saved to lynk_orders");
    } catch (err2) {
      console.error("❌ Failed to save order:", err2.message);
    }
  }

  // 4) Update membership (user_plans)
  const { planType, durationDays, productLabel } = mapPackageFromItem(item);
  console.log("📦 Plan mapping:", { planType, durationDays, productLabel });

  const { data: currentPlan } = await supa
    .from("user_plans")
    .select("user_id, plan_type, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("📊 Current user_plan:", currentPlan);

  const now = new Date();
  const currentType = String(currentPlan?.plan_type || "none");
  const currentExpires = currentPlan?.expires_at ? new Date(String(currentPlan.expires_at)) : null;

  let finalPlanType: "monthly" | "lifetime" | "none" =
    currentType === "lifetime" || currentType === "monthly" ? (currentType as any) : "none";
  let finalExpiresAt: Date | null = currentExpires;

  let startDateForEmail: Date | null = null;
  let endDateForEmail: Date | null = null;

  if (planType === "lifetime") {
    if (currentType !== "lifetime") {
      console.log("⬆️ Upgrading to lifetime");
      finalPlanType = "lifetime";
      finalExpiresAt = null;

      await supa.from("user_plans").upsert({
        user_id: userId,
        plan_type: "lifetime",
        expires_at: null,
        updated_at: new Date().toISOString(),
      });

      console.log("✅ Lifetime plan set");
    } else {
      console.log("ℹ️ Already lifetime, membership unchanged");
    }
    startDateForEmail = null;
    endDateForEmail = null;
  } else {
    // monthly
    if (currentType === "lifetime") {
      console.log("ℹ️ User has lifetime, ignore monthly for membership");
      finalPlanType = "lifetime";
      finalExpiresAt = null;
    } else {
      const addDaysCount = (durationDays || 30) * Math.max(1, qty);
      let baseDate = now;
      if (currentType === "monthly" && currentExpires && currentExpires.getTime() > now.getTime()) {
        baseDate = currentExpires;
        console.log("🔄 Extending from existing expiry:", toDateOnlyISO(baseDate));
      } else {
        console.log("🆕 New monthly from today:", toDateOnlyISO(now));
      }
      const newExpires = addDays(baseDate, addDaysCount);

      finalPlanType = "monthly";
      finalExpiresAt = newExpires;

      await supa.from("user_plans").upsert({
        user_id: userId,
        plan_type: "monthly",
        expires_at: newExpires.toISOString(),
        updated_at: new Date().toISOString(),
      });

      console.log("✅ Monthly plan updated:", {
        from: toDateOnlyISO(baseDate === currentExpires ? baseDate : now),
        to: toDateOnlyISO(newExpires),
      });

      startDateForEmail = baseDate === currentExpires ? baseDate : now;
      endDateForEmail = newExpires;
    }
  }

  // 5) Send confirmation email
  console.log("📧 Building confirmation email...");

  // Tipe plan untuk email = status membership akhir (user_plans),
// bukan hanya produk yang baru dibeli.
const emailPlanType: "monthly" | "lifetime" =
  finalPlanType === "lifetime" ? "lifetime" : "monthly";

const mail = buildConfirmationEmail({
  appUrl,
  name: customerName || "",
  email: customerEmail,
  planType: emailPlanType,
  qty,
  amount,
  // Hanya kirim tanggal kalau memang monthly & tanggalnya ada
  startISO:
    emailPlanType === "monthly" && startDateForEmail
      ? toDateOnlyISO(startDateForEmail)
      : null,
  endISO:
    emailPlanType === "monthly" && endDateForEmail
      ? toDateOnlyISO(endDateForEmail)
      : null,
  isNewUser,
  generatedPassword,
});

  const emailRes = await sendEmailViaResend({
    to: customerEmail,
    subject: mail.subject,
    html: mail.html,
  });

  console.log("📬 Email result:", emailRes);

  return new Response(
    JSON.stringify({
      ok: true,
      userId,
      isNewUser,
      plan: { planType: finalPlanType, expiresAt: finalExpiresAt ? toISO(finalExpiresAt) : null },
      email: { sent: emailRes.ok, skipped: emailRes.skipped || false, reason: (emailRes as any).reason || null },
    }),
    { status: 200, headers: jsonHeaders },
  );
});