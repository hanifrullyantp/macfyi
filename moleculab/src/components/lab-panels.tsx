"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Atom, CircleDot, GitCommitHorizontal, Link2, RotateCcw, Compass, Scale, Target,
  Sparkles, Globe, Lightbulb,
} from "lucide-react";
import { BOND_LABEL, BOND_ORDER, LabPopup, Molecule } from "@/lib/types";
import { getElement } from "@/data/periodic-table";
import { buildLewisPlan } from "@/engine/lewis";
import { formatFormula, formatAXE, groupLabel } from "@/lib/utils";
import { Badge, Button, Modal, Term } from "@/components/ui";
import { ElectronDotPreview } from "@/components/periodic-table";

/* ================= Popup universal (klik objek 3D) ================= */

export function LabInfoModal({
  popup, onClose, molecule,
}: {
  popup: LabPopup | null;
  onClose: () => void;
  molecule: Molecule;
}) {
  if (!popup) return null;

  let title: ReactNode = null;
  let body: ReactNode = null;

  if (popup.kind === "atom") {
    const el = getElement(popup.symbol);
    title = (
      <div className="flex items-center gap-3.5">
        <span className="relative flex h-[72px] w-[72px] items-center justify-center">
          <ElectronDotPreview valence={el.valenceElectrons} size={72} />
          <span className="absolute font-display text-xl font-bold">{el.symbol}</span>
        </span>
        <div>
          <p className="font-display text-lg font-bold">{el.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="primary">No. {el.atomicNumber}</Badge>
            <Badge>{groupLabel(el.group)}</Badge>
          </div>
        </div>
      </div>
    );
    body = (
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="rounded-xl bg-primary/8 p-3 text-[13px]">
          Punya <b className="text-primary">{el.valenceElectrons} <Term id="elektron-valensi">elektron valensi</Term></b> — titik-titik di sekeliling simbolnya.
        </p>
        <p className="text-foreground/90">{el.simpleExplanation}</p>
        {el.whyItBonds && <p className="text-foreground/80">{el.whyItBonds}</p>}
      </div>
    );
  } else if (popup.kind === "electron") {
    title = (
      <p className="flex items-center gap-2 font-display text-lg font-bold">
        <CircleDot className="h-5 w-5 text-primary" /> Satu Titik Elektron
      </p>
    );
    body = (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <p>
          Ini salah satu dari <b>{popup.valence} <Term id="elektron-valensi">elektron valensi</Term></b> milik atom <b>{getElement(popup.ownerSymbol).name} ({popup.ownerSymbol})</b> — elektron di kulit terluar yang berperan membentuk ikatan kimia.
        </p>
        <p className="text-foreground/80">
          Warna titik hanya menandai <i>asal</i> elektron (atom pusat = solid, atom ligan = bercincin). Secara kimia, semua elektron itu identik.
        </p>
      </div>
    );
  } else if (popup.kind === "pair" && popup.pairKind === "PEI") {
    const k = popup.bondOrder ?? 1;
    title = (
      <p className="flex items-center gap-2 font-display text-lg font-bold text-pei">
        <Link2 className="h-5 w-5" /> PEI — Pasangan Elektron Ikatan
      </p>
    );
    body = (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <p>
          Pasangan ini berada <b>di tengah antara atom {popup.bondSymbols?.[0]} dan {popup.bondSymbols?.[1]}</b> dan dipakai <b>bersama</b> oleh keduanya — inilah lem yang merekatkan kedua atom.
        </p>
        {k > 1 && (
          <p>
            Ikatan ini adalah <Term id="ikatan-rangkap">ikatan {BOND_LABEL[k === 2 ? "double" : "triple"]}</Term>, jadi ada <b>{k} pasangan PEI</b> berdampingan di sisi yang sama — makin banyak pasangan, makin kuat ikatannya.
          </p>
        )}
        <p className="rounded-xl bg-pei/10 p-3 text-[13px]">
          <b className="text-pei">Ingat:</b> satu <Term id="pei">PEI</Term> digambar sebagai <b>satu garis ikatan</b> pada struktur Lewis, dan dihitung sebagai <b>satu <Term id="domain-elektron">domain elektron</Term></b> pada teori VSEPR — walau ikatannya rangkap.
        </p>
      </div>
    );
  } else if (popup.kind === "pair" && popup.pairKind === "PEB") {
    const isCentral = popup.ownerSymbol === molecule.centralAtom;
    title = (
      <p className="flex items-center gap-2 font-display text-lg font-bold text-peb">
        <GitCommitHorizontal className="h-5 w-5" /> PEB — Pasangan Elektron Bebas
      </p>
    );
    body = (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <p>
          Pasangan ini <b>tetap tinggal di atom {popup.ownerSymbol}</b> dan tidak dipakai berikatan — milik atom itu sendiri.
        </p>
        {isCentral ? (
          <p className="rounded-xl bg-peb/10 p-3 text-[13px]">
            <b className="text-peb">Penting!</b> Karena berada di <b>atom pusat</b>, PEB ini ikut menentukan bentuk molekul — ia menolak domain lain lebih kuat daripada PEI (<Term id="peb">PEB</Term> vs <Term id="pei">PEI</Term>).
          </p>
        ) : (
          <p className="rounded-xl bg-peb/10 p-3 text-[13px]">
            Karena berada di atom ligan, PEB ini <b>tidak memengaruhi bentuk molekul</b> — <Term id="domain-elektron-pusat">yang menentukan geometri hanyalah domain di atom pusat</Term>.
          </p>
        )}
      </div>
    );
  } else if (popup.kind === "bond") {
    const k = BOND_ORDER[popup.bondType];
    title = (
      <p className="flex items-center gap-2 font-display text-lg font-bold">
        <Link2 className="h-5 w-5 text-primary" /> Ikatan {BOND_LABEL[popup.bondType]} {popup.symbols[0]}–{popup.symbols[1]}
      </p>
    );
    body = (
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <p>
          Garis ini adalah representasi dari <b>{k} <Term id="pei">pasangan elektron ikatan</Term></b> yang tadinya berupa titik-titik elektron di antara kedua atom.
        </p>
        {k > 1 && (
          <p>
            Meski ada {k} garis, pada perhitungan <Term id="vsepr">VSEPR</Term> seluruh ikatan {BOND_LABEL[popup.bondType]} ini dihitung sebagai <b>satu domain elektron</b>.
          </p>
        )}
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} title={title}>
      {body}
    </Modal>
  );
}

/* ================= Panel fakta progresif ================= */

function FactRow({ label, termId, value, strong }: { label: string; termId?: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2">
      <span className="text-[12px] text-muted">
        {termId ? <Term id={termId}>{label}</Term> : label}
      </span>
      <span className={`text-[13px] ${strong ? "font-display font-bold text-primary" : "font-semibold"}`}>{value}</span>
    </div>
  );
}

export function FactPanel({ molecule, stageId }: { molecule: Molecule; stageId: string }) {
  const plan = buildLewisPlan(molecule);
  const order = ["periodic-table", "valence-electrons", "electron-pairing", "identify-pei-peb", "lewis-transition", "domain-repulsion", "stable-geometry", "lone-pair-effect", "molecular-shape-3d", "conclusion"];
  const idx = order.indexOf(stageId);
  const central = getElement(molecule.centralAtom);

  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted">
        <Atom className="h-3.5 w-3.5" /> Fakta terkumpul
      </p>
      <FactRow label="Atom pusat" termId="atom-pusat" value={`${central.name} (${molecule.centralAtom})`} />
      {idx >= 1 && (
        <FactRow
          label="Elektron valensi"
          termId="elektron-valensi"
          value={plan.dotCountByOwner
            .filter((d, i, arr) => arr.findIndex((x) => x.symbol === d.symbol) === i)
            .map((d) => `${d.symbol}: ${d.count}`)
            .join(" · ")}
        />
      )}
      {idx >= 3 && (
        <>
          <FactRow label="PEI (pasangan ikatan)" termId="pei" value={`${plan.peiCount} pasangan · ${molecule.bondingPairs} domain`} />
          <FactRow label="PEB di atom pusat" termId="peb" value={`${molecule.lonePairs} pasangan`} strong={molecule.lonePairs > 0} />
          <FactRow label="PEB di semua ligan" value={`${plan.pebLigandTotal} pasangan (tak memengaruhi bentuk)`} />
        </>
      )}
      {idx >= 4 && <FactRow label="Struktur Lewis" termId="struktur-lewis" value="terbentuk ✓" />}
      {idx >= 5 && <FactRow label="Domain di atom pusat" termId="domain-elektron-pusat" value={`${molecule.stericNumber} domain saling tolak`} />}
      {idx >= 6 && (
        <>
          <FactRow label="Bilangan sterik" termId="bilangan-sterik" value={`${molecule.stericNumber} (${formatAXE(molecule.vseprType)})`} />
          <FactRow label="Geometri elektron" termId="geometri-elektron" value={molecule.electronGeometry} strong />
        </>
      )}
      {idx >= 8 && (
        <>
          <FactRow label="Bentuk molekul" termId="geometri-molekul" value={molecule.molecularGeometry} strong />
          <FactRow label="Sudut ikatan" termId="sudut-ikatan" value={molecule.bondAngle} />
          <FactRow label="Polaritas" termId="polaritas" value={molecule.polarity === "polar" ? "Polar" : "Nonpolar"} />
        </>
      )}
      {idx < 8 && (
        <p className="rounded-xl border border-dashed border-border p-3 text-[11.5px] leading-relaxed text-muted">
          Lanjutkan tahapnya untuk membuka fakta berikutnya —
          {idx < 5 ? " sampai Domai­n VSEPR saling tolak-menolak." : " sampai bentuk molekul akhir terungkap."}
        </p>
      )}
    </div>
  );
}

