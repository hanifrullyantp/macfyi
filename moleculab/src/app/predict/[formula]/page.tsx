import { notFound } from "next/navigation";
import { getMolecule } from "@/data/molecules";
import { PredictClient } from "./PredictClient";

export default async function PredictPage({ params }: { params: Promise<{ formula: string }> }) {
  const { formula } = await params;
  const molecule = getMolecule(formula);
  if (!molecule) notFound();
  return <PredictClient molecule={molecule} />;
}
