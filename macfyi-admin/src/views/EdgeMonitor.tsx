import React, { useState, useEffect } from 'react';
import { 
  Zap, RefreshCw, ExternalLink, ShieldCheck, 
  Activity, Clock, ChevronRight, Play, Server, AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';

interface EdgeFunction {
  id: string;
  name: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastInvoked: string;
  avgLatency: number;
}

export const EdgeMonitor: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [functions, setFunctions] = useState<EdgeFunction[]>([
    { id: '1', name: 'validate-license', endpoint: '/validate', status: 'healthy', lastInvoked: '2 menit yang lalu', avgLatency: 145 },
    { id: '2', name: 'process-payment', endpoint: '/payment', status: 'healthy', lastInvoked: '5 menit yang lalu', avgLatency: 320 },
    { id: '3', name: 'ai-proxy', endpoint: '/proxy', status: 'degraded', lastInvoked: '12 detik yang lalu', avgLatency: 680 },
    { id: '4', name: 'webhook-handler', endpoint: '/webhooks', status: 'healthy', lastInvoked: '1 jam yang lalu', avgLatency: 180 },
    { id: '5', name: 'generate-report', endpoint: '/reports', status: 'unknown', lastInvoked: '5 jam yang lalu', avgLatency: 0 },
    { id: '6', name: 'send-notification', endpoint: '/notify', status: 'down', lastInvoked: '3 jam yang lalu', avgLatency: 0 },
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      // Simulate update
      setFunctions(prev => prev.map(f => ({
        ...f,
        avgLatency: f.status === 'healthy' ? f.avgLatency + (Math.random() * 20 - 10) : f.avgLatency
      })));
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'degraded': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'down': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-white/30 bg-white/5 border-white/10';
    }
  };

  const getLatencyColor = (ms: number) => {
    if (ms === 0) return 'text-white/20';
    if (ms < 200) return 'text-green-400';
    if (ms < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-600 shadow-[0_0_20px_rgba(225,6,0,0.1)]">
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Infrastruktur Serverless</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
            Edge <span className="text-red-600 italic">Monitor</span>
          </h1>
          <p className="text-white/30 font-medium max-w-xl">
            Pantau status kesehatan, latensi, dan log dari Supabase Edge Functions yang menjalankan logika bisnis MacFYI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#16161C] border border-white/5 text-white/70 font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:border-red-500/30 hover:text-white group",
              isRefreshing ? "opacity-50 pointer-events-none" : ""
            )}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-red-500" : "group-hover:rotate-180 transition-transform duration-500"} />
            Perbarui Status
          </button>
          <a 
            href="https://app.supabase.com" 
            target="_blank" 
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-red-600 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(225,6,0,0.3)] hover:scale-105 active:scale-95"
          >
            <ExternalLink size={16} />
            Buka Supabase
          </a>
        </div>
      </div>

      {/* Grid Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {functions.map((fn) => (
          <div 
            key={fn.id}
            className="bg-[#16161C] border border-white/[0.05] rounded-[2rem] p-8 hover:border-red-500/20 transition-all duration-500 group relative overflow-hidden shadow-2xl"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[50px] group-hover:bg-red-500/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 group-hover:text-red-500 group-hover:border-red-500/20 group-hover:bg-red-500/5 transition-all duration-500">
                <Server size={24} />
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest",
                getStatusColor(fn.status)
              )}>
                {fn.status === 'healthy' ? 'Sehat' : fn.status === 'degraded' ? 'Degradasi' : fn.status === 'down' ? 'Mati' : 'Unknown'}
              </div>
            </div>

            <div className="space-y-1 mb-8">
              <h3 className="text-xl font-black text-white tracking-tight group-hover:text-red-500 transition-colors">{fn.name}</h3>
              <p className="text-[11px] font-mono text-white/20">{fn.endpoint}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/[0.02] border border-white/[0.03] rounded-2xl p-4">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Terakhir Dipanggil</span>
                <span className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                  <Clock size={12} className="text-red-500/50" />
                  {fn.lastInvoked}
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.03] rounded-2xl p-4">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Rata-rata Latensi</span>
                <span className={cn(
                  "text-xs font-black flex items-center gap-1.5",
                  getLatencyColor(fn.avgLatency)
                )}>
                  <Activity size={12} />
                  {fn.avgLatency === 0 ? '--' : `${Math.round(fn.avgLatency)}ms`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-red-600/10 hover:border-red-500/30 transition-all">
                <ShieldCheck size={14} />
                Cek Kesehatan
              </button>
              <button className="w-12 h-10 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.05] text-white/20 hover:text-red-500 hover:border-red-500/20 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}

        {/* Add Function Placeholder */}
        <div className="bg-[#16161C] border-2 border-dashed border-white/[0.05] rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-red-500/20 transition-all duration-500">
          <div className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/10 group-hover:text-red-500/50 transition-colors">
            <Zap size={28} />
          </div>
          <div className="text-center">
            <h4 className="text-white/40 font-black text-sm tracking-tight">Daftarkan Fungsi Baru</h4>
            <p className="text-[10px] text-white/10 font-bold uppercase tracking-widest mt-1">Konfigurasi di Platform Settings</p>
          </div>
        </div>
      </div>

      {/* Logs Preview */}
      <div className="bg-[#16161C] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl pb-20">
        <div className="p-8 border-b border-white/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center text-red-600">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Event Log Terbaru</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Aktivitas Fungsi Global</p>
            </div>
          </div>
          <button className="px-5 py-2.5 rounded-xl border border-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all">
            Hapus Semua Log
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/[0.03]">
                <th className="px-4 py-6">Waktu</th>
                <th className="px-4 py-6">Fungsi</th>
                <th className="px-4 py-6">Status</th>
                <th className="px-4 py-6">Latensi</th>
                <th className="px-4 py-6">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-5 text-[11px] font-medium text-white/40 tabular-nums">2024-03-15 14:{30+i}:45</td>
                  <td className="px-4 py-5">
                    <span className="text-xs font-bold text-white group-hover:text-red-500 transition-colors">validate-license</span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[11px] font-black text-white/60">200 OK</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-[11px] font-bold text-green-400/70">142ms</td>
                  <td className="px-4 py-5 text-[10px] font-mono text-white/20">req_78234{i}a8c2...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
