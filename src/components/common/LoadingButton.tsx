import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

export function LoadingButton({
  children,
  loading,
  loadingLabel = "Loading…",
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(className, "inline-flex items-center justify-center gap-2 min-w-[7rem]")}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
