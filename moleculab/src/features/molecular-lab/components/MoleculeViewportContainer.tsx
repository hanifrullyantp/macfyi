"use client";

import { ReactNode } from "react";

interface MoleculeViewportContainerProps {
  children: ReactNode;
  overlay?: ReactNode;
}

export function MoleculeViewportContainer({ children, overlay }: MoleculeViewportContainerProps) {
  return (
    <div className="relative flex-1 min-h-[50dvh] w-full bg-background overflow-hidden">
      {/* 3D Canvas wrapper */}
      <div className="absolute inset-0 z-0">
        {children}
      </div>

      {/* Floating Anchors Layer */}
      <div className="pointer-events-none absolute inset-0 z-10 p-4">
        {overlay}
      </div>
    </div>
  );
}
