import { Link } from 'react-router-dom';
import { 
  Key, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  RefreshCcw, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  Clock3,
  ChevronRight,
  CreditCard,
  Tag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { cn } from '../utils/cn';

// --- Mock Data ---

const REVENUE_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1} Okt`,
  amount: Math.floor(Math.random() * 5000000) + 2000000,
}));

const LICENSE_DATA = Array.from({ length: 14 }, (_, i) => ({
  date: `${i + 1} Okt`,
  count: Math.floor(Math.random() * 50) + 10,
}));

const FUNNEL_DATA = [
  { name: 'Kunjungan', value: 12000, fill: '#1e293b' },
  { name: 'Demo Dimulai', value: 8500, fill: '#334155' },
  { name: 'Demo Aktif', value: 4200, fill: '#475569' },
  { name: 'Trial', value: 1200, fill: '#991b1b' },
  { name: 'Berbayar', value: 450, fill: '#E10600' },
];

const RECENT_TRANSACTIONS = [
  { id: '1', date: '2023-10-24 14:20', email: 'user1@example.com', amount: 'Rp 499.000', status: 'success' },
  { id: '2', date: '2023-10-24 13:45', email: 'user2@example.com', amount: 'Rp 299.000', status: 'pending' },
  { id: '3', date: '2023-10-24 12:10', email: 'user3@example.com', amount: 'Rp 899.000', status: 'failed' },
  { id: '4', date: '2023-10-24 11:30', email: 'user4@example.com', amount: 'Rp 499.000', status: 'success' },
  { id: '5', date: '2023-10-24 10:15', email: 'user5@example.com', amount: 'Rp 499.000', status: 'success' },
];

const RECENT_ACTIVATIONS = [
  { id: '1', date: '2023-10-24 14:15', key: 'MFYI-XXXX-89AB', email: 'user1@example.com', device: 'macOS (M1 Max)' },
  { id: '2', date: '2023-10-24 13:20', key: 'MFYI-XXXX-45CD', email: 'user6@example.com', device: 'macOS (Intel)' },
  { id: '3', date: '2023-10-24 12:55', key: 'MFYI-XXXX-12EF', email: 'user7@example.com', device: 'macOS (M2)' },
  { id: '4', date: '2023-10-24 11:40', key: 'MFYI-XXXX-67GH', email: 'user8@example.com', device: 'macOS (M1)' },
  { id: '5', date: '2023-10-24 10:05', key: 'MFYI-XXXX-90IJ', email: 'user9@example.com', device: 'macOS (M1 Pro)' },
];

// --- Sub-components ---

const SummaryCard = ({ title, value, subtext, icon: Icon, trend, color, trendValue, sparkline }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className={cn(
      "relative overflow-hidden bg-[#16161C] border border-white/5 rounded-xl p-5 group transition-all duration-300 shadow-lg",
      `border-l-4 ${color}`
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-[#E10600]/10 group-hover:text-[#E10600] transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg",
          trend === 'up' ? "bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "bg-red-500/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
    <div className="space-y-1 relative z-10">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
      <div className="text-2xl font-black text-white italic tracking-tighter">{value}</div>
      <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
        {subtext}
      </p>
    </div>
    
    {sparkline && (
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-50 pointer-events-none overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={REVENUE_DATA.slice(-7)}>
            <Area type="monotone" dataKey="amount" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}

    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500 pointer-events-none" />
  </motion.div>
);

const ChartCard = ({ title, children, className }: any) => (
  <div className={cn("bg-[#16161C] border border-white/5 rounded-xl p-6 flex flex-col", className)}>
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-bold text-white">{title}</h3>
      <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
    <div className="flex-1 min-h-[240px]">
      {children}
    </div>
  </div>
);

export const Dashboard = () => {
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="text-[#E10600] italic">DASHBOARD</span>
            <span className="text-white/10 font-thin">/</span>
            <span className="text-white uppercase">Utama</span>
          </h1>
          <p className="text-gray-500 font-medium text-sm">Ikhtisar performa sistem finansial MacFYI hari ini.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#16161C] border border-white/5 rounded-xl p-1 shadow-inner">
            <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest bg-[#E10600] text-white rounded-lg shadow-lg shadow-red-500/20 transition-all italic">30 Hari</button>
            <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors italic">14 Hari</button>
            <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors italic">7 Hari</button>
          </div>
          <button className="p-3 bg-[#16161C] border border-white/5 rounded-xl text-gray-400 hover:text-[#E10600] transition-all hover:bg-[#E10600]/5 active:scale-95 shadow-lg group">
            <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Lisensi Aktif"
          value="2.842"
          subtext="+12 minggu ini"
          icon={Key}
          trend="up"
          trendValue="4.2%"
          color="border-l-[#E10600]"
        />
        <SummaryCard 
          title="Pendapatan (30 Hari)"
          value="Rp 142.450.000"
          subtext="+15.3% vs 30 hari lalu"
          icon={DollarSign}
          trend="up"
          trendValue="15.3%"
          color="border-l-green-500"
          sparkline
        />
        <SummaryCard 
          title="Penarikan Tertunda"
          value="8 / Rp 12.5M"
          subtext="Paling lama: 3 hari lalu"
          icon={Clock}
          color="border-l-yellow-500"
        />
        <SummaryCard 
          title="Konversi Demo → Berbayar"
          value="18.4%"
          subtext="450 konversi bulan ini"
          icon={TrendingUp}
          trend="down"
          trendValue="2.1%"
          color="border-l-blue-500"
        />
      </div>

      {/* Row 2: Revenue Chart & Pending Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Pendapatan (30 Hari)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E10600" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10 }}
                minTickGap={30}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(val) => `Rp${val / 1000000}jt`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#16161C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#E10600' }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#E10600" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAmount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-[#16161C] border border-white/5 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              Penarikan Tertunda
              <span className="bg-[#E10600] text-white text-[10px] px-2 py-0.5 rounded-full">8</span>
            </h3>
            <Link to="/withdrawals" className="text-xs font-bold text-[#E10600] hover:underline">Lihat Semua</Link>
          </div>
          <div className="flex-1 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg group hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                    <Clock3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Afiliasi #{1000 + i}</div>
                    <div className="text-[10px] text-gray-500">24 Okt 2023</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">Rp 1.250.000</div>
                  <div className="text-[10px] text-yellow-500 font-medium">Pending</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: License Bar Chart & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Lisensi Baru Per Hari (14 Hari)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LICENSE_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#16161C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {LICENSE_DATA.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === LICENSE_DATA.length - 1 ? '#E10600' : '#334155'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Corong Konversi (Demo → Paid)">
          <div className="flex flex-col h-full justify-between py-2">
            {FUNNEL_DATA.map((item, i) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-500 italic">{item.name}</span>
                  <span className="text-white">{item.value.toLocaleString()} <span className="text-gray-600 font-medium">({Math.round((item.value / FUNNEL_DATA[0].value) * 100)}%)</span></span>
                </div>
                <div className="relative h-6 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.03]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / FUNNEL_DATA[0].value) * 100}%` }}
                    transition={{ duration: 1.5, delay: i * 0.1, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-full flex items-center shadow-[0_0_15px_rgba(225,6,0,0.1)]"
                    style={{ 
                      backgroundColor: item.fill,
                      borderRight: i === FUNNEL_DATA.length - 1 ? '2px solid #E10600' : 'none'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Recent Transactions & Activations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#16161C] border border-white/5 rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#E10600]" />
              Transaksi Terakhir
            </h3>
            <Link to="/transactions" className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1">
              Lihat Semua
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/5">
                  <th className="px-6 py-4 font-bold">Tanggal</th>
                  <th className="px-6 py-4 font-bold">Email</th>
                  <th className="px-6 py-4 font-bold">Jumlah</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {RECENT_TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-xs text-gray-400">{tx.date}</td>
                    <td className="px-6 py-4 text-xs font-medium text-white">{tx.email}</td>
                    <td className="px-6 py-4 text-xs font-bold text-white">{tx.amount}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                        tx.status === 'success' ? "bg-green-500/10 text-green-500" : 
                        tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#16161C] border border-white/5 rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-[#E10600]" />
              Aktivasi Terakhir
            </h3>
            <Link to="/licenses" className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1">
              Lihat Semua
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/5">
                  <th className="px-6 py-4 font-bold">Tanggal</th>
                  <th className="px-6 py-4 font-bold">License Key</th>
                  <th className="px-6 py-4 font-bold">Email</th>
                  <th className="px-6 py-4 font-bold">Perangkat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {RECENT_ACTIVATIONS.map((act) => (
                  <tr key={act.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-xs text-gray-400">{act.date}</td>
                    <td className="px-6 py-4 text-xs font-mono text-[#E10600]">{act.key}</td>
                    <td className="px-6 py-4 text-xs text-white">{act.email}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{act.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 5: Promo Status Card */}
      <div className="bg-[#16161C] border border-white/5 rounded-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Tag className="w-32 h-32 rotate-12" />
        </div>
        <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-[#E10600] text-white text-[10px] font-black rounded-full uppercase tracking-tighter shadow-lg shadow-red-500/20">Aktif</span>
              <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">Promo Halloween 2023</h3>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-500">Diskon</div>
                <div className="text-xl font-black text-white italic">35% <span className="text-sm font-medium text-gray-500 not-italic">Persentase</span></div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-500">Slot Terpakai</div>
                <div className="text-xl font-black text-white italic">450 / 500</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-500">Berakhir Dalam</div>
                <div className="text-xl font-black text-white italic">12h 45m <span className="text-sm font-medium text-gray-500 not-italic">Detik</span></div>
              </div>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '90%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-red-600 to-[#E10600] rounded-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Status Checkout</span>
              </div>
              <span className="text-[10px] font-black text-green-500 uppercase italic">Terbuka</span>
            </div>
            <button className="w-full py-3 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/5">
              Edit Promo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
