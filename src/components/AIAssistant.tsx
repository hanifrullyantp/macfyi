import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, X, Bot, MessageCircle, Sparkles, Shield } from "lucide-react";
import { chatAssistantResponse } from "../lib/ai-engine";
import type { ScanResult, AppInfo, ShellProbe } from "../types";
import {
  generateQuestions,
  type InterviewQuestion,
  type InterviewAction,
} from "../lib/interview-engine";
import { useI18n } from "../i18n/context";

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "ai"; text: string; actions?: string[] };

interface AIAssistantProps {
  onClose: () => void;
  scanSummary?: ScanResult[] | null;
  apps?: AppInfo[];
  shellProbes?: ShellProbe[];
  onInterviewAction?: (question: InterviewQuestion, action: string) => void;
  /** Review selection — counts only, no paths (Issue 13) */
  selectionSummary?: { count: number; bytesLabel: string } | null;
}

export const AIAssistant = ({
  onClose,
  scanSummary,
  apps,
  shellProbes,
  onInterviewAction,
  selectionSummary,
}: AIAssistantProps) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<"interview" | "chat">(
    scanSummary && scanSummary.length > 0 ? "interview" : "chat"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: t("assistant.intro"),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Interview state
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [interviewDone, setInterviewDone] = useState(false);

  useEffect(() => {
    if (mode === "interview" && scanSummary && scanSummary.length > 0) {
      const qs = generateQuestions(scanSummary, apps ?? [], shellProbes ?? []);
      setQuestions(qs);
      setCurrentQIdx(0);
      setInterviewDone(qs.length === 0);
    }
  }, [mode, scanSummary, apps, shellProbes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectionNote =
    selectionSummary && selectionSummary.count > 0
      ? `${selectionSummary.count} selected, ~${selectionSummary.bytesLabel}`
      : null;

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setTimeout(() => {
      const response = chatAssistantResponse(userMsg, scanSummary ?? null, selectionNote);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: response.text, actions: response.actions },
      ]);
    }, 400);
  };

  const handleInterviewAction = (q: InterviewQuestion, action: InterviewAction) => {
    onInterviewAction?.(q, action.key);
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx((i) => i + 1);
    } else {
      setInterviewDone(true);
    }
  };

  const currentQuestion = questions[currentQIdx] ?? null;

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed top-4 right-4 bottom-4 w-[340px] bg-[#12141a]/95 backdrop-blur-sm border border-white/20 rounded-2xl flex flex-col z-50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-[#007AFF]" />
          <span className="font-semibold text-white text-sm">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(mode === "interview" ? "chat" : "interview")}
            className="p-1.5 text-white/40 hover:text-white transition-colors"
            title={mode === "interview" ? "Switch to chat" : "Switch to interview"}
          >
            {mode === "interview" ? <MessageCircle size={16} /> : <Sparkles size={16} />}
          </button>
          <button type="button" onClick={onClose} className="p-1.5 text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-white/5 bg-white/[0.03] flex items-start gap-2 shrink-0">
        <Shield size={14} className="text-emerald-400/90 shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/50 leading-snug">
          Privacy: replies use category totals and optional selection counts — not full file paths.
          {selectionNote && <span className="text-white/65 block mt-1">{selectionNote}</span>}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {mode === "interview" ? (
          <div className="space-y-4">
            {!interviewDone && currentQuestion ? (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
                  Question {currentQIdx + 1} of {questions.length}
                </div>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <h3 className="text-sm font-bold text-white mb-2">{currentQuestion.title}</h3>
                  <p className="text-xs text-white/70 leading-relaxed">{currentQuestion.body}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentQuestion.actions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => handleInterviewAction(currentQuestion, action)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        action.variant === "primary"
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : action.variant === "danger"
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                            : "bg-white/10 text-white/70 hover:bg-white/15 border border-white/10"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : interviewDone ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                <Sparkles size={32} className="text-green-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-white mb-1">Interview complete!</p>
                <p className="text-xs text-white/50">Switch to chat mode to ask questions, or review the scan results.</p>
              </motion.div>
            ) : (
              <p className="text-xs text-white/40 text-center py-8">
                Run a scan first to start the AI interview.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#007AFF] text-white rounded-tr-none"
                      : "bg-white/10 text-white/90 rounded-tl-none border border-white/10"
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>
                </div>
                {m.role === "ai" && m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {m.actions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-[#007AFF] transition-all"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input (chat mode only) */}
      {mode === "chat" && (
        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={t("assistant.placeholder")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#007AFF]/50"
            />
            <button
              type="button"
              onClick={handleSend}
              className="absolute right-2 top-1.5 p-1 text-[#007AFF] hover:text-[#007AFF]/80"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
