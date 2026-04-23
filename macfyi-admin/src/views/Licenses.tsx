import React, { useState, useEffect } from 'react';
import { 
  Key, Search, Download, Plus, MoreVertical, 
  Copy, ShieldAlert, X, ChevronLeft, ChevronRight, 
  Mail, Smartphone, History, CreditCard, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../utils/cn';
import { StatusBadge, StatusType } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

// Mock Data
const MOCK_LICENSES = Array.from({ length: 50 }, (_, i) => ({
  id: `lic_${Math.random().toString(36).substr(2, 9)}`,
  key: `${Math.random().toString(36).substr(2, 8).toUpperCase()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
  email: `user${i}@example.com`,
  plan: ['Demo', 'Monthly', 'Yearly', 'Lifetime'][Math.floor(Math.random() * 4)],
  status: (['active', 'active', 'expired', 'revoked', 'demo'][Math.floor(Math.random() * 5)]) as StatusType,
  activatedAt: new Date(Date.now() - Math.random() * 10000000000),
  expiresAt: Math.random() > 0.3 ? new Date(Date.now() + Math.random() * 10000000000) : null,
}));

export const Licenses = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [licenses, setLicenses] = useState(MOCK_LICENSES);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredLicenses = licenses.filter(lic => {
    const matchesSearch = lic.email.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                         lic.key.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === 'All' || lic.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesPlan = planFilter === 'All' || lic.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage);
  const paginatedLicenses = filteredLicenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Toast would go here
  };

  const handleRevoke = () => {
    if (selectedLicense) {
      setLicenses(prev => prev.map(lic => 
        lic.id === selectedLicense.id ? { ...lic, status: 'revoked' as StatusType } : lic
      ));
      if (selectedLicense) setSelectedLicense({ ...selectedLicense, status: 'revoked' });
      // Show success toast
    }
  };

  const exportCSV = () => {
    const headers = ['License Key,Email,Plan,Status,Activated,Expires'];
    const rows = filteredLicenses.map(lic => 
      `${lic.key},${lic.email},${lic.plan},${lic.status},${format(lic.activatedAt, 'yyyy-MM-dd')},${lic.expiresAt ? format(lic.expiresAt, 'yyyy-MM-dd') : 'Lifetime'}`
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licenses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Lisensi</h1>
          <p className="text-white/40 font-medium">Kelola semua lisensi perangkat lunak MacFYI</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-white/5 transition-all active:scale-95"
          >
            <Download size={18} />
            <span>Ekspor CSV</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all active:scale-95 shadow-lg shadow-red-600/20">
            <Plus size={18} />
            <span>Buat Lisensi</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#16161C] border border-white/5 rounded-3xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Cari berdasarkan email atau kunci..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all"
            />
          </div>
          
          <div className="md:col-span-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-white/[0.02] border border-white/10 rounded-2xl p-1">
              {['All', 'Active', 'Expired', 'Revoked'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all",
                    statusFilter === status ? "bg-red-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  )}
                >
                  {status === 'All' ? 'Semua Status' : status}
                </button>
              ))}
            </div>

            <div className="relative">
              <select 
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="appearance-none bg-white/[0.02] border border-white/10 rounded-2xl py-3 pl-4 pr-10 text-xs font-black text-white/60 focus:outline-none focus:border-red-500/50 transition-all cursor-pointer hover:bg-white/[0.04]"
              >
                <option value="All">Semua Paket</option>
                <option value="Demo">Demo</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Lifetime">Lifetime</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            </div>

            {(searchTerm || statusFilter !== 'All' || planFilter !== 'All') && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setPlanFilter('All');
                }}
                className="text-xs font-black text-red-500 hover:text-red-400 px-2"
              >
                Hapus Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#16161C] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Kunci Lisensi</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Email</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Paket</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Diaktifkan</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Kadaluwarsa</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLicenses.map((lic) => (
                <tr 
                  key={lic.id} 
                  className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => { setSelectedLicense(lic); setIsDrawerOpen(true); }}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <code className="text-[13px] font-mono text-white/60 group-hover:text-red-400 transition-colors">
                        {lic.key.substring(0, 8)}...
                      </code>
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(lic.key); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors underline decoration-white/10 underline-offset-4 decoration-dashed">{lic.email}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black border",
                      lic.plan === 'Lifetime' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-white/5 text-white/40 border-white/10"
                    )}>
                      {lic.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={lic.status} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col group/tip">
                      <span className="text-sm font-bold text-white/60">
                        {formatDistanceToNow(lic.activatedAt, { addSuffix: true, locale: id })}
                      </span>
                      <span className="text-[10px] text-white/20 group-hover/tip:text-white/40 transition-colors">
                        {format(lic.activatedAt, 'dd MMM yyyy')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-white/60">
                      {lic.expiresAt ? format(lic.expiresAt, 'dd MMM yyyy') : 'Selamanya'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-red-600 transition-all active:scale-95">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-white/20 uppercase tracking-widest">Baris per halaman:</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-black text-white focus:outline-none"
            >
              {[10, 25, 50, 100].map(val => <option key={val} value={val}>{val}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-white/40">
              Menampilkan <span className="text-white">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLicenses.length)}</span> dari <span className="text-white">{filteredLicenses.length}</span> lisensi
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-white/5 text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-white/5 text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedLicense && (
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
              {/* Drawer Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">Detail Lisensi</h2>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Sistem Manajemen Aset</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-3 rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* Section 1: License Info */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                      <Key size={20} />
                    </div>
                    <h3 className="text-lg font-black text-white">Informasi Utama</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-2">Hash Lisensi Penuh</label>
                      <div className="flex items-center gap-3">
                        <code className="text-sm font-mono text-red-400 break-all bg-red-500/5 px-2 py-1 rounded border border-red-500/10">{selectedLicense.key}</code>
                        <button 
                          onClick={() => copyToClipboard(selectedLicense.key)}
                          className="shrink-0 p-2 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Email Pengguna</label>
                        <a href={`mailto:${selectedLicense.email}`} className="text-sm font-bold text-white hover:text-red-500 transition-colors flex items-center gap-2">
                          {selectedLicense.email}
                          <Mail size={12} className="opacity-40" />
                        </a>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Paket Saat Ini</label>
                        <span className="text-sm font-bold text-amber-500">{selectedLicense.plan}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Status Lisensi</label>
                        <StatusBadge status={selectedLicense.status} />
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Diaktifkan</label>
                        <span className="text-sm font-bold text-white/80">{format(selectedLicense.activatedAt, 'dd MMM yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 2: Activations */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Smartphone size={20} />
                    </div>
                    <h3 className="text-lg font-black text-white">Riwayat Aktivasi Perangkat</h3>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/5">
                          <th className="px-5 py-4 font-black text-white/20 uppercase tracking-widest">Tanggal</th>
                          <th className="px-5 py-4 font-black text-white/20 uppercase tracking-widest">Fingerprint</th>
                          <th className="px-5 py-4 font-black text-white/20 uppercase tracking-widest">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[1, 2].map((_, i) => (
                          <tr key={i} className="hover:bg-white/[0.01]">
                            <td className="px-5 py-4 text-white/60 font-bold">{format(new Date(), 'dd/MM/yy HH:mm')}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <code className="text-emerald-500/80 font-mono">DEV-{Math.random().toString(36).substr(2, 6).toUpperCase()}...</code>
                                <button className="p-1 hover:text-white text-white/20"><Copy size={10}/></button>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-white/40">192.168.1.{Math.floor(Math.random() * 255)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Section 3: Actions */}
                <section className="pt-6 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setIsRevokeDialogOpen(true)}
                      disabled={selectedLicense.status === 'revoked'}
                      className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      <ShieldAlert size={18} />
                      Cabut Lisensi
                    </button>
                    <button className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
                      <History size={18} />
                      Perpanjang
                    </button>
                  </div>
                  <button className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white font-bold hover:bg-white/5 transition-all">
                    <CreditCard size={18} />
                    Ubah Paket Layanan
                  </button>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isRevokeDialogOpen}
        onClose={() => setIsRevokeDialogOpen(false)}
        onConfirm={handleRevoke}
        title="Cabut Lisensi?"
        description={`Apakah Anda yakin ingin mencabut lisensi untuk ${selectedLicense?.email}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Cabut"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
};
