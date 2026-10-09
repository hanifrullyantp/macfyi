"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BOND_ORDER, LabPopup, Molecule } from "@/lib/types";
import { StageId, ViewMode } from "@/store/lab";
import { atomStyle, bondLength, ScenePalette } from "@/lib/cpk";
import { buildLewisPlan, LewisDot, LewisOutline, LewisPlan } from "@/engine/lewis";
import { assignDomains, fibonacciSphere } from "@/engine/vsepr";
import { groupLabel, seededRandom } from "@/lib/utils";
import { getElement } from "@/data/periodic-table";
import {
  AtomBall, AtomLabel, BondAngleArc, DomainMarker, ElectronDot,
  ForceArrow, LonePairLobe, PairOutline, PulseShells, VisualHandle,
} from "./primitives";
import { DissolvingLonePair } from "./core/DissolvingLonePair";

/* ============================================================
   MoleculeView — koreografi 10-stage. Semua posisi/opacity/scale
   dihitung per-frame secara imperatif (damp & spring), sehingga
   perpindahan stage menghasilkan transisi mulus otomatis.
   ============================================================ */

const STAGE_ORDER: StageId[] = [
  "periodic-table", "valence-electrons", "electron-pairing",
  "identify-pei-peb", "lewis-transition", "domain-repulsion",
  "stable-geometry", "lone-pair-effect", "molecular-shape-3d", "conclusion",
];

const ORIGIN = new THREE.Vector3(0, 0, 0);
const YUP = new THREE.Vector3(0, 1, 0);
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const dotTmp = { pos: new THREE.Vector3(), opacity: 1, scale: 1 };
const outTmp = { pos: new THREE.Vector3(), opacity: 1, scale: 1 };

const minDt = (raw: number) => Math.min(raw, 0.05);

function dampV(cur: THREE.Vector3, target: THREE.Vector3, lambda: number, dt: number) {
  cur.x = THREE.MathUtils.damp(cur.x, target.x, lambda, dt);
  cur.y = THREE.MathUtils.damp(cur.y, target.y, lambda, dt);
  cur.z = THREE.MathUtils.damp(cur.z, target.z, lambda, dt);
}

function springStep(st: { pos: THREE.Vector3; vel: THREE.Vector3 }, target: THREE.Vector3, k: number, c: number, dt: number) {
  st.vel.x += (target.x - st.pos.x) * k * dt;
  st.vel.y += (target.y - st.pos.y) * k * dt;
  st.vel.z += (target.z - st.pos.z) * k * dt;
  st.vel.multiplyScalar(Math.exp(-c * dt));
  st.pos.addScaledVector(st.vel, dt);
}

/** Sumbu tegak lurus ikatan yang KONSISTEN dengan BondItem (slot ikatan rangkap). */
function bondPerp(dir: THREE.Vector3, out: THREE.Vector3) {
  _q1.setFromUnitVectors(YUP, dir);
  return out.set(1, 0, 0).applyQuaternion(_q1);
}

/* ================= rencana geometri ================= */

interface LoneSlot { dir: THREE.Vector3; tangent: THREE.Vector3 }

interface OwnerMeta {
  n: THREE.Vector3;
  u: THREE.Vector3;
  v: THREE.Vector3;
  radius: number;
  count: number;
  spin: number;
  loneSlots: Map<string, LoneSlot>;
}

interface GeoPlan {
  bondDirs: THREE.Vector3[];
  loneDirs: THREE.Vector3[];
  bondLengths: number[];
  lewisDirs: THREE.Vector3[];
  centralMeta: OwnerMeta;
  ligMeta: OwnerMeta[];
}

