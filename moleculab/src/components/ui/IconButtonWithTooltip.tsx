"use client";

import { ReactNode, useState, useRef } from "react";
import { 
  useFloating, 
  autoUpdate, 
  offset, 
  flip, 
  shift, 
  useHover, 
  useFocus, 
  useDismiss, 
  useRole, 
  useInteractions,
  FloatingPortal
} from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface IconButtonWithTooltipProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  active?: boolean;
}

export function IconButtonWithTooltip({
  icon,
  label,
  onClick,
  variant = "outline",
  disabled,
  className,
  active
}: IconButtonWithTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift()],
  });

  const hover = useHover(context, { move: false, delay: 400 });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Mobile Long Press Logic
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsOpen(true);
      if (window.navigator.vibrate) window.navigator.vibrate(10);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const variants = {
    primary: "bg-primary text-primary-foreground shadow-md border-transparent",
    secondary: "bg-secondary text-white border-transparent",
    outline: "bg-surface border-border text-foreground hover:bg-surface-hover",
    ghost: "bg-transparent border-transparent text-muted hover:text-foreground hover:bg-surface-hover",
    danger: "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20",
  };

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={onClick}
        onPointerDown={handleTouchStart}
        onPointerUp={handleTouchEnd}
        onPointerLeave={handleTouchEnd}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-90 disabled:opacity-30",
          variants[variant],
          active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          className
        )}
      >
        {icon}
      </button>

      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <motion.div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              initial={{ opacity: 0, scale: 0.85, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 5 }}
              className="z-[200] rounded-lg bg-foreground px-2.5 py-1.5 text-[10px] font-bold text-background shadow-xl"
            >
              {label}
            </motion.div>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}
