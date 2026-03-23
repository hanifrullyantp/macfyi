// Supabase Edge Function: ai-user-coach
// -------------------------------------
// - User-facing AI financial coach (chat)
// - Validates user via JWT (Authorization: Bearer <access_token>)
// - Ambil data finansial user (transactions, budgets) dari Postgres
// - Kirim ringkasan + pertanyaan user ke Gemini
// - Kembalikan: { reply: string, meta?: object }
//
// PENTING:
// - API key Gemini diambil dari public.profiles.gemini_key (satu key per user).
// - Frontend HARUS mengirim Authorization: Bearer <access_token>.
//
// Env yang dibutuhkan (Supabase Function Settings):
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY
//
// Catatan:
// - Fungsi ini tidak menyentuh password user.
// - checkQuota masih stub (bisa diisi limit harian nanti).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const corsHeaders = {
  // Produksi: sebaiknya ganti ke "https://app.monefyi.com"
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

function endOfMonth(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59),
  );
}

function sumByType(rows: any[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const amt = Number(r.amount || 0);
    if (r.type === "income") income += amt;
    if (r.type === "expense") expense += amt;
  }
  return { income, expense, net: income - expense };
}

function groupExpenseByCategory(rows: any[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "expense") continue;
    const cat = String(r.category || "Lainnya");
    map.set(cat, (map.get(cat) || 0) + Number(r.amount || 0));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// Stub kuota; bisa diisi nanti kalau mau limit harian pemakaian AI
async function checkQuota(_userId: string) {
  return { ok: true, remaining: null, limit: null, used: null };
}

type PromptSummary = {
  periodLabel: string;
  kpi: { income: string; expense: string; net: string };
  topCategories: { category: string; amount: string }[];
  topLarge: {
    date: string;
    category: string;
    amount: string;
    merchant?: string | null;
  }[];
  lastTx: {
    date: string;
    type: string;
    category: string;
    amount: string;
  }[];
  budgetMonth: string;
  budgetIncome: string;
  budgetTotal: string;
  budgetRemaining: string;
};

function buildSystemPrompt(summary: PromptSummary) {
  const topCatStr =
    summary.topCategories.length > 0
      ? summary.topCategories
          .map((x) => `${x.category} (${x.amount})`)
          .join(", ")
      : "-";

  const topLargeStr =
    summary.topLarge.length > 0
      ? summary.topLarge
          .map((x) =>
            `${x.date} ${x.category} ${x.amount} ${x.merchant || ""}`.trim(),
          )
          .join(" | ")
      : "-";

  const lastTxStr =
    summary.lastTx.length > 0
      ? summary.lastTx
          .map((x) => `${x.date} ${x.type} ${x.category} ${x.amount}`.trim())
          .join(" | ")
      : "-";

  return `Kamu adalah AI Financial Coach dari Monefyi (asisten keuangan pribadi).

Kamu menerima ringkasan data keuangan user (bukan data mentah lengkap). Gunakan ini untuk menjawab pertanyaan user.

Aturan:
- Jawab dalam Bahasa Indonesia, santai tapi sopan.
- Fokus ke saran praktis, actionable (hemat, budgeting, kebiasaan).
- Jangan beri saran investasi spekulatif, hukum, pajak, atau tindakan berisiko.
- Jangan halu: kalau data kurang, bilang data kurang dan sarankan cara melengkapi.
- Prioritaskan rekomendasi yang masuk akal: utilitas rumah (listrik/air/internet) umumnya 1x/bulan; jangan sarankan "4x bayar" untuk kategori utilitas.
- Jika melihat transaksi/langganan berulang, sarankan evaluasi.
- Berikan jawaban singkat padat (maks 10-14 kalimat) + 3 bullet rekomendasi.
- Jangan mengulang kembali semua data angka. Fokus ke analisis & saran.

Ringkasan (periode: ${summary.periodLabel}):
- Income: ${summary.kpi.income}
- Expense: ${summary.kpi.expense}
- Net: ${summary.kpi.net}
- Top kategori pengeluaran: ${topCatStr}
- Top transaksi besar: ${topLargeStr}
- Transaksi terakhir: ${lastTxStr}
- Budget month: ${summary.budgetMonth} (income budget: ${summary.budgetIncome}, total budget: ${summary.budgetTotal}, remaining: ${summary.budgetRemaining})
`;
}

// ------------------------
// Gemini model detection
// ------------------------

// Prioritas model (id pendek, tanpa prefix "models/")
const MODEL_PRIORITY = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-1.0-pro",
  "gemini-1.0-pro-latest",
  "gemini-pro",
];