function makeMeta(symbol: string, count: number, seedN: number, loneIds: string[]): OwnerMeta {
  const n = new THREE.Vector3(Math.sin(seedN * 2.13 + 0.4), 1.15, Math.cos(seedN * 1.71 + 0.2)).normalize();
  const ref = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(n, ref).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const loneSlots = new Map<string, LoneSlot>();
  loneIds.forEach((id, p) => {
    const a = 0.9 + p * 2.399963; // golden angle
    const dir = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)).normalize();
    const tangent = u.clone().multiplyScalar(-Math.sin(a)).addScaledVector(v, Math.cos(a)).normalize();
    loneSlots.set(id, { dir, tangent });
  });
  return {
    n, u, v,
    radius: atomStyle(symbol).radius + 0.38,
    count,
    spin: seedN % 2 ? -1 : 1,
    loneSlots,
  };
}

function loneIdsFor(plan: LewisPlan, owner: "central" | number): string[] {
  return plan.outlines.filter((o) => o.kind === "PEB" && o.owner === owner).map((o) => o.id);
}

function buildGeo(mol: Molecule, plan: LewisPlan): GeoPlan {
  const domains = assignDomains(mol.stericNumber, mol.lonePairs);
  const bondLengths = mol.ligands.map((l) => bondLength(mol.centralAtom, l.symbol));
  // susunan Lewis: tersebar merata tapi acak-deterministik per molekul
  const rng = seededRandom(mol.formula);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * Math.PI, rng() * Math.PI * 2, 0));
  const lewisDirs = fibonacciSphere(mol.ligands.length).map((d) => d.clone().applyQuaternion(q));

  const centralCount = plan.dotCountByOwner.find((d) => d.owner === "central")?.count ?? 0;
  const centralMeta = makeMeta(mol.centralAtom, centralCount, 0, loneIdsFor(plan, "central"));
  const ligMeta = mol.ligands.map((lig, i) => {
    const c = plan.dotCountByOwner.find((d) => d.owner === i)?.count ?? 0;
    return makeMeta(lig.symbol, c, i + 1, loneIdsFor(plan, i));
  });
  return { bondDirs: domains.bond, loneDirs: domains.lone, bondLengths, lewisDirs, centralMeta, ligMeta };
}

/* ================= konteks per-frame ================= */

interface LiveCtx {
  lig: THREE.Vector3[];
  ligSpeed: number[];
}

interface FrameCtx {
  mol: Molecule;
  plan: LewisPlan;
  geo: GeoPlan;
  stageId: StageId;
  stageNum: number;
  t: number;
  live: { current: LiveCtx };
  showLigandElectrons: boolean;
  hideLonePairs: boolean;
  showAngles: boolean;
  viewMode: ViewMode;
  reduced: boolean;
  palette: ScenePalette;
  onPopup: (p: LabPopup) => void;
}

function atomScale(viewMode: ViewMode) {
  return viewMode === "spacefill" ? 1.8 : 1;
}

/** Target posisi ligan per stage. */
function ligandTarget(i: number, ctx: FrameCtx, out: THREE.Vector3): THREE.Vector3 {
  const { geo, mol, stageNum, viewMode } = ctx;
  const base = geo.bondLengths[i];
  const distScale = viewMode === "spacefill" ? 0.6 : 1;
  if (stageNum >= STAGE_ORDER.indexOf("domain-repulsion")) {
    const dir = geo.bondDirs[i] ?? geo.lewisDirs[i];
    return out.copy(dir).multiplyScalar(base * distScale);
  }
  if (stageNum === 0) return out.copy(geo.lewisDirs[i]).multiplyScalar(base * 1.5 + 0.95);
  // tahap Lewis: agak dirapatkan, belum menyentuh
  return out.copy(geo.lewisDirs[i]).multiplyScalar(base * 1.3 + 0.8);
}

/* ================= frame logic: dot ================= */

