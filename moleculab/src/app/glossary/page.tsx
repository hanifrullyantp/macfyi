"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Languages } from "lucide-react";
import { GLOSSARY } from "@/data/glossary";
import { useAppStore } from "@/store/app";
import { Badge } from "@/components/ui";
import { EditableText } from "@/components/ui/EditableText";
import { cn } from "@/lib/utils";

export default function GlossaryPage() {
  const [q, setQ] = useState("");
  const langMode = useAppStore((s) => s.langMode);
  const setLangMode = useAppStore((s) => s.setLangMode);

  const list = GLOSSARY.filter(
    (t) => !q || t.term.toLowerCase().includes(q.toLowerCase()) || t.simple.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <BookOpen className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Kamus Istilah</h1>
          <p className="mt-1 text-sm text-muted">
            {GLOSSARY.length} istilah kunci. Semua istilah ini bisa diklik di mana pun dalam aplikasi.
          </p>
        </div>
        <button
          onClick={() => setLangMode(langMode === "simple" ? "technical" : "simple")}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold transition-colors",
            langMode === "technical" ? "border-primary/50 bg-primary/12 text-primary" : "border-border text-muted hover:text-foreground",
          )}
        >
          <Languages className="h-4 w-4" />
          Mode: {langMode === "simple" ? "Sederhana" : "Teknis"}
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari istilah…"
          aria-label="Cari istilah"
          className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((t, i) => (
          <motion.article
            key={t.id}
            id={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <h2 className="font-display text-[15px] font-bold text-primary">{t.term}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
              <EditableText 
                contentKey={`glossary.${t.id}.${langMode}`} 
                defaultValue={langMode === "simple" ? t.simple : t.technical}
                multiline
              />
            </p>
            <div className="mt-2 rounded-xl bg-surface-hover p-2.5 text-[11.5px] leading-relaxed text-muted">
              <Badge tone="secondary" className="mr-1.5">
                {langMode === "simple" ? "teknis" : "sederhana"}
              </Badge>
              <EditableText 
                contentKey={`glossary.${t.id}.${langMode === "simple" ? "technical" : "simple"}`} 
                defaultValue={langMode === "simple" ? t.technical : t.simple}
                multiline
              />
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