/* ================= Panel Kesimpulan (Stage 10) ================= */

export function ConclusionPanel({ molecule, onRestart }: { molecule: Molecule; onRestart: () => void }) {
  const plan = buildLewisPlan(molecule);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="space-y-3"
    >
      <div className="rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/12 to-secondary/10 p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Kesimpulan
        </p>
        <p className="font-display text-2xl font-bold leading-tight">{molecule.name}</p>
        <p className="font-display text-lg font-semibold text-muted">{formatFormula(molecule.formula)}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="primary">{formatAXE(molecule.vseprType)}</Badge>
          <Badge tone={molecule.polarity === "polar" ? "warning" : "success"}>
            {molecule.polarity === "polar" ? "Polar" : "Nonpolar"}
          </Badge>
          <Badge>Bentuk: {molecule.molecularGeometry}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { l: "Atom pusat", v: `${molecule.centralAtom} (${getElement(molecule.centralAtom).name})`, t: "atom-pusat" },
          { l: "PEI", v: `${molecule.bondingPairs} domain · ${plan.peiCount} pasangan`, t: "pei" },
          { l: "PEB (pusat)", v: `${molecule.lonePairs} pasangan`, t: "peb" },
          { l: "Geometri elektron", v: molecule.electronGeometry, t: "geometri-elektron" },
          { l: "Bentuk molekul", v: molecule.molecularGeometry, t: "geometri-molekul", strong: true },
          { l: "Notasi VSEPR", v: formatAXE(molecule.vseprType), t: "notasi-axe" },
          { l: "Sudut ikatan", v: molecule.bondAngle, t: "sudut-ikatan" },
          { l: "Bilangan sterik", v: String(molecule.stericNumber), t: "bilangan-sterik" },
        ].map((f) => (
          <div key={f.l} className={`rounded-xl border p-3 ${f.strong ? "border-primary/45 bg-primary/10" : "border-border bg-background/60"}`}>
            <p className="text-[10.5px] font-medium text-muted"><Term id={f.t}>{f.l}</Term></p>
            <p className={`mt-0.5 text-[13px] font-bold ${f.strong ? "text-primary" : ""}`}>{f.v}</p>
          </div>
        ))}
      </div>

      {molecule.resonanceNote && (
        <p className="rounded-xl border border-peb/40 bg-peb/10 p-3 text-[12px] leading-relaxed text-peb">
          <b>Catatan <Term id="resonansi">resonansi</Term>:</b> {molecule.resonanceNote}
        </p>
      )}
      {molecule.realWorldExample && (
        <p className="flex gap-2 rounded-xl bg-background/60 p-3 text-[12.5px] leading-relaxed text-foreground/85">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span><b>Di dunia nyata:</b> {molecule.realWorldExample}</span>
        </p>
      )}
      {molecule.simpleAnalogy && (
        <p className="flex gap-2 rounded-xl bg-secondary/10 p-3 text-[12.5px] leading-relaxed text-secondary">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{molecule.simpleAnalogy}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button onClick={onRestart} variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5" /> Ulangi dari Awal</Button>
        <Button href="/explorer" variant="outline" size="sm"><Compass className="h-3.5 w-3.5" /> Molekul Lain</Button>
        <Button href={`/compare?a=${molecule.formula}`} variant="outline" size="sm"><Scale className="h-3.5 w-3.5" /> Bandingkan</Button>
        <Button href={`/predict/${molecule.formula}`} size="sm"><Target className="h-3.5 w-3.5" /> Uji Pemahaman</Button>
      </div>
    </motion.div>
  );
}
