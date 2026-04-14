import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Download, Trash2, X, Loader2 } from "lucide-react";
import type { AiItemContext, AiRequest, AiRiskLabel, ScanResult } from "../types";
import {
  aiCancelDownload,
  aiCancelGeneration,
  aiDeleteModel,
  aiDownloadModel,
  aiEnable,
  aiGenerate,
  aiOpenPanel,
  aiRuntimeStatus,
  aiSetModel,
  aiStatus,
  onAiDownloadProgress,
  onAiToken,
  type AiModelId,
  type AiStatus,
} from "../lib/backend";
import { kbAnswer } from "../lib/ai-kb";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; text: string; label?: "local" | "kb" };

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
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [runtimeState, setRuntimeState] = useState<string>("Unloaded");
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text:
        "Saya bisa jelaskan item hasil scan dengan privasi terjaga. Path file penuh tidak dikirim.\n\nPilih Quick Action di bawah atau ketik pertanyaan Anda.",
      label: "kb",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeModel, setActiveModel] = useState<AiModelId>("lite");

  const currentContext = useMemo(() => {
    return (
      activeContext ?? {
        category: "cache",
        sizeBytes: 0,
        riskLabel: "SAFE" as const,
        shortExplanation: scanSummary?.[0]?.recommendation,
      }
    );
  }, [activeContext, scanSummary]);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, downloading]);

  const refreshStatus = async () => {
    try {
      const s = await aiStatus();
      setStatus(s);
      setActiveModel(s.selectedModel);
      const r = await aiRuntimeStatus();
      setRuntimeState(r.state);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void refreshStatus();
    void aiOpenPanel().catch(() => {});
    const id = window.setInterval(() => void refreshStatus(), 3000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let unlisten1: (() => void) | null = null;
    let unlisten2: (() => void) | null = null;
    onAiDownloadProgress((p) => {
      setDownloading(true);
      setDownloadPct(p.pct);
    }).then((u) => (unlisten1 = u));
    onAiToken((tok) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "ai") return [...prev, { role: "ai", text: tok.text, label: "local" }];
        return [...prev.slice(0, -1), { ...last, text: last.text + tok.text }];
      });
    }).then((u) => (unlisten2 = u));
    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, []);

  const canUseLocalAi =
    status?.enabled &&
    !status?.memoryPressureHigh &&
    (activeModel === "lite" ? status?.liteInstalled : status?.betterInstalled);

  const runKb = (req: AiRequest) => {
    const text = kbAnswer(req);
    setMessages((prev) => [...prev, { role: "ai", text, label: "kb" }]);
  };

  const ask = async (req: AiRequest) => {
    setBusy(true);
    const userLabel =
      req.questionType === "custom"
        ? (req.customQuestion ?? "")
        : ({
            what_is_this: "Apa ini?",
            why_recommended: "Kenapa disarankan?",
            is_it_safe: "Aman dibersihkan?",
            impact: "Apa dampaknya?",
            custom: "",
          }[req.questionType] ?? "");

    setMessages((prev) => [...prev, { role: "user", text: userLabel }]);

    const useLocal = canUseLocalAi;
    if (useLocal) {
      setMessages((prev) => [...prev, { role: "ai", text: "", label: "local" }]);
    }
    try {
      if (!useLocal) {
        runKb(req);
        return;
      }
      await aiGenerate(req);
    } catch (e) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "ai" && last.text.trim() === "") return prev.slice(0, -1);
        return prev;
      });
      runKb(req);
    } finally {
      setBusy(false);
      void refreshStatus();
    }
  };

  const quickAsk = (questionType: AiRequest["questionType"]) =>
    ask({
      questionType,
      itemContext: currentContext,
    });

  const download = async (modelId: AiModelId) => {
    setDownloadPct(0);
    setDownloading(true);
    try {
      await aiDownloadModel(modelId);
    } finally {
      setDownloading(false);
      setDownloadPct(null);
      void refreshStatus();
    }
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed top-4 right-4 bottom-4 w-[360px] bg-[#12141a]/95 backdrop-blur-sm border border-white/20 rounded-2xl flex flex-col z-50 shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-emerald-400" />
          <span className="font-semibold text-white text-sm">Local AI Assistant</span>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 text-white/50 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-white/5 bg-white/[0.03] space-y-1 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-white/55">
          <span>Status</span>
          <span className="text-white/75">
            {status?.enabled ? "AI On" : "AI Off"} · {activeModel} · {runtimeState}
          </span>
        </div>
        <p className="text-[10px] text-white/45 leading-snug">
          AI lokal membutuhkan RAM. Mode <b>Lite</b> disarankan untuk Mac 8GB. Tidak ada path file penuh yang dikirim.
        </p>
        {status?.memoryPressureHigh && (
          <p className="text-[10px] text-amber-300/90">
            AI dimatikan sementara untuk menjaga performa (memory pressure tinggi). Jawaban memakai Quick Answer.
          </p>
        )}
      </div>

      <div className="p-3 border-b border-white/10 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/70">Enable AI lokal</label>
          <input
            type="checkbox"
            checked={Boolean(status?.enabled)}
            onChange={(e) => void aiEnable(e.target.checked).then(refreshStatus)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void aiSetModel("lite").then(refreshStatus)}
            className={`px-2 py-1 rounded-lg text-[11px] border ${
              activeModel === "lite" ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-white/60"
            }`}
          >
            Lite (3B)
          </button>
          <button
            type="button"
            onClick={() => void aiSetModel("better").then(refreshStatus)}
            className={`px-2 py-1 rounded-lg text-[11px] border ${
              activeModel === "better" ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-white/60"
            }`}
            title="Better membutuhkan RAM lebih besar"
          >
            Better (7B)
          </button>
          <button
            type="button"
            onClick={() => void aiDeleteModel().then(refreshStatus)}
            className="ml-auto p-1.5 rounded-lg border border-white/10 text-white/55 hover:text-white hover:bg-white/5"
            title="Delete model files"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeModel === "lite" && !status?.liteInstalled && (
            <button
              type="button"
              onClick={() => void download("lite")}
              className="btn-secondary text-xs inline-flex items-center gap-2"
              disabled={downloading}
            >
              <Download size={14} /> Download Lite
            </button>
          )}
          {activeModel === "better" && !status?.betterInstalled && (
            <button
              type="button"
              onClick={() => void download("better")}
              className="btn-secondary text-xs inline-flex items-center gap-2"
              disabled={downloading}
            >
              <Download size={14} /> Download Better
            </button>
          )}
          {downloading && (
            <button
              type="button"
              onClick={() => void aiCancelDownload().catch(() => {})}
              className="text-xs text-white/60 underline"
            >
              Cancel
            </button>
          )}
          {downloading && downloadPct != null && <span className="text-[11px] text-white/55">{downloadPct.toFixed(0)}%</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void quickAsk("what_is_this")} className="btn-secondary text-xs">
            Apa ini?
          </button>
          <button type="button" onClick={() => void quickAsk("why_recommended")} className="btn-secondary text-xs">
            Kenapa disarankan?
          </button>
          <button type="button" onClick={() => void quickAsk("is_it_safe")} className="btn-secondary text-xs">
            Aman dibersihkan?
          </button>
          <button type="button" onClick={() => void quickAsk("impact")} className="btn-secondary text-xs">
            Dampaknya?
          </button>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[92%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-white/10 text-white/90 rounded-tl-none border border-white/10"
              }`}
            >
              {m.text || (busy && m.role === "ai" ? "…" : "")}
            </div>
            {m.role === "ai" && m.label && (
              <div className="text-[10px] text-white/35 mt-1">{m.label === "local" ? "Local AI" : "Quick Answer (No AI)"}</div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                void ask({
                  questionType: "custom",
                  customQuestion: input.trim(),
                  itemContext: currentContext,
                });
                setInput("");
              }
            }}
            placeholder="Tanya AI (lokal)…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => {
              if (!input.trim()) return;
              void ask({
                questionType: "custom",
                customQuestion: input.trim(),
                itemContext: currentContext,
              });
              setInput("");
            }}
            className="absolute right-2 top-1.5 p-1 text-emerald-300 hover:text-emerald-200"
            disabled={busy}
            title="Kirim"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <span className="text-xs font-bold">Go</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void aiCancelGeneration().catch(() => {})}
          className="mt-2 text-[11px] text-white/45 hover:text-white/70 underline"
        >
          Cancel generation
        </button>
      </div>
    </motion.div>
  );
}

