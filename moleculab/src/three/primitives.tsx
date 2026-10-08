"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Line, Html } from "@react-three/drei";

/* ============================================================
   Primitif 3D — semua visual kecil yang dipakai koreografi Lab.
   Komponen bersifat presentasional + imperative handle
   (setVisual) agar animasi per-frame tidak lewat React re-render.
   ============================================================ */

export interface VisualHandle {
  setVisual: (v: { opacity: number; scale: number }) => void;
}

export function circlePoints(radius: number, segments = 56): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius, 0]);
  }
  return pts;
}

/* ---------------- ElectronDot ----------------
   Aksesibilitas: bukan hanya warna!
   - elektron atom pusat  -> dot SOLID terisi penuh
   - elektron atom ligan  -> dot ber-outline (cincin) + isi transparan
     + pip titik tengah, sehingga tetap terbedakan di grayscale. */

interface ElectronDotProps {
  color: string;
  outlined: boolean;
  onClick?: () => void;
}

export const ElectronDot = forwardRef<VisualHandle, ElectronDotProps>(
  function ElectronDot({ color, outlined, onClick }, ref) {
    const grp = useRef<THREE.Group>(null);
    const mat = useRef<THREE.MeshStandardMaterial>(null);
    const ringMat = useRef<THREE.MeshBasicMaterial>(null);
    const pipMat = useRef<THREE.MeshBasicMaterial>(null);

    useImperativeHandle(ref, () => ({
      setVisual: ({ opacity, scale }) => {
        if (grp.current) grp.current.scale.setScalar(Math.max(scale, 0.0001));
        if (mat.current) mat.current.opacity = opacity * (outlined ? 0.62 : 1);
        if (ringMat.current) ringMat.current.opacity = opacity * 0.95;
        if (pipMat.current) pipMat.current.opacity = opacity;
      },
    }));

    return (
      <group ref={grp}>
        <mesh
          onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
          onPointerOver={onClick ? () => (document.body.style.cursor = "pointer") : undefined}
          onPointerOut={onClick ? () => (document.body.style.cursor = "") : undefined}
        >
          <sphereGeometry args={[outlined ? 0.058 : 0.082, 14, 12]} />
          <meshStandardMaterial
            ref={mat}
            color={color}
            transparent
            roughness={0.35}
            emissive={color}
            emissiveIntensity={0.35}
            depthWrite={false}
          />
        </mesh>
        {outlined && (
          <Billboard>
            <mesh raycast={() => null}>
              <ringGeometry args={[0.095, 0.125, 24]} />
              <meshBasicMaterial ref={ringMat} color={color} transparent side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh raycast={() => null}>
              <circleGeometry args={[0.024, 12]} />
              <meshBasicMaterial ref={pipMat} color={color} transparent depthWrite={false} />
            </mesh>
          </Billboard>
        )}
      </group>
    );
  },
);

/* ---------------- PairOutline (PEI / PEB dashed ring) ---------------- */

interface PairOutlineProps {
  color: string;
  radius: number;
  onClick?: () => void;
}

