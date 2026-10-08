"use client";

import { ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: string; // e.g. "60dvh"
}

export function BottomSheet({ isOpen, onClose, title, children, maxHeight = "75dvh" }: BottomSheetProps) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            dragControls={dragControls}
            dragListener={false}
            className="fixed bottom-0 left-0 right-0 z-[101] mx-auto w-full max-w-2xl overflow-hidden rounded-t-[2.5rem] border-t border-border bg-surface shadow-2xl"
            style={{ maxHeight }}
          >
            {/* Handle & Header */}
            <div 
              className="flex cursor-grab flex-col items-center py-3 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="h-1.5 w-12 rounded-full bg-border" />
              {title && (
                <div className="mt-2 flex w-full items-center justify-between px-6">
                  <h3 className="font-display text-lg font-bold">{title}</h3>
                  <button
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-muted transition-colors hover:text-foreground"
                    aria-label="Tutup"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="custom-scrollbar overflow-y-auto px-6 pb-10" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