function dotFrame(dot: LewisDot, ctx: FrameCtx, out: typeof dotTmp) {
  const central = dot.owner === "central";
  const ownerIdx = central ? -1 : (dot.owner as number);
  const meta = central ? ctx.geo.centralMeta : ctx.geo.ligMeta[ownerIdx];
  const ownerPos = central ? ORIGIN : ctx.live.current.lig[ownerIdx];
  const rScale = ctx.viewMode === "spacefill" ? atomScale(ctx.viewMode) : 1;

  let opacity = 1;
  let scale = 1;
  const pos = out.pos;

  if (!central && !ctx.showLigandElectrons) opacity = 0;

  if (ctx.stageNum === 0) {
    // belum muncul: bersembunyi di pusat atom
    pos.copy(ownerPos);
    opacity = 0;
    scale = 0.3;
  } else if (ctx.stageNum === 1) {
    // mengorbit di sekitar atom
    const cnt = Math.max(1, meta.count);
    const angle = (dot.orbitIndex / cnt) * Math.PI * 2 + (ctx.reduced ? 0 : ctx.t * 0.22 * meta.spin);
    pos.copy(ownerPos)
      .addScaledVector(meta.u, Math.cos(angle) * meta.radius * rScale * 0.85)
      .addScaledVector(meta.v, Math.sin(angle) * meta.radius * rScale * 0.85);
  } else if (dot.role === "lone") {
    const slot = meta.loneSlots.get(dot.pairId!);
    const j = dot.id.endsWith("-0") ? -1 : 1;
    const dir = slot?.dir ?? meta.u;
    const tan = slot?.tangent ?? meta.v;
    pos.copy(ownerPos)
      .addScaledVector(dir, meta.radius * rScale * 0.92)
      .addScaledVector(tan, j * 0.082);
    if (ctx.stageNum >= 5) {
      if (central) {
        opacity = 0; scale = 0.001; // bermetamorfosis jadi lobe
      } else {
        opacity = Math.min(opacity, 0.24); // PEB ligan tidak memengaruhi geometri
        scale = 0.8;
      }
    }
  } else {
    // role bond
    const bi = dot.bondIndex!;
    const slot = dot.peiSlot!;
    const k = BOND_ORDER[ctx.mol.ligands[bi].bondType];
    const ligPos = ctx.live.current.lig[bi];
    _v1.copy(ligPos).normalize();
    bondPerp(_v1, _v2);

    if (ctx.stageNum === 2) {
      // pairing: berkumpul di sisi menghadap pasangan ikatannya
      const sign = central ? 1 : -1;
      pos.copy(ownerPos)
        .addScaledVector(_v1, sign * meta.radius * rScale * 0.92)
        .addScaledVector(_v2, (slot - (k - 1) / 2) * 0.15);
    } else {
      // identify / transition / setelahnya: titik tengah antar atom (PEI)
      _v3.copy(ligPos).multiplyScalar(0.5);
      const along = central ? -0.1 : 0.1;
      pos.copy(_v3)
        .addScaledVector(_v1, along)
        .addScaledVector(_v2, (slot - (k - 1) / 2) * 0.17);
      if (ctx.stageNum >= 4) {
        // morf: dot menyusut, garis ikatan menggantikan
        opacity = 0;
        scale = 0.001;
      }
    }
  }
  out.opacity = opacity;
  out.scale = scale;
}

function DotItem({ dot, ctx }: { dot: LewisDot; ctx: FrameCtx }) {
  const posRef = useRef<THREE.Group>(null);
  const visRef = useRef<VisualHandle>(null);
  const st = useRef({ pos: new THREE.Vector3(), op: 0, sc: 0.3, init: false });

  useFrame((state, rawDt) => {
    const dt = minDt(rawDt);
    ctx.t = state.clock.elapsedTime;
    dotFrame(dot, ctx, dotTmp);
    if (!st.current.init) {
      st.current.pos.copy(dotTmp.pos);
      st.current.op = dotTmp.opacity;
      st.current.sc = dotTmp.scale;
      st.current.init = true;
      return;
    }
    const lam = ctx.reduced ? 30 : dot.role === "bond" && ctx.stageNum >= 3 ? 9 : 6.5;
    dampV(st.current.pos, dotTmp.pos, lam, dt);
    st.current.op = THREE.MathUtils.damp(st.current.op, dotTmp.opacity, ctx.reduced ? 30 : 8.5, dt);
    st.current.sc = THREE.MathUtils.damp(st.current.sc, dotTmp.scale, ctx.reduced ? 30 : 8.5, dt);
    posRef.current?.position.copy(st.current.pos);
    visRef.current?.setVisual({ opacity: st.current.op, scale: st.current.sc });
  });

  const outlined = dot.owner !== "central";
  return (
    <group ref={posRef}>
      <ElectronDot
        ref={visRef}
        color={outlined ? ctx.palette.electronLigand : ctx.palette.electronCentral}
        outlined={outlined}
        onClick={() =>
          ctx.onPopup({
            kind: "electron",
            ownerSymbol: dot.ownerSymbol,
            valence: getElement(dot.ownerSymbol).valenceElectrons ?? 0,
          })
        }
      />
    </group>
  );
}