export const PairOutline = forwardRef<VisualHandle, PairOutlineProps>(
  function PairOutline({ color, radius, onClick }, ref) {
    const grp = useRef<THREE.Group>(null);
    const mat = useRef<any>(null);
    const pts = useMemo(() => circlePoints(radius), [radius]);

    useImperativeHandle(ref, () => ({
      setVisual: ({ opacity, scale }) => {
        if (grp.current) grp.current.scale.setScalar(Math.max(scale, 0.0001));
        if (mat.current) mat.current.opacity = opacity * 0.95;
      },
    }));

    return (
      <Billboard>
        <group ref={grp}>
          <Line
            points={pts}
            color={color}
            lineWidth={2.2}
            dashed
            dashSize={0.09}
            gapSize={0.06}
            transparent
            ref={mat}
            depthWrite={false}
          />
          {onClick && (
            <mesh
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "")}
            >
              <circleGeometry args={[radius * 1.25, 20]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      </Billboard>
    );
  },
);

/* ---------------- AtomBall & label ---------------- */

export function AtomBall({
  radius, color, onClick, ariaSymbol,
}: {
  radius: number; color: string; onClick?: () => void; ariaSymbol?: string;
}) {
  return (
    <mesh
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onPointerOver={onClick ? () => (document.body.style.cursor = "pointer") : undefined}
      onPointerOut={onClick ? () => (document.body.style.cursor = "") : undefined}
    >
      <sphereGeometry args={[radius, 36, 28]} />
      <meshStandardMaterial
        color={color}
        roughness={0.32}
        metalness={0.08}
        emissive={color}
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

export function AtomLabel({
  symbol, sub, onClick, tone = "default", distance = 7,
}: {
  symbol: string;
  sub?: string;
  onClick?: () => void;
  tone?: "default" | "pei" | "peb";
  distance?: number;
}) {
  const tones: Record<string, string> = {
    default: "border-border bg-surface/85 text-foreground",
    pei: "border-pei/70 bg-surface/85 text-pei",
    peb: "border-peb/70 bg-surface/85 text-peb",
  };
  return (
    <Html center distanceFactor={distance * 1.35} zIndexRange={[45, 0]} position={[0, 0, 0]}>
      <button
        onClick={onClick}
        aria-label={symbol}
        className={`pointer-events-auto select-none whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-bold leading-none shadow-sm backdrop-blur transition-transform hover:scale-110 ${tones[tone]}`}
        style={{ transform: "translateY(-1px)" }}
      >
        {symbol}
        {sub && <span className="ml-1 text-[9px] font-semibold opacity-70">{sub}</span>}
      </button>
    </Html>
  );
}

/* ---------------- LonePairLobe ---------------- */

export const LonePairLobe = forwardRef<VisualHandle, { dir: THREE.Vector3; color: string }>(
  function LonePairLobe({ dir, color }, ref) {
    const grp = useRef<THREE.Group>(null);
    const m1 = useRef<THREE.MeshStandardMaterial>(null);
    const m2 = useRef<THREE.MeshStandardMaterial>(null);
    const quat = useMemo(
      () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      [dir],
    );
    useImperativeHandle(ref, () => ({
      setVisual: ({ opacity, scale }) => {
        if (grp.current) grp.current.scale.setScalar(Math.max(scale, 0.0001));
        if (m1.current) m1.current.opacity = opacity * 0.85;
        if (m2.current) m2.current.opacity = opacity * 0.85;
      },
    }));
    return (
      <group ref={grp} quaternion={quat}>
        <mesh position={[0, 0.1, 0]} raycast={() => null}>
          <sphereGeometry args={[0.22, 20, 16]} />
          <meshStandardMaterial ref={m1} color={color} transparent roughness={0.5} emissive={color} emissiveIntensity={0.2} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.34, 0]} raycast={() => null}>
          <sphereGeometry args={[0.15, 18, 14]} />
          <meshStandardMaterial ref={m2} color={color} transparent roughness={0.5} emissive={color} emissiveIntensity={0.25} depthWrite={false} />
        </mesh>
      </group>
    );
  },
);

/* ---------------- ForceVectorArrow ---------------- */

export function ForceArrow({
  getDir, color, energy,
}: {
  getDir: () => THREE.Vector3;
  color: string;
  energy: React.MutableRefObject<number>;
}) {
  const grp = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const coneMat = useRef<THREE.MeshBasicMaterial>(null);
  const LEN = 0.62;
  useFrame(({ clock }) => {
    if (!grp.current) return;
    const dir = getDir();
    if (dir.lengthSq() < 0.001) return;
    grp.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    grp.current.position.copy(dir).normalize().multiplyScalar(0.62);
    const e = Math.min(1, Math.max(0, energy.current));
    const pulse = 0.85 + 0.25 * Math.sin(clock.elapsedTime * 5);
    grp.current.scale.setScalar(pulse);
    if (mat.current) mat.current.opacity = e * 0.9;
    if (coneMat.current) coneMat.current.opacity = e * 0.95;
  });
  return (
    <group ref={grp}>
      <mesh position={[0, LEN / 2, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.022, 0.022, LEN, 8]} />
        <meshBasicMaterial ref={mat} color={color} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, LEN + 0.08, 0]} raycast={() => null}>
        <coneGeometry args={[0.07, 0.18, 12]} />
        <meshBasicMaterial ref={coneMat} color={color} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------------- RepulsionPulseRings ---------------- */

export function PulseShells({ color, energy }: { color: string; energy: React.MutableRefObject<number> }) {
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const m1 = useRef<THREE.MeshBasicMaterial>(null);
  const m2 = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const e = Math.min(1, Math.max(0, energy.current));
    const ph1 = (t * 0.7) % 1;
    const ph2 = (t * 0.7 + 0.5) % 1;
    if (r1.current) r1.current.scale.setScalar(0.35 + ph1 * 2.1);
    if (r2.current) r2.current.scale.setScalar(0.35 + ph2 * 2.1);
    if (m1.current) m1.current.opacity = e * (1 - ph1) * 0.28;
    if (m2.current) m2.current.opacity = e * (1 - ph2) * 0.28;
  });
  return (
    <>
      <mesh ref={r1} raycast={() => null}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial ref={m1} color={color} transparent wireframe depthWrite={false} />
      </mesh>
      <mesh ref={r2} raycast={() => null}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial ref={m2} color={color} transparent wireframe depthWrite={false} />
      </mesh>
    </>
  );
}

