"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useSpring, animated, config } from "@react-spring/three";

interface DissolvingLonePairProps {
  dir: THREE.Vector3;
  color: string;
  visible: boolean;
}

export function DissolvingLonePair({ dir, color, visible }: DissolvingLonePairProps) {
  // Deteksi preferensi reduced motion
  const prefersReducedMotion = typeof window !== "undefined" 
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
    : false;

  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
    [dir]
  );

  // Animasi Looping Dissolve menggunakan React Spring
  const { scale, opacity } = useSpring({
    from: { scale: 0.1, opacity: 0 },
    to: async (next) => {
      if (visible) {
        // Tampilan normal
        await next({ scale: 1, opacity: 1, config: config.gentle });
      } else {
        if (prefersReducedMotion) {
          // Fade-out sederhana jika reduced motion aktif
          await next({ scale: 0.8, opacity: 0, config: { duration: 500 } });
        } else {
          // Dissolve Loop: Berdenyut 2x lalu menghilang
          await next({ scale: 1.2, opacity: 0.8, config: { duration: 400 } });
          await next({ scale: 0.85, opacity: 0.6, config: { duration: 400 } });
          await next({ scale: 1.1, opacity: 0.4, config: { duration: 400 } });
          await next({ scale: 0, opacity: 0, config: { duration: 400 } });
        }
      }
    },
    // Pastikan unmount logic di-handle parent (MoleculeView) agar tree tetap bersih
  });

  return (
    <animated.group
      quaternion={quat}
      position={dir.clone().multiplyScalar(0.32)}
      scale={scale}
    >
      <mesh position={[0, 0.1, 0]} raycast={() => null}>
        <sphereGeometry args={[0.22, 20, 16]} />
        <animated.meshStandardMaterial 
          color={color} 
          transparent 
          opacity={opacity}
          roughness={0.5} 
          emissive={color} 
          emissiveIntensity={0.2} 
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.34, 0]} raycast={() => null}>
        <sphereGeometry args={[0.15, 18, 14]} />
        <animated.meshStandardMaterial 
          color={color} 
          transparent 
          opacity={opacity}
          roughness={0.5} 
          emissive={color} 
          emissiveIntensity={0.25} 
          depthWrite={false}
        />
      </mesh>
    </animated.group>
  );
}
