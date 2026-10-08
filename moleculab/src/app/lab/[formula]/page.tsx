import { notFound } from "next/navigation";
import { getMolecule, MOLECULES } from "@/data/molecules";
import { LabClient } from "./LabClient";

export function generateStaticParams() {
  return MOLECULES.map((m) => ({ formula: m.formula }));
}

export default async function LabPage({ params }: { params: Promise<{ formula: string }> }) {
  const { formula } = await params;
  const molecule = getMolecule(formula);
  if (!molecule) notFound();
  return <LabClient molecule={molecule} />;
}
