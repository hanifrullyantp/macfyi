import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AiItemContext, AiRiskLabel, ScanResult } from "../types";
import {
  askAI,
  fetchAIProviderHealth,
  type AIProvider,
  type AIProviderHealthEntry,
  type AIProviderHealthResult,
  type ChatMessage,
} from "../lib/aiService";
import { useI18n } from "../i18n/context";

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

function providerHealthDetail(entry: AIProviderHealthEntry, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (entry.status === "ok") return t("assistant.health.statusOk");
  if (entry.status === "not_configured") return t("assistant.health.notConfigured");
  if (entry.status === "inactive") return t("assistant.health.inactive");
  const http = entry.httpStatus;
  if (http === 401 || http === 403) return t("assistant.health.invalidKey");
  if (http === 429) return t("assistant.health.providerRateLimit");
  if (entry.code === "TIMEOUT") return t("assistant.health.timeout");
  if (entry.code === "NETWORK") return t("assistant.health.network");
  if (entry.code === "EMPTY_RESPONSE") return t("assistant.health.emptyResponse");
  if (entry.code === "HTTP_ERROR") return t("assistant.health.httpError", { code: String(http ?? "?") });
  return t("assistant.health.unknownError");
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
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const [healthTesting, setHealthTesting] = useState(false);
  const [health, setHealth] = useState<AIProviderHealthResult | null>(null);
  const [healthProbeMsg, setHealthProbeMsg] = useState<string | null>(null);
  const [connectionAlert, setConnectionAlert] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const providerLabel = useMemo(
    (): Record<AIProvider, string> => ({
      gemini: t("assistant.providerGemini"),
      groq: t("assistant.providerGroqLlama"),
      kb: t("assistant.providerKb"),
    }),
    [t],
  );

  useEffect(() => {
    if (messages.length > 0) return;
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: t("assistant.intro"),
        provider: "gemini",
        timestamp: new Date(),
      },
    ]);
  }, [messages.length, t]);

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

  const runHealthCheck = useCallback(async () => {
    setHealthProbeMsg(null);
    setHealthTesting(true);
    try {
      const res = await fetchAIProviderHealth();
      setHealth(res);
      if (res.error === "RATE_LIMIT") {
        setHealthProbeMsg(t("assistant.health.probeRateLimit"));
      } else if (res.error === "OFFLINE") {
        setHealthProbeMsg(t("assistant.health.offline"));
      } else if (res.error) {
        setHealthProbeMsg(t("assistant.health.checkFailed"));
      }
    } catch {
      setHealth(null);
      setHealthProbeMsg(t("assistant.health.checkFailed"));
    } finally {
      setHealthTesting(false);
    }
  }, [t]);

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
      if (result.error === "RATE_LIMIT") {
        setRateLimitMsg(result.response);
        setConnectionAlert(false);
      } else if (result.error === "FUNCTION_ERROR" || result.error === "OFFLINE") {
        setConnectionAlert(true);
      } else {
        setConnectionAlert(false);
      }
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

  const lastCheckedLabel = health?.checkedAt
    ? t("assistant.health.lastChecked", {
        time: new Date(health.checkedAt).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      })
    : null;

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
          <p className={`text-[10px] ${PROVIDER_COLOR[provider]}`}>
            {loading ? t("assistant.thinking") : providerLabel[provider]}
          </p>
        </div>
        <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 text-gray-300">×</button>
      </div>

      {isDemo && (
        <p className="px-3 py-2 text-[11px] text-yellow-400 bg-yellow-500/10 border-b border-yellow-500/20">
          {t("assistant.demoBanner", { remaining: remaining ?? 0, limit: limit ?? 0 })}
        </p>
      )}
      <p className="px-3 py-2 text-[10px] text-white/50 border-b border-white/10">{t("assistant.footerHint")}</p>

      <div className="px-3 py-2 border-b border-white/10 space-y-2 bg-white/[0.03]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-white/90">{t("assistant.health.title")}</p>
          <button
            type="button"
            className="btn-secondary text-[10px] px-2 py-1 shrink-0"
            disabled={healthTesting}
            onClick={() => void runHealthCheck()}
          >
            {healthTesting ? t("assistant.health.checking") : t("assistant.health.check")}
          </button>
        </div>
        {health?.providers && (
          <div className="space-y-1 text-[10px] leading-snug">
            <p className="text-white/85">
              <span className="text-blue-300">{t("assistant.providerGemini")}:</span>{" "}
              <span className="text-white/70">{providerHealthDetail(health.providers.gemini, t)}</span>
            </p>
            <p className="text-white/85">
              <span className="text-orange-300">{t("assistant.providerGroqLlama")}:</span>{" "}
              <span className="text-white/70">{providerHealthDetail(health.providers.groq, t)}</span>
            </p>
          </div>
        )}
        {lastCheckedLabel && <p className="text-[9px] text-white/40">{lastCheckedLabel}</p>}
        {healthProbeMsg && <p className="text-[10px] text-amber-300/95">{healthProbeMsg}</p>}
      </div>

      {connectionAlert && (
        <p className="px-3 py-2 text-[10px] text-amber-200/95 bg-amber-500/15 border-b border-amber-500/25">
          {t("assistant.connectionAlert")}
        </p>
      )}

      <div className="p-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Apa ini?")}>
          {t("assistant.quickApa")}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Kenapa disarankan?")}>
          {t("assistant.quickKenapa")}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Aman dibersihkan?")}>
          {t("assistant.quickAman")}
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={() => void send("Apa dampaknya?")}>
          {t("assistant.quickDampak")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[92%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/10 text-white/90 rounded-tl-none border border-white/10"}`}>
              {m.content}
            </div>
            {m.role === "assistant" && m.provider && (
              <div className={`text-[10px] mt-1 ${PROVIDER_COLOR[m.provider]}`}>
                via {providerLabel[m.provider]}
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-xs text-white/45">{t("assistant.composing")}</p>}
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
            placeholder={t("assistant.inputPlaceholder")}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-xs text-white placeholder:text-white/30 focus:outline-none"
            disabled={loading}
          />
          <button type="button" onClick={() => void send(input)} className="absolute right-2 top-1.5 p-1 text-emerald-300 hover:text-emerald-200" disabled={loading}>
            <span className="text-xs font-bold">{t("assistant.go")}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
