"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FlaskRound, Search } from "lucide-react";
import { MOLECULES, DIFFICULTY_LABEL } from "@/data/molecules";
import { formatFormula, formatAXE, cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { useAppStore } from "@/store/app";
import { useHydrated } from "@/components/theme";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "1", label: "Dasar" },
  { key: "2", label: "Menengah" },
  { key: "3", label: "Mahir" },
];

import { BRAND } from "@/config/brand";

export default function LabChooserPage() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const visited = useAppStore((s) => s.visited);
  const hydrated = useHydrated();

  const list = MOLECULES.filter((m) => {
    const okQ = !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.formula.toLowerCase().includes(q.toLowerCase());
    const okL = level === "all" || String(m.difficultyLevel) === level;
    return okQ && okL;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Pilih Molekul</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Eksplorasi pembentukan molekul di <b>{BRAND.appName}</b>. Pilih salah satu rute belajar dari {MOLECULES.length} molekul yang tersedia.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari molekul…"
            aria-label="Cari molekul"
            className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setLevel(f.key)}
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
                level === f.key ? "bg-primary text-primary-foreground" : "bg-surface-hover text-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((m, i) => (
          <motion.div
            key={m.formula}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
          >
            <Link
              href={`/lab/${m.formula}`}
              className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <FlaskRound className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                </span>
                {hydrated && visited[m.formula] && <Badge tone="success">dipelajari</Badge>}
              </div>
              <p className="font-display text-xl font-bold">{formatFormula(m.formula)}</p>
              <p className="text-[12.5px] font-medium text-muted">{m.name}</p>
              <div className="mt-auto flex flex-wrap gap-1 pt-3">
                <Badge tone="secondary">{formatAXE(m.vseprType)}</Badge>
                <Badge>{DIFFICULTY_LABEL[m.difficultyLevel]}</Badge>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {list.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">Tidak ada molekul yang cocok dengan pencarianmu.</p>
      )}
    </div>
  );
}
