import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AiItemContext, AiRiskLabel, ScanResult } from "../types";
import { askAI, type AIProvider, type ChatMessage } from "../lib/aiService";

const PROVIDER_LABEL: Record<AIProvider, string> = {
  gemini: "Gemini AI",
  groq: "Groq AI",
  kb: "Mode Panduan",
};

const PROVIDER_COLOR: Record<AIProvider, string> = {
  gemini: "text-blue-400",
  groq: "text-orange-400",
  kb: "text-yellow-400",
};

function riskFromBand(band: "safe" | "caution" | "risky"): AiRiskLabel {
  if (band === "safe") return "SAFE";
  if (band === "caution") return "REVIEW";
  return "HIGH";
}

export function buildItemContextFromInspector(input: {
  category: string;
  appHint?: string;
  sizeBytes: number;
  riskBand: "safe" | "caution" | "risky";
  shortExplanation?: string;
  basenameHint?: string;
}): AiItemContext {
  return {
    category: input.category,
    appHint: input.appHint,
    sizeBytes: input.sizeBytes,
    riskLabel: riskFromBand(input.riskBand),
    shortExplanation: input.shortExplanation,
    basenameHint: input.basenameHint,
  };
}

export function AiAssistantPanel({
  onClose,
  activeContext,
  scanSummary,
}: {
  onClose: () => void;
  activeContext: AiItemContext | null;
  scanSummary?: ScanResult[] | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) return;
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Halo! Saya Macfyi AI. Saya bantu jelaskan hasil scan dan saran pembersihan aman.\n\nPath file disamarkan sebelum dikirim ke server.",
        provider: "gemini",
        timestamp: new Date(),
      },
    ]);
  }, [messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = useCallback((): string | undefined => {
    const ctx = activeContext ?? {
      category: "cache",
      sizeBytes: 0,
      riskLabel: "SAFE" as const,
      shortExplanation: scanSummary?.[0]?.recommendation,
    };
    const parts = [`Kategori: ${ctx.category}`, `Risk: ${ctx.riskLabel}`, `Ukuran: ${ctx.sizeBytes}`];
    if (ctx.appHint) parts.push(`App: ${ctx.appHint}`);
    if (ctx.basenameHint) parts.push(`Nama: ${ctx.basenameHint}`);
    if (ctx.shortExplanation) parts.push(`Catatan: ${ctx.shortExplanation}`);
    return parts.join(" | ");
  }, [activeContext, scanSummary]);

  const send = useCallback(async (question: string) => {
    const msg = question.trim();
    if (!msg || loading) return;
    setRateLimitMsg(null);
    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, role: "user", content: msg, timestamp: new Date() }]);
    setLoading(true);
    setInput("");
    try {
      const result = await askAI(msg, buildContext());
      setProvider(result.provider);
      setRemaining(result.remainingToday);
      setLimit(result.dailyLimit);
      setIsDemo(result.isDemo);
      if (result.error === "RATE_LIMIT") setRateLimitMsg(result.response);
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: result.response,
          provider: result.provider,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          content: "Terjadi kesalahan. Coba lagi sebentar.",
          provider: "kb",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [buildContext, loading]);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed top-4 right-4 bottom-4 w-[360px] bg-[#12141a]/95 backdrop-blur-sm border border-white/20 rounded-2xl flex flex-col z-[320] shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
        <div>
          <p className="text-sm font-semibold text-white">Macfyi AI</p>
          <p className={`text-[10px] ${PROVIDER_COLOR[provider]}`}>{loading ? "Sedang berpikir..." : PROVIDER_LABEL[provider]}</p>
        </div>
        <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 text-gray-300">×</button>
      </div>

      {isDemo && <p className="px-3 py-2 text-[11px] text-yellow-400 bg-yellow-500/10 border-b border-yellow-500/20">Mode Demo: {remaining ?? 0}/{limit ?? 0} pertanyaan tersisa hari ini.</p>}
      <p className="px-3 py-2 text-[10px] text-white/50 border-b border-white/10">Path file disamarkan sebelum dikirim ke server.</p>

      <div className="p-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Apa ini?")}>Apa ini?</button>
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Kenapa disarankan?")}>Kenapa disarankan?</button>
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Aman dibersihkan?")}>Aman dibersihkan?</button>
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Apa dampaknya?")}>Dampaknya?</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[92%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/10 text-white/90 rounded-tl-none border border-white/10"}`}>
              {m.content}
            </div>
            {m.role === "assistant" && m.provider && <div className={`text-[10px] mt-1 ${PROVIDER_COLOR[m.provider]}`}>via {PROVIDER_LABEL[m.provider]}</div>}
          </div>
        ))}
        {loading && <p className="text-xs text-white/45">Menyusun jawaban...</p>}
        {rateLimitMsg && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl p-2">{rateLimitMsg}</p>}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) void send(input);
            }}
            placeholder="Tanya Macfyi AI..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-xs text-white placeholder:text-white/30 focus:outline-none"
            disabled={loading}
          />
          <button type="button" onClick={() => void send(input)} className="absolute right-2 top-1.5 p-1 text-emerald-300 hover:text-emerald-200" disabled={loading}>
            <span className="text-xs font-bold">Go</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
