"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PredictIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/predict/H2O");
  }, [router]);
  return null;
}
