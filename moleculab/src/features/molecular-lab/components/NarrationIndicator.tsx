"use client";

import { motion } from "framer-motion";

export function NarrationIndicator({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="flex items-end gap-[2px] h-4 px-2" aria-hidden>
      <motion.div className="w-[3px] bg-primary rounded-full eq-bar eq-bar-1" />
      <motion.div className="w-[3px] bg-primary rounded-full eq-bar eq-bar-2" />
      <motion.div className="w-[3px] bg-primary rounded-full eq-bar eq-bar-3" />
    </div>
  );
}
