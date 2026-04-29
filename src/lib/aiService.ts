import { invoke } from "@tauri-apps/api/core";
import { supabase, supabaseConfigured } from "./supabase";

export type AIProvider = "gemini" | "groq" | "kb";

export interface AIResult {
  response: string;
  provider: AIProvider;
  isDemo: boolean;
  remainingToday: number;
  dailyLimit: number;
  error?: "RATE_LIMIT" | "OFFLINE" | "NO_KEY" | "SERVER_ERROR";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: AIProvider;
  timestamp: Date;
}

const KB: Array<{ keys: string[]; answer: string }> = [
  { keys: ["cache"], answer: "Cache adalah file sementara. **Aman dihapus**." },
  { keys: ["leftover", "sisa app", "orphan"], answer: "Sisa file app umumnya aman dihapus setelah ditinjau." },
  { keys: ["large", "besar"], answer: "File besar perlu ditinjau manual sebelum dihapus." },
  { keys: ["download", "unduhan"], answer: "Unduhan lama yang tidak dipakai biasanya aman dihapus." },
  { keys: ["trash", "sampah"], answer: "File di Trash bisa dipulihkan sebelum dikosongkan." },
];

function kbAnswer(msg: string): string {
  const q = msg.toLowerCase();
  for (const item of KB) {
    if (item.keys.some((k) => q.includes(k))) return item.answer;
  }
  return "AI tidak tersedia. Gunakan tombol Tinjau untuk detail item.";
}

export async function askAI(message: string, context?: string): Promise<AIResult> {
  const offlineResult: AIResult = {
    response: kbAnswer(message),
    provider: "kb",
    isDemo: true,
    remainingToday: 0,
    dailyLimit: 0,
    error: "OFFLINE",
  };

  if (!supabaseConfigured) return offlineResult;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    let deviceFingerprint = "unknown";
    try {
      deviceFingerprint = await invoke<string>("get_device_fingerprint");
    } catch {
      // noop
    }

    const headers: Record<string, string> = {};
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: { message, context, deviceFingerprint },
      headers,
    });

    if (error) return offlineResult;
    if (data?.error === "RATE_LIMIT") {
      return {
        response: data.message ?? "Batas harian tercapai.",
        provider: "kb",
        isDemo: data.isDemo ?? true,
        remainingToday: 0,
        dailyLimit: data.dailyLimit ?? 0,
        error: "RATE_LIMIT",
      };
    }

    return {
      response: data?.response ?? kbAnswer(message),
      provider: (data?.provider as AIProvider) ?? "kb",
      isDemo: data?.isDemo ?? true,
      remainingToday: data?.remainingToday ?? 0,
      dailyLimit: data?.dailyLimit ?? 0,
    };
  } catch {
    return offlineResult;
  }
}