async function listAvailableModels(apiKey: string): Promise<string[]> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      apiKey,
    )}`;

  console.log("🔮 [coach] Listing Gemini models:", { url });

  const res = await fetch(url);
  const txt = await res.text().catch(() => "");
  const snippet = txt.slice(0, 400);

  console.log("🔮 [coach] List models response:", {
    status: res.status,
    statusText: res.statusText,
    bodySnippet: snippet,
  });

  if (!res.ok) {
    throw new Error(
      `Gemini list models error ${res.status}: ${snippet}`,
    );
  }

  let data: any;
  try {
    data = JSON.parse(txt);
  } catch {
    throw new Error(
      `Gemini list models JSON invalid: ${snippet}`,
    );
  }

  const models: any[] = data.models || [];
  if (!models.length) {
    throw new Error(
      "Gemini list models: tidak ada model yang tersedia untuk API key ini.",
    );
  }

  const ids = models
    .map((m) => String(m.name || ""))
    .filter((name) => name.startsWith("models/"))
    .map((name) => name.replace(/^models\//, ""));

  console.log("🔮 [coach] Available Gemini model IDs:", ids);

  return ids;
}

function pickBestModel(available: string[]): string {
  for (const target of MODEL_PRIORITY) {
    if (available.includes(target)) return target;
  }

  const anyGemini = available.find((m) => m.toLowerCase().includes("gemini"));
  if (anyGemini) return anyGemini;

  return available[0];
}

/**
 * Panggil Gemini untuk chat (coach).
 * Output: jawaban teks biasa (string).
 */
async function callGeminiChat(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const { apiKey, model, systemPrompt, userPrompt } = params;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  console.log("🔮 [coach] Calling Gemini chat:", { model, url });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        // Kita treat systemPrompt sebagai message terpisah
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 600,
        response_mime_type: "text/plain",
      },
    }),
  });

  const txt = await res.text().catch(() => "");
  const snippet = txt.slice(0, 400);

  console.log("🔮 [coach] Gemini generate response:", {
    model,
    status: res.status,
    statusText: res.statusText,
    bodySnippet: snippet,
  });

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${snippet}`);
  }

  let obj: any = null;
  let outText = "";

  try {
    obj = JSON.parse(txt);
    if (obj?.candidates?.[0]?.content?.parts?.length) {
      outText = obj.candidates[0].content.parts
        .map((p: any) => String(p.text || "").trim())
        .filter(Boolean)
        .join("\n\n");
    } else if (obj?.candidates?.[0]?.content?.parts?.[0]?.text) {
      outText = String(
        obj.candidates[0].content.parts[0].text || "",
      ).trim();
    }
  } catch {
    console.warn(
      "⚠️ [coach] Gemini response bukan JSON penuh, memakai body mentah untuk reply...",
    );
    outText = txt.trim();
  }

  if (!outText) {
    throw new Error(
      "Gemini response kosong, tidak ada teks untuk reply.",
    );
  }

  return outText;
}

