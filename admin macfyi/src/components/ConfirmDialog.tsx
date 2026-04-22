import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onClose, onConfirm, title, description,
  confirmText = 'Konfirmasi', cancelText = 'Batal', type = 'info'
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#16161C] border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-start gap-5 mb-6">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              type === 'danger' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
            )}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">{title}</h3>
              <p className="text-white/40 leading-relaxed text-sm">{description}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={clsx(
                "flex-1 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-red-500/20",
                type === 'danger' ? "bg-red-600 hover:bg-red-500 text-white" : "bg-white text-black hover:bg-white/90"
              )}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import { clsx } from 'clsx';
