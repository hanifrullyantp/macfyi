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
      {/* Orbit 1 */}
      <ellipse
        cx="50"
        cy="50"
        rx="45"
        ry="18"
        transform="rotate(-45 50 50)"
        stroke="currentColor"
        strokeWidth="2"
        className="text-secondary opacity-30"
      />
      {/* Orbit 2 */}
      <ellipse
        cx="50"
        cy="50"
        rx="45"
        ry="18"
        transform="rotate(45 50 50)"
        stroke="currentColor"
        strokeWidth="2"
        className="text-secondary opacity-30"
      />

      {/* Elektron 1 pada Orbit 1 */}
      <circle r="4" className={cn("fill-secondary", animate && "animate-pulse")}>
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          path="M50,32 a45,18 -45 1,0 0.1,0"
          rotate="auto"
        />
      </circle>

      {/* Elektron 2 pada Orbit 2 */}
      <circle r="4" className={cn("fill-secondary", animate && "animate-bounce")}>
        <animateMotion
          dur="2.5s"
          repeatCount="indefinite"
          path="M50,32 a45,18 45 1,0 0.1,0"
          rotate="auto"
        />
      </circle>

      {/* Atom Pusat */}
      <circle cx="50" cy="50" r="16" className="fill-primary" />
      <circle cx="45" cy="45" r="5" fill="white" fillOpacity="0.3" />
    </svg>
  );
}
