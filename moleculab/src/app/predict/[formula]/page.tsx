import { notFound } from "next/navigation";
import { getMolecule, MOLECULES } from "@/data/molecules";
import { PredictClient } from "./PredictClient";

export function generateStaticParams() {
  return MOLECULES.map((m) => ({ formula: m.formula }));
}

export default async function PredictPage({ params }: { params: Promise<{ formula: string }> }) {
  const { formula } = await params;
  const molecule = getMolecule(formula);
  if (!molecule) notFound();
  return <PredictClient molecule={molecule} />;
}
