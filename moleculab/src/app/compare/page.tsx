"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale, FlaskRound, RotateCcw, Info } from "lucide-react";
import { useAppStore } from "@/store/app";

const MoleculeCanvas = dynamic(() => import("@/three/MoleculeCanvas"), { ssr: false });
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { getMolecule, MOLECULES } from "@/data/molecules";
import { BOND_LABEL, Molecule } from "@/lib/types";
import { formatFormula, formatAXE, parseAngle } from "@/lib/utils";
import { Badge, Button, Spinner, Term } from "@/components/ui";

function lewisSummary(m: Molecule): string {
  const counts = new Map<string, number>();
  m.ligands.forEach((l) => {
    const key = `${m.centralAtom}–${l.symbol} ${BOND_LABEL[l.bondType]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const bonds = [...counts.entries()].map(([k, c]) => `${c}× ${k}`).join(", ");
  const lp = m.lonePairs > 0 ? `${m.lonePairs} PEB di ${m.centralAtom}` : `tanpa PEB di ${m.centralAtom}`;
  return `${bonds} · ${lp}`;
}

function Selector({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex w-full flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-2xl border border-border bg-surface px-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none focus:border-primary"
      >
        {MOLECULES.map((m) => (
          <option key={m.formula} value={m.formula}>{formatFormula(m.formula)} — {m.name}</option>
        ))}
      </select>
    </label>
  );
}

function CompareInner() {
  const router = useRouter();
  const params = useSearchParams();
  const a = getMolecule(params.get("a") ?? "H2O") ?? MOLECULES[0];
  const b = getMolecule(params.get("b") ?? "NH3") ?? MOLECULES[1];
  const theme = useAppStore((s) => s.theme);
  
  // State untuk sinkronisasi rotasi
  const [resetToken, setResetToken] = useState(0);
  const handleReset = () => setResetToken(prev => prev + 1);
  const setParam = (key: "a" | "b", v: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(key, v);
    router.replace(`/compare?${q.toString()}`);
  };

  const rows: { label: string; termId?: string; va: string; vb: string; highlight?: boolean }[] = [
    { label: "Notasi struktur Lewis", termId: "struktur-lewis", va: lewisSummary(a), vb: lewisSummary(b) },
    { label: "Domain ikatan (PEI)", termId: "pei", va: `${a.bondingPairs}`, vb: `${b.bondingPairs}` },
    { label: "PEB di atom pusat", termId: "peb", va: `${a.lonePairs}`, vb: `${b.lonePairs}` },
    { label: "Bilangan sterik", termId: "bilangan-sterik", va: `${a.stericNumber}`, vb: `${b.stericNumber}` },
    { label: "Geometri elektron", termId: "geometri-elektron", va: a.electronGeometry, vb: b.electronGeometry },
    { label: "Bentuk molekul", termId: "geometri-molekul", va: a.molecularGeometry, vb: b.molecularGeometry, highlight: true },
    { label: "Notasi VSEPR", termId: "notasi-axe", va: formatAXE(a.vseprType), vb: formatAXE(b.vseprType) },
    { label: "Sudut ikatan", termId: "sudut-ikatan", va: a.bondAngle, vb: b.bondAngle },
    { label: "Polaritas", termId: "polaritas", va: a.polarity, vb: b.polarity },
  ];

  const chartData = [
    { name: formatFormula(a.formula), sudut: parseAngle(a.bondAngle) ?? 0, domain: a.stericNumber },
    { name: formatFormula(b.formula), sudut: parseAngle(b.bondAngle) ?? 0, domain: b.stericNumber },
  ];

  const insight = useMemo(() => {
    const parts: string[] = [];
    if (a.molecularGeometry === b.molecularGeometry) {
      parts.push(`Keduanya berbentuk ${a.molecularGeometry}.`);
    } else {
      parts.push(`${a.name} berbentuk ${a.molecularGeometry}, sedangkan ${b.name} ${b.molecularGeometry}.`);
    }
    if (a.lonePairs !== b.lonePairs) {
      parts.push(`Perbedaan kuncinya ada di PEB atom pusat: ${formatFormula(a.formula)} punya ${a.lonePairs}, ${formatFormula(b.formula)} punya ${b.lonePairs} — PEB menekan sudut ikatan lebih kuat daripada PEI.`);
    } else if (a.lonePairs > 0) {
      parts.push(`Keduanya sama-sama punya ${a.lonePairs} PEB di atom pusatnya.`);
    }
    return parts.join(" ");
  }, [a, b]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Scale className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Bandingkan Molekul</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Letakkan dua molekul berdampingan — dari struktur Lewis sampai bentuk akhirnya — dan temukan mengapa bentuknya berbeda.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Selector value={a.formula} onChange={(v) => setParam("a", v)} label="Molekul A" />
        <Selector value={b.formula} onChange={(v) => setParam("b", v)} label="Molekul B" />
      </div>

      {/* 3D Side-by-Side Comparison */}
      <div className="mb-6 grid h-[320px] gap-4 sm:h-[400px] sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-inner">
          <MoleculeCanvas
            molecule={a}
            stageId="molecular-shape-3d"
            showLigandElectrons={false}
            hideLonePairs={false}
            showAngles={true}
            autoRotate={true}
            viewMode="ball-stick"
            theme={theme}
            onPopup={() => {}}
            resetToken={resetToken}
            rotateSpeed={0.8}
          />
          <div className="absolute left-4 top-4">
            <Badge tone="primary">{formatFormula(a.formula)}</Badge>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-inner">
          <MoleculeCanvas
            molecule={b}
            stageId="molecular-shape-3d"
            showLigandElectrons={false}
            hideLonePairs={false}
            showAngles={true}
            autoRotate={true}
            viewMode="ball-stick"
            theme={theme}
            onPopup={() => {}}
            resetToken={resetToken}
            rotateSpeed={0.8}
          />
          <div className="absolute left-4 top-4">
            <Badge tone="secondary">{formatFormula(b.formula)}</Badge>
          </div>
          <button 
            onClick={handleReset}
            className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full glass text-muted hover:text-foreground active:rotate-180 transition-transform"
            title="Reset Posisi Kamera"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover/60">
              <th className="w-[32%] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted">Aspek</th>
              <th className="px-4 py-3 text-left">
                <Link href={`/lab/${a.formula}`} className="group inline-flex items-center gap-1.5 font-display text-base font-bold text-primary hover:underline">
                  <FlaskRound className="h-4 w-4" /> {formatFormula(a.formula)}
                </Link>
                <p className="text-[11px] font-medium text-muted">{a.name}</p>
              </th>
              <th className="px-4 py-3 text-left">
                <Link href={`/lab/${b.formula}`} className="group inline-flex items-center gap-1.5 font-display text-base font-bold text-secondary hover:underline">
                  <FlaskRound className="h-4 w-4" /> {formatFormula(b.formula)}
                </Link>
                <p className="text-[11px] font-medium text-muted">{b.name}</p>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={`border-b border-border/70 last:border-0 ${r.highlight ? "bg-primary/6" : i % 2 ? "bg-background/40" : ""}`}>
                <td className="px-4 py-3 text-[12.5px] font-medium text-muted">
                  {r.termId ? <Term id={r.termId}>{r.label}</Term> : r.label}
                </td>
                <td className={`px-4 py-3 text-[13px] ${r.highlight ? "font-bold text-primary" : "font-semibold"}`}>{r.va}</td>
                <td className={`px-4 py-3 text-[13px] ${r.highlight ? "font-bold text-secondary" : "font-semibold"}`}>{r.vb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">Sudut ikatan utama (°)</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={56}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "rgb(var(--muted))", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: "rgb(var(--surface-hover))" }}
                  contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`${v}°`, "Sudut"]}
                />
                <Bar dataKey="sudut" radius={[8, 8, 0, 0]}>
                  <Cell fill="rgb(var(--primary))" />
                  <Cell fill="rgb(var(--secondary))" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/8 p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Wawasan</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{insight}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={`/lab/${a.formula}?autoplay=1`} size="sm" variant="outline">Putar proses {formatFormula(a.formula)}</Button>
            <Button href={`/lab/${b.formula}?autoplay=1`} size="sm" variant="outline">Putar proses {formatFormula(b.formula)}</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="primary">{formatFormula(a.formula)}: {a.bondingPairs} PEI + {a.lonePairs} PEB</Badge>
            <Badge tone="secondary">{formatFormula(b.formula)}: {b.bondingPairs} PEI + {b.lonePairs} PEB</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>}>
      <CompareInner />
    </Suspense>
  );
}
