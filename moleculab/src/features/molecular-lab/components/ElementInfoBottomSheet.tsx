"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { PeriodicTableMini, ElementDetailModal } from "@/components/periodic-table";
import { Molecule } from "@/lib/types";
import { useState } from "react";

interface ElementInfoBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  molecule: Molecule;
}

export function ElementInfoBottomSheet({ isOpen, onClose, molecule }: ElementInfoBottomSheetProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Info Unsur Penyusun">
        <div className="py-4">
          <PeriodicTableMini 
            molecule={molecule} 
            onPickElement={(symbol) => setSelectedElement(symbol)} 
          />
        </div>
      </BottomSheet>

      <ElementDetailModal 
        symbol={selectedElement} 
        onClose={() => setSelectedElement(null)} 
      />
    </>
  );
}
