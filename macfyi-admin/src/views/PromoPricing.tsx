import React, { useState } from 'react';
import { 
  Tag, Plus, Save, History, 
  Trash2, AlertTriangle, ShieldCheck, RefreshCw,
  Clock, Check, X, AlertCircle, Eye, 
  ArrowRight, Layers, LayoutGrid, ToggleLeft, ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const PromoPricing = () => {
  const [isBlockingCheckout, setIsBlockingCheckout] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [promoName, setPromoName] = useState('Promo Merdeka');
  const [discountType, setDiscountType] = useState('Percentage');
  const [discountValue, setDiscountValue] = useState(25);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  const usedSlots = 84;
  const totalSlots = 100;

  if (showHistory) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right duration-500">
        <button 
          onClick={() => setShowHistory(false)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform" />
          <span className="font-black uppercase tracking-widest text-[10px]">Tutup Riwayat</span>
        </button>

        <div className="space-y-6">
          <h2 className="text-3xl font-black text-white">Riwayat Promo</h2>
          <div className="space-y-4">
            {[
              { date: 'Hari ini, 14:20', user: 'admin@email.com', change: 'Mengubah diskon dari 20% ke 25%' },
              { date: 'Kemarin, 09:15', user: 'admin@email.com', change: 'Reset kuota promo slot' },
              { date: '3 hari lalu', user: 'master@email.com', change: 'Mengaktifkan Promo Merdeka' },
            ].map((item, i) => (
              <div key={i} className="bg-[#16161C] border border-white/5 rounded-3xl p-6 flex items-start justify-between group hover:border-white/10 transition-colors">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center text-white/20 group-hover:text-red-500 transition-colors">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-black">{item.change}</h4>
                    <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-1">{item.date} • {item.user}</p>
                  </div>
                </div>
                <button className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest">Lihat Diff</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Promo & Harga</h1>
          <p className="text-white/40 font-medium">Konfigurasi promosi dan paket harga aktif</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
          >
            <History size={18} />
            <span>Riwayat</span>
          </button>
          <button 
            onClick={() => setIsPublishDialogOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
          >
            <ShieldCheck size={18} />
            <span>Terbitkan Perubahan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Editor */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-[#16161C] border border-white/5 rounded-3xl p-8 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <Tag size={20} />
              </div>
              <h3 className="text-xl font-black text-white">Rencana Promo Saat Ini</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block ml-1">Nama Promo</label>
                <input 
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-red-500 transition-all shadow-inner"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block ml-1">Jenis Diskon</label>
                <div className="flex bg-white/[0.02] border border-white/10 rounded-2xl p-1">
                  {['Percentage', 'Fixed'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setDiscountType(type)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-black transition-all",
                        discountType === type ? "bg-red-600 text-white shadow-lg" : "text-white/20 hover:text-white"
                      )}
                    >
                      {type === 'Percentage' ? 'Persentase (%)' : 'Tetap (IDR)'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block ml-1">Nilai Diskon</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:border-red-500 transition-all shadow-inner"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-black">
                    {discountType === 'Percentage' ? '%' : 'IDR'}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block ml-1">Paket yang Berlaku</label>
                <div className="flex flex-wrap gap-2">
                  {['Monthly', 'Yearly', 'Lifetime'].map(plan => (
                    <button key={plan} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-black text-white/40 hover:text-white hover:border-red-500/50 transition-all">
                      {plan.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 text-white font-black hover:bg-white/10 transition-all">
                <Save size={18} />
                Simpan Draft
              </button>
            </div>
          </section>

          <section className="bg-[#16161C] border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <LayoutGrid size={20} />
                </div>
                <h3 className="text-xl font-black text-white">Promo Slots</h3>
              </div>
              <button className="flex items-center gap-2 text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">
                <RefreshCw size={14} />
                Reset Kuota
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-3xl font-black text-white">{usedSlots} <span className="text-white/20">/ {totalSlots}</span></p>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Slot Terpakai</p>
                </div>
                <span className="text-emerald-500 font-black text-sm">{(usedSlots/totalSlots * 100).toFixed(0)}%</span>
              </div>
              <div className="h-4 bg-white/[0.03] border border-white/5 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(usedSlots/totalSlots * 100)}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Control */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-[#16161C] border border-white/5 rounded-3xl p-8 space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500" />
              Kontrol Checkout
            </h3>
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/5">
              <div className="space-y-1">
                <p className="font-black text-white">Blokir Checkout</p>
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Cegah Pembelian Baru</p>
              </div>
              <button 
                onClick={() => setIsBlockingCheckout(!isBlockingCheckout)}
                className="transition-all active:scale-90"
              >
                {isBlockingCheckout ? <ToggleRight size={48} className="text-red-600" /> : <ToggleLeft size={48} className="text-white/10" />}
              </button>
            </div>
            {isBlockingCheckout && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-500/80 leading-relaxed">
                  Perhatian: Checkout saat ini diblokir. Tidak ada transaksi baru yang dapat dilakukan.
                </p>
              </div>
            )}
          </section>

          <section className="bg-gradient-to-br from-red-600/20 to-transparent border border-red-500/10 rounded-3xl p-8 space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-3">
              <RefreshCw size={20} className="text-white/40" />
              Versi Konfigurasi
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Versi Sekarang</span>
                <span className="px-3 py-1 rounded-lg bg-white/10 text-white font-black text-xs">v2.3.1</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Patch', 'Minor', 'Major'].map(v => (
                  <button key={v} className="py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] text-center pt-4 border-t border-white/5">
              Diterbitkan 2 jam lalu oleh admin
            </p>
          </section>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onConfirm={() => {}}
        title="Terbitkan Perubahan?"
        description="Ini akan memperbarui konfigurasi live dan mempengaruhi semua harga di halaman checkout. Lanjutkan?"
        confirmText="Ya, Terbitkan"
        type="info"
      />
    </div>
  );
};
