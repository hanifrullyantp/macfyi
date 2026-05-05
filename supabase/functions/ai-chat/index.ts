import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const LIMIT_LICENSED = 50;
const LIMIT_DEMO = 5;
const WINDOW_MS = 86_400_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { message, context, deviceFingerprint } = body ?? {};
    if (!message?.trim()) return Response.json({ error: "Message required" }, { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: apiKeys } = await supabase
      .from("platform_api_keys")
      .select("provider,key_value,is_active")
      .eq("is_active", true);

    const geminiKey = apiKeys?.find((k) => k.provider === "gemini")?.key_value;
    const groqKey = apiKeys?.find((k) => k.provider === "groq")?.key_value;

    let userId = `device_${deviceFingerprint ?? "unknown"}`;
    let isLicensed = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        const { data: license } = await supabase
          .from("licenses")
          .select("id")
          .eq("email", user.email)
          .eq("status", "active")
          .maybeSingle();
        isLicensed = !!license;
      }
    }
    if (!isLicensed && deviceFingerprint) {
      const { data: activation } = await supabase
        .from("activations")
        .select("license_id")
        .eq("device_fingerprint", deviceFingerprint)
        .maybeSingle();
      isLicensed = !!activation;
    }

    const dailyLimit = isLicensed ? LIMIT_LICENSED : LIMIT_DEMO;
    const now = Date.now();
    const userRate = rateLimitStore.get(userId);
    if (userRate && now < userRate.resetAt) {
      if (userRate.count >= dailyLimit) {
        return Response.json(
          {
            error: "RATE_LIMIT",
            message: isLicensed
              ? `Batas ${dailyLimit} pertanyaan/hari tercapai.`
              : `Demo dibatasi ${dailyLimit} pertanyaan/hari.`,
            remainingToday: 0,
            dailyLimit,
            isDemo: !isLicensed,
          },
          { status: 429, headers: corsHeaders },
        );
      }
      userRate.count += 1;
    } else {
      rateLimitStore.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    }

    const safeMessage = redactPaths(message);
    const safeContext = context ? redactPaths(context) : undefined;
    const systemPrompt = buildSystemPrompt(safeContext);

    let response = "";
    let provider: "gemini" | "groq" | "kb" = "kb";

    if (!geminiKey && !groqKey) {
      response = "[Admin] API key belum dikonfigurasi. Isi key di adm.macfyi.com -> API Keys.";
    } else {
      // Try Groq first when configured — avoids waiting on a broken Gemini key; then Gemini as fallback.
      type Step = { id: "groq" | "gemini"; key: string };
      const chain: Step[] = [];
      if (groqKey) chain.push({ id: "groq", key: groqKey });
      if (geminiKey) chain.push({ id: "gemini", key: geminiKey });
      let got = false;
      for (const step of chain) {
        try {
          response =
            step.id === "groq"
              ? await callGroq(step.key, systemPrompt, safeMessage)
              : await callGemini(step.key, systemPrompt, safeMessage);
          provider = step.id;
          got = true;
          break;
        } catch {
          /* try next provider */
        }
      }
      if (!got) {
        response = getKBAnswer(safeMessage);
        provider = "kb";
      }
    }

    const remaining = dailyLimit - (rateLimitStore.get(userId)?.count ?? 0);
    return Response.json({
      response,
      provider,
      isDemo: !isLicensed,
      remainingToday: Math.max(0, remaining),
      dailyLimit,
    }, { headers: corsHeaders });
  } catch {
    return Response.json({ response: getKBAnswer(""), provider: "kb", error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});

async function callGemini(apiKey: string, system: string, message: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return String(text).trim();
}

async function callGroq(apiKey: string, system: string, message: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: system }, { role: "user", content: message }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty Groq response");
  return String(text).trim();
}

function buildSystemPrompt(context?: string): string {
  return `
Kamu adalah Macfyi AI, asisten storage Mac yang ramah.
- Jangan tampilkan full path file.
- Jangan sarankan hapus file sistem.
- Utamakan saran aman: pindah ke Trash dulu.
${context ? `\nKONTEKS:\n${context}` : ""}
  `.trim();
}

function redactPaths(text: string): string {
  return text
    .replace(/\/Users\/[^/\s"']+/g, "/Users/[user]")
    .replace(/\/home\/[^/\s"']+/g, "/home/[user]");
}

function getKBAnswer(msg: string): string {
  const q = msg.toLowerCase();
  if (q.includes("cache")) return "Cache adalah file sementara. Aman dihapus.";
  if (q.includes("leftover") || q.includes("sisa")) return "Sisa file app umumnya aman dihapus.";
  if (q.includes("large") || q.includes("besar")) return "File besar perlu ditinjau manual.";
  if (q.includes("trash")) return "File di Trash bisa dipulihkan sebelum dikosongkan.";
  return "AI sedang tidak tersedia. Gunakan tombol Tinjau untuk detail.";
}
