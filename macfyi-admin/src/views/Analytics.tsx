import React from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Globe, MousePointer2, Clock, MapPin, TrendingUp, Download, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const visitData = [
  { name: 'Sen', visits: 4000, bounce: 2400 },
  { name: 'Sel', visits: 3000, bounce: 1398 },
  { name: 'Rab', visits: 2000, bounce: 3800 },
  { name: 'Kam', visits: 2780, bounce: 3908 },
  { name: 'Jum', visits: 1890, bounce: 4800 },
  { name: 'Sab', visits: 2390, bounce: 3800 },
  { name: 'Min', visits: 3490, bounce: 4300 },
];

const deviceData = [
  { name: 'Desktop', value: 65 },
  { name: 'Mobile', value: 30 },
  { name: 'Tablet', value: 5 },
];

const COLORS = ['#E10600', '#FF3B3B', '#800000'];

export const Analytics: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-2 space-y-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Mesin Analitik</h1>
          <p className="text-white/40 mt-2 text-lg font-medium">Analisis mendalam perilaku pengguna dan sumber trafik.</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all text-sm font-bold active:scale-95 shadow-lg">
            <Filter size={16} className="text-red-500" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all text-sm font-bold active:scale-95 shadow-lg shadow-red-900/20">
            <Download size={16} />
            Ekspor Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Kunjungan', value: '842.1k', icon: Globe, trend: '+12%', color: 'text-blue-500' },
          { label: 'Rasio Klik', value: '4.2%', icon: MousePointer2, trend: '+0.4%', color: 'text-red-500' },
          { label: 'Rata-rata Sesi', value: '12m 4s', icon: Clock, trend: '-2m', color: 'text-orange-500' },
          { label: 'Wilayah Teratas', value: 'Amerika Serikat', icon: MapPin, trend: 'Global', color: 'text-green-500' },
        ].map((item, i) => (
          <div key={i} className="glass-panel p-8 rounded-[2rem] border border-white/5 relative group overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] -mr-12 -mt-12 pointer-events-none group-hover:bg-red-500/5 transition-all duration-500" />
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3.5 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all", item.color.replace('text-', 'bg-').concat('/10'))}>
                <item.icon size={22} className={item.color} />
              </div>
              <div className="text-[10px] font-black bg-white/5 px-2 py-1 rounded-lg text-white/40 group-hover:text-red-500 transition-colors uppercase tracking-widest">
                {item.trend}
              </div>
            </div>
            <p className="text-sm font-bold text-white/30 uppercase tracking-[0.2em] mb-1">{item.label}</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 blur-[150px] -mr-64 -mt-64 pointer-events-none group-hover:bg-red-500/10 transition-all duration-1000" />
          
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Dinamika Trafik</h3>
              <p className="text-sm text-white/40 mt-1">Korelasi antara sesi dan rasio pantulan</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">Kunjungan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">Pantulan</span>
              </div>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitData}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E10600" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff20" fontSize={11} axisLine={false} tickLine={false} dy={15} />
                <YAxis stroke="#ffffff20" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16161C', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="visits" stroke="#E10600" strokeWidth={4} fillOpacity={1} fill="url(#colorVisits)" />
                <Area type="monotone" dataKey="bounce" stroke="rgba(255,255,255,0.2)" strokeWidth={2} fill="transparent" strokeDasharray="6 6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 flex flex-col group overflow-hidden">
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Pangsa Pasar</h3>
          <p className="text-xs text-white/30 mb-8 font-medium">Adopsi perangkat di antara pengguna aktif</p>
          
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-4xl font-black text-white">65%</div>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Dominasi Desktop</div>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {deviceData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#16161C', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4 mt-8">
            {deviceData.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{d.value}%</span>
                  <TrendingUp size={14} className={cn("text-white/20 group-hover:text-green-500 transition-colors", i !== 0 && "opacity-0")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
