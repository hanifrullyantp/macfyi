"use client";

import { BRAND } from "@/config/brand";
import { LogoMark } from "./LogoMark";
import { cn } from "@/lib/utils";

interface LogoFullProps {
  className?: string;
  withSubtitle?: boolean;
}

export function LogoFull({ className, withSubtitle = false }: LogoFullProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size="md" />
      <div className="flex flex-col leading-tight">
        <div className="font-display text-xl tracking-tight">
          <span className="font-normal text-foreground">Molecu</span>
          <span className="font-bold text-primary">lab</span>
        </div>
        {withSubtitle && (
          <span className="hidden text-[10px] font-medium tracking-wider text-muted lg:block">
            {BRAND.appSubtitle}
          </span>
        )}
      </div>
    </div>
  );
}
