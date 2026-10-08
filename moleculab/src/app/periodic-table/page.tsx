"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Grid3X3 } from "lucide-react";
import { PeriodicTableApp } from "@/components/periodic-table";
import { Spinner } from "@/components/ui";
import { Term } from "@/components/ui";

function PeriodicInner() {
  const params = useSearchParams();
  const highlight = (params.get("highlight") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Grid3X3 className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Tabel Periodik Interaktif</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Kolom vertikal (<Term id="golongan-unsur">golongan</Term>) menentukan jumlah{" "}
            <Term id="elektron-valensi">elektron valensi</Term> — modal setiap atom untuk membentuk molekul.
            Klik unsur mana pun untuk melihat detailnya.
            {highlight.length > 0 && (
              <span className="mt-1 block font-semibold text-primary">
                Unsur bertanda menyala adalah penyusun molekul yang sedang kamu pelajari.
              </span>
            )}
          </p>
        </div>
      </div>
      <PeriodicTableApp highlightSymbols={highlight} />
    </div>
  );
}

export default function PeriodicTablePage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>}>
      <PeriodicInner />
    </Suspense>
  );
}
