"use client";

import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animate?: boolean;
}

export function LogoMark({ size = "md", className, animate = true }: LogoMarkProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-20 w-20",
  };

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizes[size], className)}
    >
      <defs>
        <path id="orbitPath" d="M 5,50 A 45,15 0 1 0 95,50 A 45,15 0 1 0 5,50" />
      </defs>

      {/* Orbit 1 */}
      <g transform="rotate(-45 50 50)">
        <use href="#orbitPath" stroke="currentColor" strokeWidth="2.5" className="text-secondary opacity-20" fill="none" />
        {animate && (
          <circle r="4" className="fill-secondary shadow-lg">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto">
              <mpath href="#orbitPath" />
            </animateMotion>
          </circle>
        )}
      </g>

      {/* Orbit 2 */}
      <g transform="rotate(45 50 50)">
        <use href="#orbitPath" stroke="currentColor" strokeWidth="2.5" className="text-secondary opacity-20" fill="none" />
        {animate && (
          <circle r="4" className="fill-secondary shadow-lg">
            <animateMotion dur="2.2s" repeatCount="indefinite" rotate="auto">
              <mpath href="#orbitPath" />
            </animateMotion>
          </circle>
        )}
      </g>

      {/* Atom Pusat */}
      <circle cx="50" cy="50" r="16" className="fill-primary shadow-xl" />
      <circle cx="44" cy="44" r="5" fill="white" fillOpacity="0.4" />
    </svg>
  );
}
