import React, { useState } from 'react';
import { 
  Wallet, Search, Download, Filter, 
  ChevronLeft, ChevronRight, CheckCircle2, 
  XCircle, Clock, Info, ChevronDown, MoreVertical,
  Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { StatusBadge, StatusType } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

const MOCK_WITHDRAWALS = Array.from({ length: 15 }, (_, i) => ({
  id: `WD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
  date: new Date(Date.now() - Math.random() * 5000000000),
  affiliate: ['Budi Santoso', 'Siti Aminah', 'Andi Wijaya', 'Dewi Lestari'][Math.floor(Math.random() * 4)],
  amount: Math.floor(Math.random() * 5000000) + 100000,
  method: ['Bank Transfer', 'E-Wallet (OVO)', 'E-Wallet (Dana)'][Math.floor(Math.random() * 3)],
  status: (['pending', 'approved', 'rejected', 'paid'][Math.floor(Math.random() * 4)]) as StatusType,
}));

export const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState(MOCK_WITHDRAWALS);
  const [selectedWd, setSelectedWd] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  const handleAction = () => {
    if (selectedWd && actionType) {
      setWithdrawals(prev => prev.map(w => 
        w.id === selectedWd.id ? { ...w, status: actionType === 'approve' ? 'approved' : 'rejected' } : w
      ));
      // Show toast
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Penarikan</h1>
            <p className="text-white/40 font-medium">Permintaan pembayaran komisi afiliasi</p>
          </div>
          {pendingCount > 0 && (
            <div className="px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse shadow-lg shadow-red-600/50">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {pendingCount} TERTUNDA
            </div>
          )}
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-white/5 transition-all">
          <Download size={18} />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#16161C] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={80} />
          </div>
          <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-2">Total Tertunda</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{pendingCount}</span>
            <span className="text-xs text-white/20 font-bold">permintaan</span>
          </div>
          <p className="text-xl font-bold text-white/40 mt-1">Rp 4.250.000</p>
        </div>
        <div className="bg-[#16161C] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 size={80} />
          </div>
          <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest mb-2">Disetujui Bulan Ini</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">24</span>
            <span className="text-xs text-white/20 font-bold">pembayaran</span>
          </div>
          <p className="text-xl font-bold text-white/40 mt-1">Rp 12.800.000</p>
        </div>
        <div className="bg-[#16161C] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <XCircle size={80} />
          </div>
          <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-2">Total Ditolak</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">3</span>
            <span className="text-xs text-white/20 font-bold">permintaan</span>
          </div>
          <p className="text-xl font-bold text-white/40 mt-1">Rp 450.000</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#16161C] border border-white/5 rounded-3xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              placeholder="Cari nama afiliasi..."
              className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>
          <div className="md:col-span-8 flex gap-3">
            <select className="bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-xs font-black text-white focus:outline-none">
              <option>Semua Status</option>
              <option>Tertunda</option>
              <option>Disetujui</option>
              <option>Ditolak</option>
              <option>Dibayar</option>
            </select>
            <button className="flex-1 bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-xs font-black text-white/40 hover:text-white transition-all">
              Rentang Tanggal
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#16161C] border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Tanggal</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Afiliasi</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Jumlah</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Metode</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.map((wd) => (
                <tr key={wd.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5 text-sm font-bold text-white/60">{format(wd.date, 'dd MMM yyyy')}</td>
                  <td className="px-6 py-5 font-black text-white">{wd.affiliate}</td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-white">Rp {wd.amount.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-6 py-5 text-xs font-bold text-white/40">{wd.method}</td>
                  <td className="px-6 py-5">
                    <StatusBadge status={wd.status} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    {wd.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedWd(wd); setActionType('approve'); }}
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => { setSelectedWd(wd); setActionType('reject'); }}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button className="p-2 rounded-xl bg-white/5 text-white/20 hover:text-white transition-all">
                        <MoreVertical size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={!!selectedWd && !!actionType}
        onClose={() => { setSelectedWd(null); setActionType(null); }}
        onConfirm={handleAction}
        title={actionType === 'approve' ? "Setujui Penarikan?" : "Tolak Penarikan?"}
        description={`Apakah Anda yakin ingin ${actionType === 'approve' ? 'menyetujui' : 'menolak'} penarikan senilai Rp ${selectedWd?.amount.toLocaleString('id-ID')} untuk ${selectedWd?.affiliate}?`}
        confirmText={actionType === 'approve' ? "Ya, Setujui" : "Ya, Tolak"}
        type={actionType === 'reject' ? 'danger' : 'info'}
      />
    </div>
  );
};
