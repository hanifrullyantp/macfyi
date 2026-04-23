import React, { useState } from 'react';
import { 
  Contact, UserPlus, Search, LayoutGrid, List, 
  MoreVertical, Mail, Phone, Clock, DollarSign, 
  Tag, Download, Plus, ChevronRight, X, Calendar, MessageSquare
} from 'lucide-react';
import { cn } from '../utils/cn';
import { AnimatePresence, motion, Reorder } from 'framer-motion';

type Stage = 'Lead' | 'Contacted' | 'Demo' | 'Trial' | 'Customer' | 'Churned';

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  stage: Stage;
  lastActivity: string;
  value: number;
  tags: string[];
}

const CRM_STAGES: Stage[] = ['Lead', 'Contacted', 'Demo', 'Trial', 'Customer', 'Churned'];

export const CRM: React.FC = () => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([
    { id: '1', name: 'John Smith', email: 'john@apple.com', company: 'Apple Inc.', stage: 'Lead', lastActivity: '2 jam yang lalu', value: 1200, tags: ['Enterprise', 'USA'] },
    { id: '2', name: 'Sarah Wilson', email: 'sarah@google.com', company: 'Google', stage: 'Trial', lastActivity: '5 menit yang lalu', value: 0, tags: ['Trial', 'AI'] },
    { id: '3', name: 'Michael Brown', email: 'm.brown@startup.io', company: 'Cloudly', stage: 'Customer', lastActivity: '1 hari yang lalu', value: 4500, tags: ['Business', 'SaaS'] },
    { id: '4', name: 'Emma Davis', email: 'emma@design.co', company: 'DesignCo', stage: 'Demo', lastActivity: '3 jam yang lalu', value: 800, tags: ['Design', 'Creative'] },
    { id: '5', name: 'David Miller', email: 'david@corp.net', stage: 'Lead', lastActivity: '5 jam yang lalu', value: 200, tags: ['Lead'] },
    { id: '6', name: 'Rachel Green', email: 'rachel@fashion.it', stage: 'Contacted', lastActivity: '1 minggu yang lalu', value: 0, tags: ['Fashion'] },
    { id: '7', name: 'Ross Geller', email: 'ross@paleo.org', stage: 'Churned', lastActivity: '1 bulan yang lalu', value: 500, tags: ['Expired'] },
  ]);

  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case 'Lead': return 'bg-blue-500';
      case 'Contacted': return 'bg-purple-500';
      case 'Demo': return 'bg-yellow-500';
      case 'Trial': return 'bg-orange-500';
      case 'Customer': return 'bg-green-500';
      case 'Churned': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-600 shadow-[0_0_20px_rgba(225,6,0,0.1)]">
              <Contact size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Hubungan Pelanggan</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
            CRM <span className="text-red-600 italic">Hub</span>
          </h1>
          <p className="text-white/30 font-medium max-w-xl">
            Kelola prospek, pantau tahapan penjualan, dan bangun hubungan jangka panjang dengan basis pengguna MacFYI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#16161C] border border-white/5 rounded-2xl mr-2">
            <button 
              onClick={() => setViewMode('board')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'board' ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'list' ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white"
              )}
            >
              <List size={18} />
            </button>
          </div>
          <button className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#16161C] border border-white/5 text-white/70 font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:border-red-500/30 hover:text-white group">
            <Download size={16} />
            Ekspor CSV
          </button>
          <button className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-red-600 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(225,6,0,0.3)] hover:scale-105 active:scale-95">
            <UserPlus size={16} />
            Tambah Kontak
          </button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'board' ? (
        <div className="flex gap-6 overflow-x-auto pb-10 custom-scrollbar -mx-4 px-4 h-[calc(100vh-320px)] min-h-[600px]">
          {CRM_STAGES.map((stage) => (
            <div key={stage} className="flex-shrink-0 w-80 flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", getStageColor(stage))} />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">{stage}</h3>
                  <span className="text-[10px] font-black text-white/20 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                    {contacts.filter(c => c.stage === stage).length}
                  </span>
                </div>
                <button className="p-1.5 text-white/10 hover:text-white transition-colors">
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {contacts.filter(c => c.stage === stage).map((contact) => (
                  <motion.div
                    layoutId={contact.id}
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="bg-[#16161C] border border-white/[0.05] rounded-3xl p-6 shadow-xl hover:border-red-500/20 transition-all group cursor-pointer active:scale-95 duration-500"
                  >
                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className="font-black text-white group-hover:text-red-500 transition-colors leading-tight">{contact.name}</h4>
                        <p className="text-[10px] font-medium text-white/30 truncate mt-1">{contact.email}</p>
                      </div>

                      {contact.company && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                          <LayoutGrid size={10} />
                          {contact.company}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {contact.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/[0.03] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-red-500">
                          <DollarSign size={12} />
                          {contact.value.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          <Clock size={10} />
                          {contact.lastActivity}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#16161C] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/[0.03]">
                  <th className="px-8 py-6">Nama & Kontak</th>
                  <th className="px-8 py-6">Perusahaan</th>
                  <th className="px-8 py-6">Tahap</th>
                  <th className="px-8 py-6">Potensi Nilai</th>
                  <th className="px-8 py-6">Tag</th>
                  <th className="px-8 py-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedContact(contact)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/20 border border-white/5">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white group-hover:text-red-500 transition-colors tracking-tight">{contact.name}</span>
                          <span className="text-[11px] font-medium text-white/30">{contact.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-white/40">{contact.company || '-'}</td>
                    <td className="px-8 py-6">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 text-white/80 shadow-lg",
                        getStageColor(contact.stage)
                      )}>
                        {contact.stage}
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-red-500 text-xs tabular-nums">${contact.value.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">{tag}</span>
                        ))}
                        {contact.tags.length > 2 && <span className="text-[9px] font-black text-white/10">+{contact.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-white/20 hover:text-white transition-colors">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedContact && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContact(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#0E0E11] border-l border-white/10 z-[110] shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-red-400 flex items-center justify-center font-black text-2xl text-white shadow-2xl">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter">{selectedContact.name}</h2>
                    <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-0.5">{selectedContact.stage}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-red-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10 pb-20">
                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all">
                    <Mail size={16} className="text-red-500" />
                    Kirim Email
                  </button>
                  <button className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all">
                    <Phone size={16} className="text-red-500" />
                    Telepon
                  </button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Informasi Kontak</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-3 border-b border-white/[0.03]">
                        <span className="text-xs font-bold text-white/40">Email</span>
                        <span className="text-xs font-bold text-white">{selectedContact.email}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-white/[0.03]">
                        <span className="text-xs font-bold text-white/40">Perusahaan</span>
                        <span className="text-xs font-bold text-white">{selectedContact.company || 'Pribadi'}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-white/[0.03]">
                        <span className="text-xs font-bold text-white/40">Total Deal</span>
                        <span className="text-xs font-black text-red-500">${selectedContact.value.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Timeline Aktivitas</h4>
                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/[0.03]">
                      {[
                        { icon: Mail, title: 'Email Dikirim', date: 'Baru saja', desc: 'Penawaran paket Business dikirim via email.' },
                        { icon: LayoutGrid, title: 'Status Berubah', date: '2 jam yang lalu', desc: 'Pindah dari Lead ke Tahap Penjualan.' },
                        { icon: MessageSquare, title: 'Demo Dimulai', date: 'Kemarin', desc: 'Melakukan sesi demo fitur manajemen lisensi.' },
                        { icon: Calendar, title: 'Pertemuan Dijadwalkan', date: '3 hari yang lalu', desc: 'Briefing awal dengan tim teknis.' },
                      ].map((event, idx) => (
                        <div key={idx} className="flex gap-5 relative group">
                          <div className="w-6 h-6 rounded-full bg-[#0E0E11] border-2 border-red-500 flex items-center justify-center text-red-500 z-10 group-hover:scale-125 transition-transform">
                            <event.icon size={10} strokeWidth={3} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h5 className="text-xs font-black text-white">{event.title}</h5>
                              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{event.date}</span>
                            </div>
                            <p className="text-[11px] text-white/40 font-medium mt-1 leading-relaxed">{event.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Catatan Internal</h4>
                  <textarea 
                    placeholder="Tambah catatan..."
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-red-500/30 h-32 transition-all"
                  />
                  <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    Simpan Catatan
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

