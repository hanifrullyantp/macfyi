import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { playNotificationChime } from "../lib/playChime";

export function NotificationBanner({
  visible,
  text,
  soundOnShow,
  soundOnDismiss,
  onDismiss,
  accentColor,
}: {
  visible: boolean;
  text: string;
  soundOnShow: boolean;
  soundOnDismiss: boolean;
  onDismiss: () => void;
  accentColor?: string;
}) {
  const playedShow = useRef(false);

  useEffect(() => {
    if (visible && soundOnShow && !playedShow.current) {
      playedShow.current = true;
      playNotificationChime();
    }
    if (!visible) playedShow.current = false;
  }, [visible, soundOnShow]);

  const dismiss = () => {
    if (soundOnDismiss) playNotificationChime();
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b border-white/10"
          style={{ backgroundColor: accentColor ? `${accentColor}22` : "rgba(239,68,68,0.12)" }}
        >
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm text-center relative">
            <p className="text-white/90 flex-1 pr-8">{text}</p>
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              aria-label="Tutup banner"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
