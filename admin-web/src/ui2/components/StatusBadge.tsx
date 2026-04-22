import React from "react";
import { cn } from "../utils/cn";

export type StatusType =
  | "active"
  | "expired"
  | "revoked"
  | "demo"
  | "success"
  | "pending"
  | "failed"
  | "refunded"
  | "approved"
  | "rejected"
  | "paid"
  | "settlement"
  | "completed"
  | "cancel"
  | "expire";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  active: { label: "Aktif", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  expired: { label: "Kadaluwarsa", color: "text-zinc-400", bgColor: "bg-white/5", borderColor: "border-white/10" },
  revoked: { label: "Dicabut", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
  demo: { label: "Demo", color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  success: { label: "Berhasil", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  pending: { label: "Tertunda", color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
  failed: { label: "Gagal", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
  refunded: { label: "Refund", color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20" },
  approved: { label: "Disetujui", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  rejected: { label: "Ditolak", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
  paid: { label: "Paid", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  settlement: { label: "Settlement", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  completed: { label: "Selesai", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  cancel: { label: "Cancel", color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
  expire: { label: "Expire", color: "text-zinc-400", bgColor: "bg-white/5", borderColor: "border-white/10" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const k = String(status ?? "").toLowerCase().trim();
  const config = statusConfig[k] ?? { label: String(status || "—"), color: "text-white/60", bgColor: "bg-white/5", borderColor: "border-white/10" };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
        config.color,
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <span className={cn("w-1 h-1 rounded-full mr-1.5", config.color.replace("text", "bg"))} />
      {config.label}
    </span>
  );
};

