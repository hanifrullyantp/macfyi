import React, { useState } from 'react';
import { 
  Users, Search, Download, TrendingUp, 
  BarChart3, DollarSign, Percent, Copy, 
  ExternalLink, MoreVertical, ChevronRight, ArrowLeft,
  Mail, Calendar, Briefcase, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { StatusBadge, StatusType } from '../components/StatusBadge';

const MOCK_AFFILIATES = Array.from({ length: 12 }, (_, i) => ({
  id: `AFF-${i + 100}`,
  name: ['Andi Pratama', 'Siti Herlina', 'Budi Sudarsono', 'Rina Wijaya'][Math.floor(Math.random() * 4)],
  email: `affiliate${i}@partner.com`,
  code: `MAC${1000 + i}`,
  referrals: Math.floor(Math.random() * 500) + 50,
  conversions: Math.floor(Math.random() * 100) + 5,
  earnings: Math.floor(Math.random() * 10000000) + 500000,
  status: (Math.random() > 0.2 ? 'active' : 'revoked') as StatusType,
}));

export const Affiliates = () => {
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);

  if (selectedAffiliate) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right duration-500">
        <button 
          onClick={() => setSelectedAffiliate(null)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-black uppercase tracking-widest text-[10px]">Kembali ke Daftar</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#16161C] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Award size={100} className="text-red-500" />
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center font-black text-3xl text-white mb-6 border border-white/10">
                {selectedAffiliate.name.charAt(0)}
              </div>
              <h1 className="text-3xl font-black text-white mb-2">{selectedAffiliate.name}</h1>
              <p className="text-white/40 font-bold flex items-center gap-2 mb-6">
                <Mail size={14} />
                {selectedAffiliate.email}
              </p>
              <div className="flex items-center gap-4">
                <StatusBadge status={selectedAffiliate.status} />
                <div className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-wider">
                  Partner Platinum
                </div>
              </div>
            </div>

            <div className="bg-[#16161C] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Kode Referal</h3>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/10 group">
                <code className="text-xl font-mono text-red-400 font-black">{selectedAffiliate.code}</code>
                <button className="p-2 text-white/20 hover:text-white"><Copy size={18} /></button>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Klik', value: selectedAffiliate.referrals, icon: Users, color: 'text-blue-500' },
                { label: 'Konversi', value: selectedAffiliate.conversions, icon: TrendingUp, color: 'text-emerald-500' },
                { label: 'Pendapatan', value: `Rp ${selectedAffiliate.earnings.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-amber-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#16161C] border border-white/5 rounded-3xl p-6">
                  <stat.icon size={20} className={cn("mb-4", stat.color)} />
                  <h4 className="text-2xl font-black text-white">{stat.value}</h4>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#16161C] border border-white/5 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-white">Riwayat Performa</h3>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase">Referal</button>
                  <button className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-[10px] font-black uppercase">Transaksi</button>
                  <button className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-[10px] font-black uppercase">Penarikan</button>
                </div>
              </div>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-white/10 font-black italic">
                Grafik Performa Segera Hadir
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Afiliasi</h1>
          <p className="text-white/40 font-medium">Manajemen mitra dan rujukan program afiliasi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Afiliasi', value: '128', icon: Users, color: 'text-blue-500' },
          { label: 'Aktif Bulan Ini', value: '42', icon: Briefcase, color: 'text-emerald-500' },
          { label: 'Komisi Dibayar', value: 'Rp 82.4M', icon: DollarSign, color: 'text-amber-500' },
          { label: 'Rata-rata Konversi', value: '14.2%', icon: Percent, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#16161C] border border-white/5 rounded-3xl p-5 group hover:border-white/10 transition-colors">
            <div className={cn("w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mb-4", stat.color)}>
              <stat.icon size={20} />
            </div>
            <h3 className="text-2xl font-black text-white group-hover:text-red-500 transition-colors">{stat.value}</h3>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#16161C] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Nama & Email</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Kode</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Referal</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Konversi</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Pendapatan</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_AFFILIATES.map((aff) => (
                <tr 
                  key={aff.id} 
                  className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedAffiliate(aff)}
                >
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white group-hover:text-red-500 transition-colors">{aff.name}</span>
                      <span className="text-[10px] font-bold text-white/20 uppercase">{aff.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-mono text-red-400 text-xs font-black tracking-widest">{aff.code}</td>
                  <td className="px-6 py-5 font-black text-white/60">{aff.referrals}</td>
                  <td className="px-6 py-5 font-black text-white/60">{aff.conversions}</td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-white">Rp {aff.earnings.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={aff.status} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 rounded-xl bg-white/5 text-white/20 group-hover:text-white group-hover:bg-red-600 transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
