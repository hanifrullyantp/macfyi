"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, FlaskRound, Info } from "lucide-react";
import { cn, groupLabel } from "@/lib/utils";
import {
  CATEGORY_LABEL, ELEMENTS, getElement, OUT_OF_SCOPE_NOTE,
} from "@/data/periodic-table";
import { ElementData, Molecule } from "@/lib/types";
import { moleculesUsingElement } from "@/data/molecules";
import { Badge, Button, Modal, Term } from "@/components/ui";
import { uniqueAtomSummary } from "@/engine/lewis";
import { formatFormula } from "@/lib/utils";

/* ---------- pratinjau titik elektron valensi di sekitar simbol ---------- */

export function ElectronDotPreview({
  valence, size = 92, color = "rgb(var(--primary))",
}: {
  valence: number; size?: number; color?: string;
}) {
  const dots = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const r = size * 0.42;
    for (let i = 0; i < valence; i++) {
      const a = (i / Math.max(valence, 1)) * Math.PI * 2 - Math.PI / 2;
      out.push({ x: size / 2 + Math.cos(a) * r, y: size / 2 + Math.sin(a) * r });
    }
    return out;
  }, [valence, size]);
  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`${valence} elektron valensi`}>
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute h-[9px] w-[9px] rounded-full"
          style={{ left: d.x - 4.5, top: d.y - 4.5, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      ))}
    </div>
  );
}

/* ---------- sel unsur ---------- */

export function ElementCell({
  el, highlight, dimmed, onPick, mini,
}: {
  el: ElementData;
  highlight?: boolean;
  dimmed?: boolean;
  onPick: (symbol: string) => void;
  mini?: boolean;
}) {
  return (
    <button
      onClick={() => onPick(el.symbol)}
      aria-label={`${el.name}, nomor atom ${el.atomicNumber}, golongan ${groupLabel(el.group)}, ${el.usedInApp ? `${el.valenceElectrons} elektron valensi` : "di luar cakupan materi"}`}
      className={cn(
        "element-cell group relative flex flex-col items-center justify-center rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary",
        `cat-${el.category}`,
        mini ? "h-10 w-10" : "h-[52px] w-full sm:h-[58px]",
        dimmed && "opacity-40",
        highlight && "element-highlight",
        !dimmed && "hover:scale-110 hover:shadow-lg",
      )}
      style={{ gridColumn: el.group, gridRow: el.period }}
    >
      <span className={cn("font-semibold leading-none text-muted", mini ? "text-[8px]" : "text-[9px]")}>{el.atomicNumber}</span>
      <span className={cn("font-display font-bold leading-tight", mini ? "text-sm" : "text-lg")}>{el.symbol}</span>
      {!mini && <span className="hidden max-w-full truncate px-0.5 text-[7.5px] leading-none text-muted xl:block">{el.name}</span>}
    </button>
  );
}

/* ---------- modal detail unsur ---------- */

