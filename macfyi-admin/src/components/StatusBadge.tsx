import React from 'react';
import { cn } from '../utils/cn';

export type StatusType = 'active' | 'expired' | 'revoked' | 'demo' | 'success' | 'pending' | 'failed' | 'refunded' | 'approved' | 'rejected' | 'paid';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  active: { label: 'Aktif', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  expired: { label: 'Kadaluwarsa', color: 'text-zinc-500', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20' },
  revoked: { label: 'Dicabut', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  demo: { label: 'Demo', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  success: { label: 'Berhasil', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  pending: { label: 'Tertunda', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  failed: { label: 'Gagal', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  refunded: { label: 'Dikembalikan', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  approved: { label: 'Disetujui', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  rejected: { label: 'Ditolak', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  paid: { label: 'Dibayar', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
      config.color,
      config.bgColor,
      config.borderColor,
      className
    )}>
      <span className={cn("w-1 h-1 rounded-full mr-1.5", config.color.replace('text', 'bg'))} />
      {config.label}
    </span>
  );
};