/* ================= frame logic: outline PEI/PEB ================= */

function outlineFrame(o: LewisOutline, ctx: FrameCtx, out: typeof outTmp) {
  const s = ctx.stageNum;
  let opacity = 0;
  let scale = 0.3;

  if (o.kind === "PEI") {
    const bi = o.bondIndex!;
    const k = o.slotCount ?? 1;
    const ligPos = ctx.live.current.lig[bi];
    _v1.copy(ligPos).normalize();
    bondPerp(_v1, _v2);
    out.pos.copy(ligPos).multiplyScalar(0.5).addScaledVector(_v2, (o.slot! - (k - 1) / 2) * 0.17);
    if (s === 3) { opacity = 1; scale = 1; }
    else if (s >= 4) { opacity = 0; scale = 0.25; }
  } else {
    const central = o.owner === "central";
    const meta = central ? ctx.geo.centralMeta : ctx.geo.ligMeta[o.owner as number];
    const ownerPos = central ? ORIGIN : ctx.live.current.lig[o.owner as number];
    const slot = meta.loneSlots.get(o.id);
    const dir = slot?.dir ?? meta.u;
    const rScale = ctx.viewMode === "spacefill" ? atomScale(ctx.viewMode) : 1;
    out.pos.copy(ownerPos).addScaledVector(dir, meta.radius * rScale * 0.92);
    if (s === 3 || s === 4) { opacity = 1; scale = 1; }
    else if (s >= 5) {
      if (central) { opacity = 0; scale = 0.3; }
      else {
        opacity = ctx.showLigandElectrons ? 0.28 : 0;
        scale = 0.85;
      }
    }
  }
  out.opacity = opacity;
  out.scale = scale;
}

function OutlineItem({ o, ctx }: { o: LewisOutline; ctx: FrameCtx }) {
  const posRef = useRef<THREE.Group>(null);
  const visRef = useRef<VisualHandle>(null);
  const st = useRef({ pos: new THREE.Vector3(0, 0, 0), op: 0, sc: 0.3, init: false });
  const isPei = o.kind === "PEI";

  useFrame((state, rawDt) => {
    const dt = minDt(rawDt);
    ctx.t = state.clock.elapsedTime;
    outlineFrame(o, ctx, outTmp);
    if (!st.current.init) {
      st.current.pos.copy(outTmp.pos);
      st.current.init = true;
      st.current.op = outTmp.opacity;
      st.current.sc = outTmp.scale;
      return;
    }
    dampV(st.current.pos, outTmp.pos, ctx.reduced ? 30 : 8, dt);
    st.current.op = THREE.MathUtils.damp(st.current.op, outTmp.opacity, ctx.reduced ? 30 : 8, dt);
    st.current.sc = THREE.MathUtils.damp(st.current.sc, outTmp.scale, ctx.reduced ? 30 : 8, dt);
    posRef.current?.position.copy(st.current.pos);
    visRef.current?.setVisual({ opacity: st.current.op, scale: st.current.sc });
  });

  return (
    <group ref={posRef}>
      <PairOutline
        ref={visRef}
        color={isPei ? ctx.palette.pei : ctx.palette.peb}
        radius={isPei ? 0.21 : 0.25}
        onClick={() =>
          ctx.onPopup(
            isPei
              ? {
                  kind: "pair", pairKind: "PEI",
                  bondOrder: BOND_ORDER[ctx.mol.ligands[o.bondIndex!].bondType],
                  bondSymbols: [ctx.mol.centralAtom, ctx.mol.ligands[o.bondIndex!].symbol],
                }
              : { kind: "pair", pairKind: "PEB", ownerSymbol: o.ownerSymbol },
          )
        }
      />
    </group>
  );
}

