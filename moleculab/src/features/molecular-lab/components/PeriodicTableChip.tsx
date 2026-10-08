"use client";

import { motion } from "framer-motion";
import { Grid3X3, Info } from "lucide-react";
import { formatFormula } from "@/lib/utils";
import { Molecule } from "@/lib/types";

interface PeriodicTableChipProps {
  molecule: Molecule;
  onClick: () => void;
}

export function PeriodicTableChip({ molecule, onClick }: PeriodicTableChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-surface"
      aria-label="Informasi Molekul & Unsur"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Grid3X3 className="h-3.5 w-3.5" />
      </div>
      <span className="font-display text-sm font-bold tracking-tight">
        {formatFormula(molecule.formula)} <span className="mx-1 text-muted opacity-50">·</span> {molecule.vseprType}
      </span>
      <Info className="ml-1 h-3.5 w-3.5 text-muted" />
    </motion.button>
  );
}