export function ElementDetailModal({
  symbol, onClose,
}: {
  symbol: string | null;
  onClose: () => void;
}) {
  const el = symbol ? getElement(symbol) : null;
  const molecules = el ? moleculesUsingElement(el.symbol) : [];
  return (
    <Modal
      open={!!el}
      onClose={onClose}
      wide
      title={
        el && (
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              <ElectronDotPreview valence={el.valenceElectrons} />
              <span className="absolute font-display text-2xl font-bold">{el.symbol}</span>
            </div>
            <div>
              <p className="font-display text-xl font-bold">{el.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone="primary">No. {el.atomicNumber}</Badge>
                <Badge>{groupLabel(el.group)} · Periode {el.period}</Badge>
                <Badge tone="secondary">{CATEGORY_LABEL[el.category]}</Badge>
              </div>
            </div>
          </div>
        )
      }
    >
      {el && (
        <div className="space-y-4 text-sm leading-relaxed">
          {!el.usedInApp && (
            <p className="rounded-xl bg-lonepair/10 p-3 text-[12.5px] font-medium text-lonepair">
              <Info className="mr-1.5 inline h-3.5 w-3.5" />
              {OUT_OF_SCOPE_NOTE}
            </p>
          )}
          <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-primary">{el.usedInApp || el.valenceElectrons > 0 ? el.valenceElectrons : "—"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">elektron valensi</p>
            </div>
            <p className="flex-1 text-[13px] text-foreground/85">
              {el.category === "transition-metal"
                ? "Unsur transisi tidak mengikuti pola golongan utama."
                : <>Setiap atom {el.name} punya <Term id="elektron-valensi">elektron valensi</Term> sebanyak {el.valenceElectrons} — lihat titik-titik di sekitar simbolnya. Inilah modalnya untuk berikatan.</>}
            </p>
          </div>
          <p className="text-foreground/90">{el.simpleExplanation}</p>
          {el.whyItBonds && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">Kenapa berikatan seperti itu?</p>
              <p className="text-foreground/90">{el.whyItBonds}</p>
            </div>
          )}
          {el.electronegativity !== undefined && (
            <p className="text-[13px]">
              <Term id="elektronegativitas">Keelektronegatifan</Term> (Pauling): <b>{el.electronegativity}</b>
            </p>
          )}
          {el.funFact && (
            <p className="rounded-xl bg-secondary/10 p-3 text-[12.5px] text-secondary">
              <b>Tahukah kamu?</b> {el.funFact}
            </p>
          )}
          {molecules.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">Dipakai di molekul</p>
              <div className="flex flex-wrap gap-1.5">
                {molecules.map((m) => (
                  <Link key={m.formula} href={`/lab/${m.formula}`} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20">
                    <FlaskRound className="mr-1 inline h-3 w-3" />{formatFormula(m.formula)} · {m.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <Button href={`/periodic-table?highlight=${el.symbol}`} variant="outline" size="sm">
            Lihat di tabel periodik <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Modal>
  );
}

/* ---------- aplikasi tabel periodik lengkap ---------- */

export function PeriodicTableApp({ highlightSymbols }: { highlightSymbols: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [picked, setPicked] = useState<string | null>(null);
  const highlight = useMemo(() => new Set(highlightSymbols), [highlightSymbols]);

  const matches = (el: ElementData) => {
    const q = query.trim().toLowerCase();
    const okQ =
      !q ||
      el.symbol.toLowerCase().includes(q) ||
      el.name.toLowerCase().includes(q) ||
      String(el.atomicNumber) === q;
    const okC = category === "all" || el.category === category;
    return okQ && okC;
  };

  const categories = Object.entries(CATEGORY_LABEL);
  const anyFilter = query.trim() !== "" || category !== "all";

  return (
    <div className="space-y-4">
      {/* kontrol */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari unsur (nama / simbol / nomor atom)…"
            aria-label="Cari unsur"
            className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter kategori unsur"
          className="h-10 rounded-full border border-border bg-surface px-4 text-sm font-medium outline-none focus:border-primary"
        >
          <option value="all">Semua kategori</option>
          {categories.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* legenda kategori */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legenda kategori">
        {categories.map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className={cn("cat-dot cat-text h-2.5 w-2.5 rounded-sm", `cat-${k}`)} style={{ background: "rgb(var(--cat))" }} />
            {label}
          </span>
        ))}
      </div>

      {/* grid tabel */}
      <div className="rounded-2xl border border-border bg-surface p-3">
        <p className="mb-2 text-[11px] font-medium text-muted sm:hidden">
          Geser ke samping untuk melihat seluruh tabel →
        </p>
        <div className="overflow-x-auto pb-2">
          <div
            className="grid min-w-[900px] gap-[3px]"
            style={{ gridTemplateColumns: "repeat(18, minmax(44px, 1fr))", gridTemplateRows: "repeat(5, auto)" }}
            role="grid" aria-label="Tabel periodik unsur"
          >
            {ELEMENTS.map((el) => (
              <ElementCell
                key={el.symbol}
                el={el}
                onPick={setPicked}
                highlight={highlight.has(el.symbol)}
                dimmed={anyFilter ? !matches(el) : el.category === "transition-metal"}
              />
            ))}
          </div>
        </div>
      </div>

      <ElementDetailModal symbol={picked} onClose={() => setPicked(null)} />
    </div>
  );
}

/* ---------- mini widget untuk Lab Stage 1 ---------- */

export function PeriodicTableMini({ molecule, onPickElement }: { molecule: Molecule; onPickElement: (s: string) => void }) {
  const atoms = uniqueAtomSummary(molecule);
  const involved = atoms.map((a) => getElement(a.symbol));
  const groups = [...new Set(involved.map((e) => e.group))].sort((a, b) => a - b);
  const maxPeriod = Math.max(...involved.map((e) => e.period));
  const highlightQuery = atoms.map((a) => a.symbol).join(",");

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-foreground/85">
        Unsur penyusun <b>{molecule.name}</b> dan posisinya di tabel periodik — kolom (<Term id="golongan-unsur">golongan</Term>) menentukan jumlah <Term id="elektron-valensi">elektron valensi</Term>:
      </p>

      <div className="grid gap-2">
        {atoms.map((a) => {
          const el = getElement(a.symbol);
          return (
            <button
              key={a.symbol}
              onClick={() => onPickElement(a.symbol)}
              className={cn(
                "element-chip flex items-center gap-3 rounded-2xl p-2.5 text-left transition-transform hover:scale-[1.02]",
                `cat-${el.category}`,
              )}
            >
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <ElectronDotPreview valence={el.valenceElectrons} size={56} />
                <span className="absolute font-display text-base font-bold">{el.symbol}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold">
                  {el.name} {a.count > 1 && <span className="text-muted">×{a.count}</span>}
                  {a.role === "central" && <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">atom pusat</span>}
                </span>
                <span className="block text-[11px] text-muted">
                  {groupLabel(el.group)} · Periode {el.period} · <b className="text-foreground">{el.valenceElectrons} elektron valensi</b>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* mini grid kolom golongan terkait */}
      <div className="rounded-2xl border border-border bg-background/60 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Golongan terkait</p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(44px, 1fr))` }}>
          {groups.map((g) => (
            <div key={g} className="text-center text-[10px] font-bold text-muted">{groupLabel(g)}</div>
          ))}
          {groups.map((g) => (
            <div key={`col-${g}`} className="flex flex-col gap-1.5">
              {ELEMENTS.filter((e) => e.group === g && e.period <= Math.max(maxPeriod, 2)).map((e) => {
                const isInvolved = atoms.some((a) => a.symbol === e.symbol);
                return (
                  <button
                    key={e.symbol}
                    onClick={() => onPickElement(e.symbol)}
                    aria-label={`${e.name}: ${e.valenceElectrons} elektron valensi`}
                    className={cn(
                      "element-cell flex h-11 flex-col items-center justify-center rounded-lg transition-all",
                      `cat-${e.category}`,
                      isInvolved ? "element-highlight" : "opacity-45 hover:opacity-80",
                    )}
                  >
                    <span className="text-[8px] font-semibold text-muted">{e.atomicNumber}</span>
                    <span className="font-display text-sm font-bold">{e.symbol}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Button href={`/periodic-table?highlight=${highlightQuery}`} variant="outline" size="sm" className="w-full">
        Buka Tabel Periodik Lengkap <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
}
