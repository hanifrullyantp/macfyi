import React, { useState } from 'react';
import { 
  ShieldAlert, UserPlus, ExternalLink, ShieldCheck, 
  MoreVertical, Edit3, Trash2, Ban, Mail, Clock, Shield
} from 'lucide-react';
import { cn } from '../utils/cn';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Viewer';
  status: 'active' | 'suspended';
  lastLogin: string;
  avatar?: string;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([
    { id: '1', name: 'Alex Rivera', email: 'alex@macfyi.com', role: 'Super Admin', status: 'active', lastLogin: '10 menit yang lalu' },
    { id: '2', name: 'Sarah Chen', email: 'sarah@macfyi.com', role: 'Admin', status: 'active', lastLogin: '2 jam yang lalu' },
    { id: '3', name: 'Michael Soto', email: 'm.soto@macfyi.com', role: 'Viewer', status: 'active', lastLogin: 'Dua hari yang lalu' },
    { id: '4', name: 'Emma Watson', email: 'emma@macfyi.com', role: 'Admin', status: 'suspended', lastLogin: '1 bulan yang lalu' },
    { id: '5', name: 'David Miller', email: 'david@macfyi.com', role: 'Admin', status: 'active', lastLogin: '5 jam yang lalu' },
  ]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Admin': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-600 shadow-[0_0_20px_rgba(225,6,0,0.1)]">
              <ShieldAlert size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Manajemen Akses</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
            Admin <span className="text-red-600 italic">Sistem</span>
          </h1>
          <p className="text-white/30 font-medium max-w-xl">
            Kelola administrator sistem, atur tingkat izin akses, dan pantau status keamanan akun di seluruh platform MacFYI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href="https://app.supabase.com" 
            target="_blank" 
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#16161C] border border-white/5 text-white/70 font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:border-red-500/30 hover:text-white"
          >
            <Shield size={16} />
            Supabase Auth
          </a>
          <button className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-red-600 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(225,6,0,0.3)] hover:scale-105 active:scale-95">
            <UserPlus size={16} />
            Undang Admin
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#16161C] border border-white/[0.05] rounded-3xl p-8 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-3xl group-hover:bg-red-500/10 transition-all" />
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">Total Administrator</span>
          <div className="text-4xl font-black text-white italic tracking-tighter tabular-nums">12</div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">8 Akun Aktif</span>
          </div>
        </div>
        <div className="bg-[#16161C] border border-white/[0.05] rounded-3xl p-8 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl" />
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">Login Hari Ini</span>
          <div className="text-4xl font-black text-white italic tracking-tighter tabular-nums">5</div>
          <div className="mt-4 flex items-center gap-2">
            <Clock size={12} className="text-white/20" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Rata-rata 4 jam sekali</span>
          </div>
        </div>
        <div className="bg-[#16161C] border border-white/[0.05] rounded-3xl p-8 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl" />
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">Undangan Pending</span>
          <div className="text-4xl font-black text-white italic tracking-tighter tabular-nums">2</div>
          <div className="mt-4 flex items-center gap-2">
            <Mail size={12} className="text-white/20" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Berakhir dalam 24 jam</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#16161C] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/[0.03]">
                <th className="px-8 py-6">Admin & Identitas</th>
                <th className="px-8 py-6">Role / Izin</th>
                <th className="px-8 py-6">Login Terakhir</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center font-black text-white/20 border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-red-500 transition-colors tracking-tight">{user.name}</span>
                        <span className="text-[11px] font-medium text-white/30">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn(
                      "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5",
                      getRoleColor(user.role)
                    )}>
                      {user.role === 'Super Admin' && <ShieldCheck size={10} />}
                      {user.role}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-white/40 tabular-nums">
                      <Clock size={14} className="text-white/10" />
                      {user.lastLogin}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                      user.status === 'active' ? "text-green-500" : "text-red-500"
                    )}>
                      <div className={cn("w-1 h-1 rounded-full animate-pulse", user.status === 'active' ? "bg-green-500" : "bg-red-500")} />
                      {user.status === 'active' ? 'Aktif' : 'Suspended'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={`https://app.supabase.com/auth/users?search=${user.id}`} 
                        target="_blank"
                        className="p-2 text-white/20 hover:text-white transition-colors"
                        title="Lihat di Supabase"
                      >
                        <ExternalLink size={18} />
                      </a>
                      <button className="p-2 text-white/20 hover:text-red-500 transition-colors">
                        <Edit3 size={18} />
                      </button>
                      <button className="p-2 text-white/20 hover:text-red-500 transition-colors">
                        <Ban size={18} />
                      </button>
                      <button className="p-2 text-white/20 hover:text-red-500 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-red-600/5 border border-red-500/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-inner overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(225,6,0,0.05),transparent)]" />
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 flex-shrink-0 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(225,6,0,0.1)] animate-pulse">
          <Mail size={32} />
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h3 className="text-xl font-black text-white tracking-tight mb-2">Manajemen Seluruh Pengguna <span className="text-red-600 italic">Segera Hadir</span></h3>
          <p className="text-white/30 text-xs font-medium leading-relaxed max-w-2xl">
            Kami sedang mengembangkan modul Edge Function baru untuk mengintegrasikan seluruh basis data Auth Supabase. 
            Nantinya Anda dapat mengelola ribuan pengguna aplikasi MacFYI langsung dari panel admin ini.
          </p>
        </div>
        <div className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase tracking-widest whitespace-nowrap">
          V3.0 Planned
        </div>
      </div>
    </div>
  );
};
