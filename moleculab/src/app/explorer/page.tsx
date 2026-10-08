"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, Search, Atom } from "lucide-react";
import { MOLECULES } from "@/data/molecules";
import { formatFormula, formatAXE, cn, parseAngle } from "@/lib/utils";
import { getElement } from "@/data/periodic-table";
import { atomStyle } from "@/lib/cpk";
import { Badge, EmptyState } from "@/components/ui";

const GEO_GROUPS = ["Semua", "Linear", "Bengkok (V)", "Trigonal Planar", "Trigonal Piramidal", "Tetrahedral", "Trigonal Bipiramidal", "Jungkat-jungkit (Seesaw)", "Bentuk T", "Oktahedral", "Segiempat Planar"];

function MiniStructure({ formula }: { formula: string }) {
  const m = MOLECULES.find((x) => x.formula === formula)!;
  const central = atomStyle(m.centralAtom);
  const ligSyms = m.ligands.slice(0, 4).map((l) => l.symbol);
  return (
    <svg viewBox="0 0 120 74" className="h-[74px] w-full" aria-hidden>
      {ligSyms.map((s, i) => {
        const a = (i / ligSyms.length) * Math.PI * 2 - Math.PI / 2;
        const x = 60 + Math.cos(a) * 38;
        const y = 37 + Math.sin(a) * 22;
        const c = atomStyle(s);
        return (
          <g key={i}>
            <line x1={60} y1={37} x2={x} y2={y} stroke="rgb(var(--border))" strokeWidth={3} strokeLinecap="round" />
            <circle cx={x} cy={y} r={11} fill={c.color} opacity={0.92} />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff">{s}</text>
          </g>
        );
      })}
      <circle cx={60} cy={37} r={14} fill={central.color} />
      <text x={60} y={41} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">{m.centralAtom}</text>
    </svg>
  );
}

export default function ExplorerPage() {
  const [q, setQ] = useState("");
  const [geo, setGeo] = useState("Semua");
  const list = useMemo(
    () =>
      MOLECULES.filter((m) => {
        const okQ = !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.formula.toLowerCase().includes(q.toLowerCase());
        const okG = geo === "Semua" || m.molecularGeometry === geo;
        return okQ && okG;
      }),
    [q, geo],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
          <Compass className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Eksplorasi Molekul</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            25 molekul dari berbagai kelompok bentuk — saring berdasarkan geometri dan temukan polanya.
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / rumus molekul…"
            aria-label="Cari molekul"
            className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GEO_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGeo(g)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                geo === g ? "bg-secondary text-white" : "bg-surface-hover text-muted hover:text-foreground",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Tidak ditemukan" hint="Coba kata kunci atau filter geometri lain." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m, i) => (
            <motion.div
              key={m.formula}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.35) }}
            >
              <Link
                href={`/lab/${m.formula}`}
                className="group block h-full rounded-3xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
              >
                <div className="rounded-2xl bg-gradient-to-b from-surface-hover to-transparent">
                  <MiniStructure formula={m.formula} />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="font-display text-2xl font-bold">{formatFormula(m.formula)}</p>
                  <p className="text-sm font-semibold text-muted">{m.name}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="primary">{m.molecularGeometry}</Badge>
                  <Badge>{formatAXE(m.vseprType)}</Badge>
                  <Badge tone={m.polarity === "polar" ? "warning" : "success"}>{m.polarity}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <p className="font-display text-sm font-bold">{m.bondingPairs}</p>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted">domain ikatan</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold">{m.lonePairs}</p>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted">PEB pusat</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold">{m.bondAngle}</p>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted">sudut</p>
                  </div>
                </div>
                {m.realWorldExample && (
                  <p className="mt-3 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                    <Atom className="mr-1 inline h-3 w-3 text-primary" />
                    {m.realWorldExample}
                  </p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
