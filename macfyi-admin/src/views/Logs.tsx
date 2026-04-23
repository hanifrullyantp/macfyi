import React, { useState } from 'react';
import { 
  Terminal, Search, Filter, Trash2, Download, 
  AlertCircle, ShieldAlert, Bug, User, Clock, 
  ExternalLink, ChevronDown, ChevronRight, Copy, Check, Zap
} from 'lucide-react';
import { cn } from '../utils/cn';

type LogType = 'error' | 'admin';

export const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LogType>('error');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock Error Logs
  const errorLogs = [
    { id: '1', timestamp: '2024-03-15 14:30:12', severity: 'critical', source: 'Edge Function', message: 'validate-license: Timeout fetching from Supabase', count: 12, status: 'Unresolved' },
    { id: '2', timestamp: '2024-03-15 14:28:45', severity: 'error', source: 'Frontend', message: 'Uncaught TypeError: Cannot read property "id" of undefined', count: 45, status: 'Unresolved' },
    { id: '3', timestamp: '2024-03-15 14:15:20', severity: 'warning', source: 'Backend', message: 'High CPU usage detected on API node 4', count: 1, status: 'Resolved' },
    { id: '4', timestamp: '2024-03-15 13:50:11', severity: 'error', source: 'Database', message: 'PostgreSQL: Too many connections', count: 8, status: 'Unresolved' },
    { id: '5', timestamp: '2024-03-15 13:42:05', severity: 'critical', source: 'Edge Function', message: 'process-payment: Invalid API signature', count: 3, status: 'Unresolved' },
  ];

  // Mock Admin Activity Logs
  const adminLogs = [
    { id: '1', timestamp: '2024-03-15 14:35:00', admin: 'alex@macfyi.com', action: 'UPDATE', target: 'Setting', details: 'Changed maintenance_mode to true', ip: '182.1.24.12' },
    { id: '2', timestamp: '2024-03-15 14:20:12', admin: 'sarah@macfyi.com', action: 'DELETE', target: 'License', details: 'Revoked license key LIC-9023-XX', ip: '103.4.15.89' },
    { id: '3', timestamp: '2024-03-15 14:10:45', admin: 'admin@macfyi.com', action: 'LOGIN', target: 'Auth', details: 'Successful login from Jakarta, ID', ip: '36.85.12.44' },
    { id: '4', timestamp: '2024-03-15 13:55:30', admin: 'alex@macfyi.com', action: 'CREATE', target: 'Promo', details: 'Created new promo "RAMADAN2024"', ip: '182.1.24.12' },
    { id: '5', timestamp: '2024-03-15 13:40:00', admin: 'sarah@macfyi.com', action: 'EXPORT', target: 'Transaction', details: 'Exported 1,240 transactions to CSV', ip: '103.4.15.89' },
  ];

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'error': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'UPDATE': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'DELETE': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'LOGIN': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
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
              <Terminal size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Audit & Troubleshooting</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
            Log <span className="text-red-600 italic">Sistem</span>
          </h1>
          <p className="text-white/30 font-medium max-w-xl">
            Lacak setiap kejadian penting, audit aktivitas administrator, dan pantau kesalahan aplikasi secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-[#16161C] border border-white/5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('error')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all",
              activeTab === 'error' ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white"
            )}
          >
            Error Logs
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all",
              activeTab === 'admin' ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white"
            )}
          >
            Admin Audit
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Cari pesan, admin, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#16161C] border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-red-500/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          <button className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-[#16161C] border border-white/5 text-white/40 font-black text-[11px] uppercase tracking-widest hover:text-white hover:border-white/10 transition-all whitespace-nowrap">
            <Filter size={16} />
            Semua Sumber
            <ChevronDown size={14} className="text-white/10" />
          </button>
          <button className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-[#16161C] border border-white/5 text-white/40 font-black text-[11px] uppercase tracking-widest hover:text-white hover:border-white/10 transition-all whitespace-nowrap">
            <Download size={16} />
            Ekspor CSV
          </button>
          <button className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all whitespace-nowrap shadow-[0_0_20px_rgba(225,6,0,0.1)]">
            <Trash2 size={16} />
            Hapus Log
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#16161C] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl pb-10">
        <div className="overflow-x-auto">
          {activeTab === 'error' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/[0.03]">
                  <th className="px-8 py-6">Waktu & Severity</th>
                  <th className="px-8 py-6">Sumber</th>
                  <th className="px-8 py-6">Pesan Kesalahan</th>
                  <th className="px-8 py-6">Count</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {errorLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5">
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-medium text-white/30 tabular-nums">{log.timestamp}</div>
                        <div className={cn(
                          "px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest inline-block",
                          getSeverityColor(log.severity)
                        )}>
                          {log.severity}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-white/60">
                        {log.source === 'Edge Function' && <Zap size={14} className="text-red-500/40" />}
                        {log.source === 'Frontend' && <ExternalLink size={14} className="text-blue-500/40" />}
                        {log.source === 'Backend' && <Bug size={14} className="text-yellow-500/40" />}
                        {log.source === 'Database' && <Database size={14} className="text-purple-500/40" />}
                        {log.source}
                      </div>
                    </td>
                    <td className="px-8 py-5 max-w-md">
                      <div className="text-xs font-bold text-white group-hover:text-red-500 transition-colors line-clamp-2 leading-relaxed">
                        {log.message}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-white/20">{log.count}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                        log.status === 'Resolved' ? "text-green-500" : "text-red-500"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", log.status === 'Resolved' ? "bg-green-500" : "bg-red-500")} />
                        {log.status === 'Resolved' ? 'Selesai' : 'Aktif'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <button className="p-2 text-white/20 hover:text-white transition-colors">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/[0.03]">
                  <th className="px-8 py-6">Waktu</th>
                  <th className="px-8 py-6">Admin</th>
                  <th className="px-8 py-6">Aksi & Target</th>
                  <th className="px-8 py-6">Detail Perubahan</th>
                  <th className="px-8 py-6">IP Address</th>
                  <th className="px-8 py-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {adminLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5 text-[11px] font-medium text-white/30 tabular-nums">{log.timestamp}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 font-black text-[10px]">
                          {log.admin.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-white">{log.admin}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                          getActionColor(log.action)
                        )}>
                          {log.action}
                        </span>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{log.target}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-xs font-bold text-white/60 line-clamp-1">{log.details}</div>
                    </td>
                    <td className="px-8 py-5 text-[11px] font-mono text-white/20 tabular-nums">{log.ip}</td>
                    <td className="px-8 py-5">
                      <button className="p-2 text-white/20 hover:text-white transition-colors">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Placeholder */}
        <div className="p-8 border-t border-white/[0.02] flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Menampilkan 1-10 dari 2,450 log</span>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl border border-white/5 text-white/20 hover:text-white transition-all disabled:opacity-30" disabled>
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div className="flex gap-1">
              {[1, 2, 3].map(p => (
                <button key={p} className={cn(
                  "w-10 h-10 rounded-xl text-[11px] font-black transition-all",
                  p === 1 ? "bg-red-600 text-white shadow-lg" : "text-white/20 hover:bg-white/5"
                )}>
                  {p}
                </button>
              ))}
            </div>
            <button className="p-2 rounded-xl border border-white/5 text-white/20 hover:text-white transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Database = ({ size, className }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