// ------------------------
// Main handler
// ------------------------

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, ...jsonHeaders } },
    );
  }

  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = pickEnv("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY",
        }),
        { status: 500, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1) Ambil user
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }
    const user = userData.user;

    // 2) Baca body (pertanyaan user)
    const body = await req.json().catch(() => ({}));
    const question = String(body?.message || "").trim();
    if (!question) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    // 3) Quota stub
    const q = await checkQuota(user.id);
    if (!q.ok) {
      return new Response(
        JSON.stringify({
          reply: "Kuota AI hari ini sudah habis. Coba lagi besok ya.",
        }),
        { status: 200, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    // 4) Tentukan periode analisis
    const now = new Date();
    const startISO = String(body?.start || toISODate(startOfMonth(now)));
    const endISO = String(body?.end || toISODate(endOfMonth(now)));

    // 5) Ambil transaksi di rentang tersebut
    const { data: txRows, error: txErr } = await supa
      .from("transactions")
      .select("date,type,amount,category,merchant,notes")
      .gte("date", startISO)
      .lte("date", endISO)
      .order("date", { ascending: false })
      .limit(250);

    if (txErr) throw txErr;
    const rows = txRows || [];

    const kpi = sumByType(rows);
    const cats = groupExpenseByCategory(rows);

    const topCategories = cats.slice(0, 5).map((c) => ({
      category: c.category,
      amount: Math.round(c.amount),
    }));

    const topLarge = rows
      .filter((r) => r.type === "expense")
      .slice()
      .sort(
        (a, b) =>
          Number(b.amount || 0) - Number(a.amount || 0),
      )
      .slice(0, 5)
      .map((r) => ({
        date: r.date,
        category: r.category,
        amount: Math.round(Number(r.amount || 0)),
        merchant: r.merchant,
      }));

    const lastTx = rows.slice(0, 5).map((r) => ({
      date: r.date,
      type: r.type,
      category: r.category,
      amount: Math.round(Number(r.amount || 0)),
    }));

    // 6) Budget bulanan
    const budgetMonth = String(body?.budgetMonth || endISO.slice(0, 7));
    const { data: bRow } = await supa
      .from("budgets")
      .select("income,categories")
      .eq("month", budgetMonth)
      .maybeSingle();

    const budgetIncome = Math.round(Number(bRow?.income || 0));
    const budgetCategories =
      bRow?.categories && typeof bRow.categories === "object"
        ? bRow.categories
        : {};
    const budgetTotal = Object.values(budgetCategories).reduce(
      (a: number, v: any) => a + Math.round(Number(v || 0)),
      0,
    );

    const monthStart = `${budgetMonth}-01`;
    const monthEnd = toISODate(
      endOfMonth(new Date(`${budgetMonth}-01T00:00:00Z`)),
    );
    const { data: monthTx } = await supa
      .from("transactions")
      .select("type,amount")
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .limit(1000);

    const monthExpense = (monthTx || [])
      .filter((r) => r.type === "expense")
      .reduce(
        (a, r) => a + Number(r.amount || 0),
        0,
      );
    const budgetRemaining =
      budgetIncome > 0 ? budgetIncome - budgetTotal : 0;

    const summaryNumber = {
      periodLabel: `${startISO}–${endISO}`,
      kpi: {
        income: Math.round(kpi.income),
        expense: Math.round(kpi.expense),
        net: Math.round(kpi.net),
      },
      topCategories,
      topLarge,
      lastTx,
      budgetMonth,
      budgetIncome,
      budgetTotal,
      budgetRemaining,
      monthExpense: Math.round(monthExpense),
    };

    // 7) Ambil API key Gemini milik user dari profiles.gemini_key
    const { data: prof, error: profErr } = await supa
      .from("profiles")
      .select("gemini_key")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      console.error("❌ [coach] Error load profiles.gemini_key:", profErr);
    }

    const apiKey = String(prof?.gemini_key || "").trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply:
            "AI belum aktif. Silakan isi API key Gemini di Pengaturan AI terlebih dahulu.",
        }),
        { status: 200, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    // 8) Build system prompt dengan angka sudah diformat ke Rupiah
    const fmt = (n: number) =>
      `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

    const promptSummary: PromptSummary = {
      periodLabel: summaryNumber.periodLabel,
      kpi: {
        income: fmt(summaryNumber.kpi.income),
        expense: fmt(summaryNumber.kpi.expense),
        net: fmt(summaryNumber.kpi.net),
      },
      topCategories: summaryNumber.topCategories.map((x) => ({
        category: x.category,
        amount: fmt(x.amount),
      })),
      topLarge: summaryNumber.topLarge.map((x) => ({
        date: x.date,
        category: x.category,
        amount: fmt(x.amount),
        merchant: x.merchant,
      })),
      lastTx: summaryNumber.lastTx.map((x) => ({
        date: x.date,
        type: x.type,
        category: x.category,
        amount: fmt(x.amount),
      })),
      budgetMonth: summaryNumber.budgetMonth,
      budgetIncome: fmt(summaryNumber.budgetIncome),
      budgetTotal: fmt(summaryNumber.budgetTotal),
      budgetRemaining: fmt(summaryNumber.budgetRemaining),
    };

    const systemPrompt = buildSystemPrompt(promptSummary);

    // 9) Deteksi model Gemini yang tersedia untuk user
    const available = await listAvailableModels(apiKey);
    const chosenModel = pickBestModel(available);

    console.log("🔮 [coach] Chosen Gemini model:", {
      available,
      chosenModel,
    });

    // 10) Panggil Gemini untuk jawab chat
    const replyText = await callGeminiChat({
      apiKey,
      model: chosenModel,
      systemPrompt,
      userPrompt: question,
    });

    return new Response(
      JSON.stringify({
        reply: replyText,
        meta: {
          period: { start: startISO, end: endISO },
          budgetMonth,
          model: chosenModel,
        },
      }),
      { status: 200, headers: { ...corsHeaders, ...jsonHeaders } },
    );
  } catch (e) {
    console.error("❌ ai-user-coach error:", e);
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, ...jsonHeaders } },
    );
  }
});