/* ---------------- DomainMarker (penanda domain PEI saat VSEPR) ---------------- */

export function DomainMarker({
  getPos, color, active,
}: {
  getPos: () => THREE.Vector3;
  color: string;
  active: boolean;
}) {
  const grp = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const s = useRef(0);
  useFrame(({ clock }, dt) => {
    if (!grp.current) return;
    grp.current.position.copy(getPos());
    const target = active ? 1 : 0;
    s.current = THREE.MathUtils.damp(s.current, target, 6, Math.min(dt, 0.05));
    grp.current.scale.setScalar(Math.max(s.current * (1 + 0.12 * Math.sin(clock.elapsedTime * 4)), 0.0001));
    if (mat.current) mat.current.opacity = s.current * 0.95;
  });
  return (
    <group ref={grp}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial ref={mat} color={color} transparent emissive={color} emissiveIntensity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------------- BondAngleArc ---------------- */

export function BondAngleArc({
  a, b, radius = 1.05, label, color, highlight,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  radius?: number;
  label: string;
  color: string;
  highlight?: boolean;
}) {
  const pts = useMemo(() => {
    const va = a.clone().normalize();
    const vb = b.clone().normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(va.dot(vb), -1, 1));
    const seg = Math.max(12, Math.round((angle / Math.PI) * 36));
    const axis = new THREE.Vector3().crossVectors(va, vb);
    if (axis.lengthSq() < 1e-6) return null;
    axis.normalize();
    const q = new THREE.Quaternion();
    const out: [number, number, number][] = [];
    for (let i = 0; i <= seg; i++) {
      q.setFromAxisAngle(axis, (i / seg) * angle);
      const p = va.clone().applyQuaternion(q).multiplyScalar(radius);
      out.push([p.x, p.y, p.z]);
    }
    return out;
  }, [a, b, radius]);

  const mid = useMemo(() => {
    if (!pts) return new THREE.Vector3();
    const m = pts[Math.floor(pts.length / 2)];
    return new THREE.Vector3(m[0], m[1], m[2]).multiplyScalar(1.22);
  }, [pts]);

  if (!pts) return null;
  return (
    <group>
      <Line points={pts} color={color} lineWidth={highlight ? 3 : 2} transparent opacity={0.9} depthWrite={false} />
      <Html center distanceFactor={9.5} zIndexRange={[45, 0]} position={mid}>
        <span
          className="select-none whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold backdrop-blur"
          style={{ borderColor: color, color, background: "rgb(var(--surface) / 0.85)" }}
        >
          {label}
        </span>
      </Html>
    </group>
  );
}