/* ================= atom-atom ================= */

function CentralAtom({ ctx }: { ctx: FrameCtx }) {
  const grp = useRef<THREE.Group>(null);
  const style = atomStyle(ctx.mol.centralAtom);
  const el = getElement(ctx.mol.centralAtom);
  useFrame((_, rawDt) => {
    const dt = minDt(rawDt);
    const target = atomScale(ctx.viewMode);
    const cur = grp.current?.scale.x ?? 1;
    grp.current?.scale.setScalar(THREE.MathUtils.damp(cur, target, 5, dt));
  });
  return (
    <group ref={grp}>
      <AtomBall
        radius={style.radius}
        color={style.color}
        onClick={() => ctx.onPopup({ kind: "atom", symbol: ctx.mol.centralAtom })}
      />
      <group position={[0, style.radius + 0.34, 0]}>
        <AtomLabel
          symbol={ctx.mol.centralAtom}
          sub={ctx.stageNum <= 1 ? groupLabel(el.group) : undefined}
          onClick={() => ctx.onPopup({ kind: "atom", symbol: ctx.mol.centralAtom })}
        />
      </group>
    </group>
  );
}

function LigandItem({ i, ctx }: { i: number; ctx: FrameCtx }) {
  const grp = useRef<THREE.Group>(null);
  const st = useRef({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), init: false });
  const lig = ctx.mol.ligands[i];
  const style = atomStyle(lig.symbol);
  const el = getElement(lig.symbol);

  useFrame((_, rawDt) => {
    const dt = minDt(rawDt);
    if (!st.current.init) {
      ligandTarget(i, ctx, _v1);
      st.current.pos.copy(_v1).multiplyScalar(2.2);
      st.current.init = true;
    }
    ligandTarget(i, ctx, _v1);
    const repulse = ctx.stageNum === STAGE_ORDER.indexOf("domain-repulsion");
    if (repulse && !ctx.reduced) {
      springStep(st.current, _v1, 20, 4.4, dt); // wobble khas tolakan
    } else {
      dampV(st.current.pos, _v1, ctx.reduced ? 28 : 3.8, dt);
      st.current.vel.set(0, 0, 0);
    }
    ctx.live.current.lig[i].copy(st.current.pos);
    ctx.live.current.ligSpeed[i] = st.current.vel.length();
    grp.current?.position.copy(st.current.pos);
    const targetScale = atomScale(ctx.viewMode);
    const cur = grp.current?.scale.x ?? 1;
    grp.current?.scale.setScalar(THREE.MathUtils.damp(cur, targetScale, 5, dt));
  });

  return (
    <group ref={grp}>
      <AtomBall
        radius={style.radius}
        color={style.color}
        onClick={() => ctx.onPopup({ kind: "atom", symbol: lig.symbol })}
      />
      <group position={[0, style.radius + 0.34, 0]}>
        <AtomLabel
          symbol={lig.symbol}
          sub={ctx.stageNum <= 1 ? groupLabel(el.group) : undefined}
          onClick={() => ctx.onPopup({ kind: "atom", symbol: lig.symbol })}
        />
      </group>
    </group>
  );
}

/* ================= garis ikatan (morph dari PEI) ================= */

