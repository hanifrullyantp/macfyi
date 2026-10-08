"use client";

import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { Molecule, LabPopup } from "@/lib/types";
import { StageId, ViewMode } from "@/store/lab";
import { scenePalette } from "@/lib/cpk";
import { MoleculeView } from "./MoleculeView";

export interface MoleculeCanvasProps {
  molecule: Molecule;
  stageId: StageId;
  showLigandElectrons: boolean;
  hideLonePairs: boolean;
  showAngles: boolean;
  autoRotate: boolean;
  viewMode: ViewMode;
  theme: "light" | "dark";
  onPopup: (p: LabPopup) => void;
  resetToken: number;
  rotateSpeed: number;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

/** Kamera lembut mengikuti jarak ideal tiap fase (tanpa melawan zoom user). */
function CameraRig({ distance }: { distance: number }) {
  const { camera } = useThree();
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const dir = camera.position.clone();
    const dNow = dir.length();
    const d = THREE.MathUtils.damp(dNow, distance, 1.4, dt);
    if (Math.abs(d - dNow) > 0.01) {
      dir.normalize().multiplyScalar(d);
      camera.position.copy(dir);
    }
  });
  return null;
}

export function MoleculeCanvasInner(props: MoleculeCanvasProps) {
  const reduced = usePrefersReducedMotion();
  const palette = scenePalette(props.theme);
  const stageNum = STAGE_DISTANCE[props.stageId] ?? 7.4;
  const speed = reduced || !props.autoRotate ? 0 : props.rotateSpeed;

  return (
    <div className="canvas-bg absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.1, 8.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: "none" }}
        aria-label={`Model 3D molekul ${props.molecule.name}`}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        
        <Suspense fallback={null}>
          <Environment preset={props.theme === "dark" ? "night" : "city"} />
          <MoleculeView
            key={`${props.molecule.formula}-${props.resetToken}`}
            molecule={props.molecule}
            stageId={props.stageId}
            showLigandElectrons={props.showLigandElectrons}
            hideLonePairs={props.hideLonePairs}
            showAngles={props.showAngles}
            viewMode={props.viewMode}
            palette={palette}
            reducedMotion={reduced}
            onPopup={props.onPopup}
          />
          <ContactShadows
            position={[0, -3.5, 0]}
            opacity={0.4}
            scale={15}
            blur={2.5}
            far={4.5}
            color={props.theme === "dark" ? "#000000" : "#666666"}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={3.6}
          maxDistance={15}
          enableDamping
          dampingFactor={0.08}
          autoRotate={speed > 0}
          autoRotateSpeed={speed}
        />
        <CameraRig distance={stageNum} />
      </Canvas>
    </div>
  );
}

/** Jarak kamera ideal per fase pembelajaran */
const STAGE_DISTANCE: Record<StageId, number> = {
  "periodic-table": 9.4,
  "valence-electrons": 8.4,
  "electron-pairing": 8.0,
  "identify-pei-peb": 7.7,
  "lewis-transition": 7.4,
  "domain-repulsion": 7.2,
  "stable-geometry": 7.0,
  "lone-pair-effect": 6.7,
  "molecular-shape-3d": 6.4,
  conclusion: 7.0,
};

export default MoleculeCanvasInner;
