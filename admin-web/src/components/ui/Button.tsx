import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const variants = {
  primary: "bg-violet-600 text-white hover:bg-violet-500 border border-transparent",
  secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
  ghost: "bg-transparent text-zinc-300 hover:bg-zinc-800/80 border border-transparent",
  danger: "bg-red-600/90 text-white hover:bg-red-600 border border-transparent",
} as const;

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof variants;
    size?: "sm" | "md";
  }
>(function Button({ className, variant = "primary", size = "md", disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
