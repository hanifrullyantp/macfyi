"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { PeriodicTableMini, ElementDetailModal } from "@/components/periodic-table";
import { Molecule } from "@/lib/types";
import { useState } from "react";
import { formatFormula } from "@/lib/utils";

interface ElementInfoBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  molecule: Molecule;
}

export function ElementInfoBottomSheet({ isOpen, onClose, molecule }: ElementInfoBottomSheetProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Detail Molekul">
        <div className="py-2">
          <div className="mb-6 rounded-2xl bg-primary/5 border border-primary/10 p-5">
            <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
              {molecule.name}
            </h2>
            <div className="mt-2 flex items-center gap-2">
               <span className="text-xl font-bold text-primary">{formatFormula(molecule.formula)}</span>
               <span className="h-1 w-1 rounded-full bg-muted" />
               <span className="text-sm font-bold text-muted uppercase tracking-widest">{molecule.vseprType}</span>
            </div>
            <p className="mt-4 text-[13px] text-muted leading-relaxed">
               Gunakan tab di bawah untuk melihat rincian atom penyusun dan konfigurasi elektron valensinya.
            </p>
          </div>

          <div className="px-1">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-3 px-1">Atom Penyusun</h3>
            <PeriodicTableMini 
              molecule={molecule} 
              onPickElement={(symbol) => setSelectedElement(symbol)} 
            />
          </div>
        </div>
      </BottomSheet>

      <ElementDetailModal 
        symbol={selectedElement} 
        onClose={() => setSelectedElement(null)} 
      />
    </>
  );
}
