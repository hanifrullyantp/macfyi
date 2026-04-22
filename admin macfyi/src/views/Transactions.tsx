import React, { useState } from 'react';
import { 
  CreditCard, Search, Download, Filter, 
  ChevronLeft, ChevronRight, Copy, ExternalLink, 
  Calendar, Info, ArrowUpRight, ArrowDownRight,
  TrendingUp, CheckCircle2, Clock, AlertCircle, X, ChevronDown, FileJson
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../utils/cn';
import { StatusBadge, StatusType } from '../components/StatusBadge';

const MOCK_TRANSACTIONS = Array.from({ length: 30 }, (_, i) => ({
  id: `TRX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
  date: new Date(Date.now() - Math.random() * 5000000000),
  email: `customer${i}@example.com`,
  amount: Math.floor(Math.random() * 1000000) + 50000,
  currency: 'IDR',
  method: ['Credit Card', 'Bank Transfer', 'E-Wallet'][Math.floor(Math.random() * 3)],
  status: (['success', 'pending', 'failed', 'refunded'][Math.floor(Math.random() * 4)]) as StatusType,
}));

export const Transactions = () => {
  const [selectedTrx, setSelectedTrx] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Transaksi</h1>
          <p className="text-white/40 font-medium">Riwayat pembayaran dan penagihan pelanggan</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSummary(!showSummary)}
            className={cn(
              "p-3 rounded-2xl border transition-all",
              showSummary ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/[0.03] border-white/10 text-white/40"
            )}
          >
            <TrendingUp size={20} />
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-white/5 transition-all">
            <Download size={18} />
            <span>CSV</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-white/5 transition-all">
            <FileJson size={18} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <AnimatePresence>
        {showSummary && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Pendapatan', value: 'Rp 45.2M', trend: '+12%', icon: CreditCard, color: 'text-emerald-500' },
                { label: 'Berhasil', value: '842', trend: '92%', icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Tertunda', value: '12', trend: '1.4%', icon: Clock, color: 'text-amber-500' },
                { label: 'Gagal', value: '8', trend: '0.9%', icon: AlertCircle, color: 'text-red-500' },
                { label: 'Rata-rata Pesanan', value: 'Rp 54k', trend: '+5%', icon: Info, color: 'text-blue-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#16161C] border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-colors group">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center", stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{stat.trend}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white group-hover:text-red-500 transition-colors">{stat.value}</h3>
                  <p className="text-xs font-bold text-white/20 uppercase mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="bg-[#16161C] border border-white/5 rounded-3xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Cari ID transaksi atau email..."
              className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>
          <div className="md:col-span-7 flex flex-wrap gap-4">
            <div className="relative">
              <select className="appearance-none bg-white/[0.02] border border-white/10 rounded-2xl py-3 pl-4 pr-10 text-xs font-black text-white focus:outline-none">
                <option>Semua Status</option>
                <option>Berhasil</option>
                <option>Tertunda</option>
                <option>Gagal</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
            </div>
            <div className="relative">
              <select className="appearance-none bg-white/[0.02] border border-white/10 rounded-2xl py-3 pl-4 pr-10 text-xs font-black text-white focus:outline-none">
                <option>Metode Pembayaran</option>
                <option>Kartu Kredit</option>
                <option>Transfer Bank</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
            </div>
            <button className="px-6 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-black text-white/40 hover:text-white transition-all">
              Rentang Tanggal
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#16161C] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">ID Transaksi</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Tanggal</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Email</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Jumlah</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Metode</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_TRANSACTIONS.map((trx) => (
                <tr 
                  key={trx.id} 
                  className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => { setSelectedTrx(trx); setIsDrawerOpen(true); }}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <code className="text-[13px] font-mono text-white/60 group-hover:text-red-400">{trx.id}</code>
                      <button className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-white transition-all"><Copy size={12} /></button>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-white/60">
                    {format(trx.date, 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-white/80">{trx.email}</td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-white">Rp {trx.amount.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-white/20" />
                      <span className="text-xs font-bold text-white/40">{trx.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={trx.status} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400">Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedTrx && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full max-w-[520px] bg-[#121217] border-l border-white/10 shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Detail Transaksi</h2>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-white/20 hover:text-white"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <section className="space-y-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <CreditCard size={120} />
                    </div>
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-2">Jumlah Total</label>
                    <h1 className="text-4xl font-black text-white mb-4">Rp {selectedTrx.amount.toLocaleString('id-ID')}</h1>
                    <StatusBadge status={selectedTrx.status} className="scale-110" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">ID Transaksi</label>
                      <code className="text-sm font-mono text-red-400">{selectedTrx.id}</code>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Metode</label>
                      <span className="text-sm font-bold text-white">{selectedTrx.method}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                    <Clock size={20} className="text-red-500" />
                    Timeline Pembayaran
                  </h3>
                  <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                    {[
                      { time: '14:20', event: 'Pembayaran Berhasil', status: 'completed', desc: 'Dana telah diterima oleh sistem' },
                      { time: '14:19', event: 'Verifikasi Gateway', status: 'processing', desc: 'Menunggu konfirmasi dari bank' },
                      { time: '14:18', event: 'Transaksi Dibuat', status: 'created', desc: 'Menunggu pembayaran dari pelanggan' },
                    ].map((step, i) => (
                      <div key={i} className="relative pl-10">
                        <div className={cn(
                          "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-[#121217] flex items-center justify-center",
                          i === 0 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-white/10"
                        )} />
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-black text-white">{step.event}</h4>
                          <span className="text-[10px] font-bold text-white/20">{step.time}</span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