function BondItem({ i, ctx }: { i: number; ctx: FrameCtx }) {
  const outer = useRef<THREE.Group>(null);
  const slotRefs = useRef<(THREE.Group | null)[]>([]);
  const prog = useRef(0);
  const lig = ctx.mol.ligands[i];
  const k = BOND_ORDER[lig.bondType];
  const cCol = atomStyle(ctx.mol.centralAtom).color;
  const lCol = atomStyle(lig.symbol).color;
  const r = k > 1 ? 0.042 : 0.055;

  useFrame((_, rawDt) => {
    const dt = minDt(rawDt);
    const ligPos = ctx.live.current.lig[i];
    const len = ligPos.length();
    const target = ctx.stageNum >= STAGE_ORDER.indexOf("lewis-transition") ? 1 : 0;
    prog.current = THREE.MathUtils.damp(prog.current, target, ctx.reduced ? 30 : 5, dt);
    const vis = prog.current > 0.02 && len > 0.05;
    if (outer.current) outer.current.visible = vis;
    if (!vis || !outer.current) return;
    _v1.copy(ligPos).normalize();
    outer.current.quaternion.setFromUnitVectors(YUP, _v1);
    const sc = atomScale(ctx.viewMode);
    const spacefill = ctx.viewMode === "spacefill";
    const y0 = spacefill ? 0.05 : atomStyle(ctx.mol.centralAtom).radius * sc * 0.88;
    const y1 = spacefill ? len - 0.05 : len - atomStyle(lig.symbol).radius * sc * 0.88;
    const half = Math.max((y1 - y0) / 2, 0.04);
    slotRefs.current.forEach((g, s) => {
      if (!g) return;
      g.position.x = (s - (k - 1) / 2) * 0.14;
      const a = g.children[0] as THREE.Mesh;
      const b = g.children[1] as THREE.Mesh;
      a.position.y = y0 + half / 2;
      a.scale.set(1, Math.max(half * prog.current, 0.001), 1);
      b.position.y = y1 - half / 2;
      b.scale.set(1, Math.max(half * prog.current, 0.001), 1);
    });
  });

  return (
    <group ref={outer}>
      {Array.from({ length: k }).map((_, s) => (
        <group key={s} ref={(el) => { slotRefs.current[s] = el; }}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              ctx.onPopup({ kind: "bond", bondType: lig.bondType, symbols: [ctx.mol.centralAtom, lig.symbol] });
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <cylinderGeometry args={[r, r, 1, 10]} />
            <meshStandardMaterial color={cCol} roughness={0.4} />
          </mesh>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              ctx.onPopup({ kind: "bond", bondType: lig.bondType, symbols: [ctx.mol.centralAtom, lig.symbol] });
            }}
          >
            <cylinderGeometry args={[r, r, 1, 10]} />
            <meshStandardMaterial color={lCol} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ================= PEB pusat -> lobe ================= */

function LobeItem({ dir, ctx }: { dir: THREE.Vector3; ctx: FrameCtx }) {
  const isConclusion = ctx.stageId === "conclusion";
  
  // Logic visibilitas sesuai spesifikasi revisi 1
  // Terlihat mulai stage domain-repulsion
  // Di stage conclusion, visible = false memicu "Dissolve Animation" di DissolvingLonePair
  let visible = ctx.stageNum >= STAGE_ORDER.indexOf("domain-repulsion");
  
  // Jika conclusion, otomatis sembunyikan kecuali user force via toggle 'hideLonePairs' (👁)
  if (isConclusion && ctx.hideLonePairs) {
    visible = false;
  }
  
  // Jika stage molecular-shape-3d (9), default sembunyikan PEB
  if (ctx.stageId === "molecular-shape-3d" && ctx.hideLonePairs) {
    visible = false;
  }

  return (
    <DissolvingLonePair 
      dir={dir} 
      color={ctx.palette.lobe} 
      visible={visible} 
    />
  );
}

/* ================= energi tolakan (untuk FX) ================= */

function EnergyTracker({ live, energy }: { live: { current: LiveCtx }; energy: { current: number } }) {
  useFrame((_, rawDt) => {
    const dt = minDt(rawDt);
    const maxSpeed = live.current.ligSpeed.reduce((a, b) => Math.max(a, b), 0);
    const target = maxSpeed > 0.04 ? Math.min(1, maxSpeed * 0.8) : 0;
    energy.current = THREE.MathUtils.damp(energy.current, target, 3.5, dt);
  });
  return null;
}

/* ================= root view ================= */

export function MoleculeView({
  molecule, stageId, showLigandElectrons, hideLonePairs, showAngles,
  viewMode, palette, reducedMotion, onPopup,
}: {
  molecule: Molecule;
  stageId: StageId;
  showLigandElectrons: boolean;
  hideLonePairs: boolean;
  showAngles: boolean;
  viewMode: ViewMode;
  palette: ScenePalette;
  reducedMotion: boolean;
  onPopup: (p: LabPopup) => void;
}) {
  const plan = useMemo(() => buildLewisPlan(molecule), [molecule]);
  const geo = useMemo(() => buildGeo(molecule, plan), [molecule, plan]);
  const live = useRef<LiveCtx>({ lig: [], ligSpeed: [] });
  if (live.current.lig.length !== molecule.ligands.length) {
    live.current.lig = molecule.ligands.map(() => new THREE.Vector3());
    live.current.ligSpeed = molecule.ligands.map(() => 0);
  }
  const energy = useRef(0);
  const stageNum = STAGE_ORDER.indexOf(stageId);

  const ctx: FrameCtx = useMemo(
    () => ({
      mol: molecule, plan, geo, stageId, stageNum, t: 0, live,
      showLigandElectrons, hideLonePairs, showAngles, viewMode,
      reduced: reducedMotion, palette, onPopup,
    }),
    [molecule, plan, geo, stageId, stageNum, showLigandElectrons, hideLonePairs, showAngles, viewMode, reducedMotion, palette, onPopup],
  );

  const isRepulsion = stageNum === STAGE_ORDER.indexOf("domain-repulsion");

  return (
    <group>
      <EnergyTracker live={live} energy={energy} />
      <CentralAtom ctx={ctx} />
      {molecule.ligands.map((_, i) => (
        <LigandItem key={`lig-${i}`} i={i} ctx={ctx} />
      ))}
      {plan.dots.map((d) => (
        <DotItem key={d.id} dot={d} ctx={ctx} />
      ))}
      {molecule.ligands.map((_, i) => (
        <BondItem key={`bond-${i}`} i={i} ctx={ctx} />
      ))}
      {plan.outlines.map((o) => (
        <OutlineItem key={o.id} o={o} ctx={ctx} />
      ))}
      {geo.loneDirs.map((d, j) => (
        <LobeItem key={`lobe-${j}`} dir={d} ctx={ctx} />
      ))}

      {/* domain PEI sebagai penanda saat VSEPR */}
      {(isRepulsion || stageNum === STAGE_ORDER.indexOf("stable-geometry")) &&
        molecule.ligands.map((_, i) => (
          <DomainMarker
            key={`dm-${i}`}
            active
            color={palette.pei}
            getPos={() => _v3.copy(live.current.lig[i]).multiplyScalar(0.55)}
          />
        ))}

      {/* panah gaya tolak + denyut selama fase repulsi */}
      {isRepulsion && !reducedMotion && (
        <>
          {molecule.ligands.map((_, i) => (
            <ForceArrow
              key={`fa-${i}`}
              color={palette.force}
              energy={energy}
              getDir={() => _v2.copy(live.current.lig[i]).normalize()}
            />
          ))}
          {geo.loneDirs.map((d, j) => (
            <ForceArrow key={`fal-${j}`} color={palette.lobe} energy={energy} getDir={() => d} />
          ))}
          <PulseShells color={palette.force} energy={energy} />
        </>
      )}

      {/* busur sudut ikatan */}
      {showAngles && stageNum >= STAGE_ORDER.indexOf("stable-geometry") && geo.bondDirs.length >= 2 && (
        <BondAngleArc
          a={geo.bondDirs[0]}
          b={geo.bondDirs[1]}
          label={molecule.bondAngle}
          color={stageNum === STAGE_ORDER.indexOf("lone-pair-effect") ? palette.peb : palette.electronCentral}
          highlight={stageNum === STAGE_ORDER.indexOf("lone-pair-effect")}
        />
      )}
    </group>
  );
}
