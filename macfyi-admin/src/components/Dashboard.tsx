import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Key, 
  Clock, 
  Download,
  Plus,
  MessageSquare,
  Search,
  RefreshCw,
  Settings
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const revenueData = [
  { day: 'Mon', value: 2400 },
  { day: 'Tue', value: 3200 },
  { day: 'Wed', value: 2800 },
  { day: 'Thu', value: 4500 },
  { day: 'Fri', value: 3900 },
  { day: 'Sat', value: 5100 },
  { day: 'Sun', value: 4800 },
];



export const Dashboard = () => {
  return (
    <div className="p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            Dashboard
            <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse ring-4 ring-green-500/20" title="System Live"></span>
          </h1>
          <p className="text-white/40 mt-2 text-lg font-medium">Real-time performance metrics and system health.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="hidden xl:flex items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/40 hover:text-white/60 transition-colors cursor-pointer group">
            <Search size={14} className="mr-2 group-hover:text-red-500 transition-colors" />
            <span className="text-red-500/60 mr-2">⌘K</span> Quick Search
          </div>
          <div className="flex bg-[#16161C] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <button className="px-5 py-2 text-xs font-bold bg-[#E10600] text-white rounded-xl shadow-xl shadow-red-900/20">Last 30 Days</button>
            <button className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white transition-colors">YTD</button>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all text-sm font-bold active:scale-95 shadow-lg">
            <Download size={16} className="text-red-500" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Gross Revenue" 
          value="$128,430.22" 
          trend="+12.5%" 
          trendUp={true} 
          icon={DollarSign}
          subtitle="vs. $114,160 last month"
        />
        <StatCard 
          label="Active Licenses" 
          value="12,543" 
          trend="+8.2%" 
          trendUp={true} 
          icon={Key}
          subtitle="412 new issued today"
        />
        <StatCard 
          label="Pending Payouts" 
          value="$12,840" 
          trend="-4.1%" 
          trendUp={false} 
          icon={Clock}
          subtitle="8 requests waiting"
        />
        <StatCard 
          label="Conversion Rate" 
          value="14.8%" 
          trend="+2.4%" 
          trendUp={true} 
          icon={TrendingUp}
          subtitle="Up from 12.4% avg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Main Chart */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-8 relative group overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#E10600]/5 blur-[120px] -mr-48 -mt-48 pointer-events-none group-hover:bg-[#E10600]/10 transition-all duration-1000" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div>
              <h3 className="text-xl font-bold text-white">Revenue Analysis</h3>
              <p className="text-sm text-white/40 mt-1">Platform earnings across all active gateways</p>
            </div>
            <div className="flex bg-[#0E0E11] p-1.5 rounded-xl border border-white/5 shadow-inner">
              <button className="px-4 py-1.5 text-[10px] font-black bg-white/10 text-white rounded-lg shadow-lg">PAID</button>
              <button className="px-4 py-1.5 text-[10px] font-black text-white/30 hover:text-white transition-colors">SETTLEMENT</button>
            </div>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E10600" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600 }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600 }} 
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#16161C', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                    padding: '12px'
                  }} 
                  itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}
                  cursor={{ stroke: '#E10600', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#E10600" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center & Quick Config */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5">
            <h3 className="text-xs font-black text-white/30 uppercase tracking-widest mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Plus size={18} />, label: "License", color: "text-red-500", bg: "bg-red-500/10" },
                { icon: <MessageSquare size={18} />, label: "Support", color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: <Search size={18} />, label: "Search", color: "text-purple-500", bg: "bg-purple-500/10" },
                { icon: <RefreshCw size={18} />, label: "Sync", color: "text-green-500", bg: "bg-green-500/10" },
              ].map((action, i) => (
                <button key={i} className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all group active:scale-95">
                  <div className={`p-3 rounded-xl ${action.bg} ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                    {action.icon}
                  </div>
                  <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Editor Style Promo Panel */}
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
            <div className="bg-white/5 px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                <Settings size={12} />
                config.json
              </div>
            </div>
            <div className="p-6 font-mono text-[11px] bg-[#08080A] leading-relaxed relative group">
              <div className="space-y-1">
                <div className="flex gap-4"><span className="text-white/10 w-4 select-none">1</span> <span className="text-purple-400">{"{"}</span></div>
                <div className="flex gap-4"><span className="text-white/10 w-4 select-none">2</span> <span className="ml-4"><span className="text-red-400">"promo"</span>: <span className="text-green-400">"SUMMER24"</span>,</span></div>
                <div className="flex gap-4"><span className="text-white/10 w-4 select-none">3</span> <span className="ml-4"><span className="text-red-400">"off"</span>: <span className="text-orange-400">0.25</span>,</span></div>
                <div className="flex gap-4"><span className="text-white/10 w-4 select-none">4</span> <span className="ml-4"><span className="text-red-400">"status"</span>: <span className="text-blue-400">"active"</span></span></div>
                <div className="flex gap-4"><span className="text-white/10 w-4 select-none">5</span> <span className="text-purple-400">{"}"}</span></div>
              </div>
              <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all bg-red-600 hover:bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-xl translate-y-2 group-hover:translate-y-0">
                EDIT
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Modern Transaction Table */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-8 border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Live Activity</h3>
              <p className="text-sm text-white/40 mt-1">Incoming settlement flow from global gateways</p>
            </div>
            <button className="text-xs text-red-500 font-black hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-red-500/20">
              VIEW HISTORY
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                  <th className="pb-4 font-black">Entity</th>
                  <th className="pb-4 font-black">Status</th>
                  <th className="pb-4 font-black">Method</th>
                  <th className="pb-4 font-black text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                <TableRow 
                  user="Marcus Chen" 
                  email="m.chen@example.com"
                  status="Successful"
                  method="Stripe API"
                  amount="+$49.00"
                  type="success"
                />
                <TableRow 
                  user="Sarah Jenkins" 
                  email="sarah.j@outlook.com"
                  status="Pending"
                  method="PayPal v2"
                  amount="$1,240.00"
                  type="pending"
                />
                <TableRow 
                  user="TechFlow SaaS" 
                  email="billing@techflow.io"
                  status="Successful"
                  method="Wire Swift"
                  amount="+$899.00"
                  type="success"
                />
                <TableRow 
                  user="Unknown Node" 
                  email="node_9281@macfyi.io"
                  status="Failed"
                  method="Crypto"
                  amount="$29.00"
                  type="failed"
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Timeline Widget */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-8">System Logs</h3>
          <div className="flex-1 space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
            {[
              { user: 'Admin', action: 'Auth: new session established', time: '2m ago', color: 'bg-blue-500' },
              { user: 'System', action: 'Licensing: issued 12 keys', time: '14m ago', color: 'bg-red-500' },
              { user: 'Firewall', action: 'Security: blocked CIDR 192.x', time: '45m ago', color: 'bg-orange-500' },
              { user: 'Worker', action: 'Queue: background sync complete', time: '1h ago', color: 'bg-green-500' },
              { user: 'Dev', action: 'Config: updated API endpoint', time: '3h ago', color: 'bg-purple-500' },
            ].map((item, i) => (
              <div key={i} className="relative pl-10 group cursor-default">
                <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full ${item.color}/10 border-4 border-[#0E0E11] flex items-center justify-center z-10 group-hover:scale-110 transition-transform`}>
                  <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_10px_${item.color}]`}></div>
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">
                    <span className="text-white/40 font-mono mr-2">[{item.user}]</span> 
                    <span className="group-hover:text-red-400 transition-colors">{item.action}</span>
                  </div>
                  <div className="text-[10px] font-black text-white/20 mt-2 tracking-widest uppercase">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-8 w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 hover:text-white hover:bg-white/10 hover:border-red-500/20 transition-all uppercase tracking-widest">
            Audit Full Logs
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, trend, trendUp, icon: Icon, subtitle }: any) => {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="glass-panel rounded-[2rem] p-8 group cursor-pointer relative overflow-hidden border border-white/5"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#E10600]/5 blur-[60px] -mr-12 -mt-12 pointer-events-none group-hover:bg-[#E10600]/15 transition-all duration-500" />
      
      <div className="flex items-start justify-between mb-6">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 group-hover:border-[#E10600]/30 group-hover:bg-[#E10600]/5 transition-all duration-300">
          <Icon size={24} className="text-[#E10600] group-hover:scale-110 transition-transform" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
          trendUp ? "text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/20" : "text-[#FF3B3B] bg-[#FF3B3B]/10 border border-[#FF3B3B]/20"
        )}>
          {trendUp ? <TrendingUp size={10} strokeWidth={3} /> : <TrendingDown size={10} strokeWidth={3} />}
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <div className="text-sm font-bold text-white/40 mb-2 uppercase tracking-widest">{label}</div>
        <div className="text-3xl font-black text-white flex items-baseline gap-3">
          {value}
          <div className="flex gap-[3px] items-end h-6 pb-1">
            {[0.4, 0.8, 0.6, 1.0, 0.7].map((h, i) => (
              <motion.div 
                key={i} 
                initial={{ height: 0 }}
                animate={{ height: `${h * 100}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="w-[3px] rounded-full bg-red-500/40 group-hover:bg-red-500 transition-colors" 
              />
            ))}
          </div>
        </div>
        {subtitle && <p className="text-xs text-white/20 mt-2 font-medium">{subtitle}</p>}
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#E10600]/0 to-transparent group-hover:via-[#E10600]/40 transition-all duration-700" />
    </motion.div>
  );
};

const TableRow = ({ user, email, status, method, amount, type }: any) => {
  return (
    <tr className="group hover:bg-white/[0.01] transition-all duration-300">
      <td className="py-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 flex items-center justify-center font-black text-xs text-white/20 group-hover:text-red-500 group-hover:border-red-500/30 transition-all">
            {user.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div>
            <div className="text-sm font-black text-white group-hover:text-red-400 transition-colors">{user}</div>
            <div className="text-[11px] font-medium text-white/20">{email}</div>
          </div>
        </div>
      </td>
      <td className="py-5">
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
          type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : 
          type === 'failed' ? "bg-red-500/10 text-red-500 border border-red-500/20" : 
          "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            type === 'success' ? "bg-green-500" : 
            type === 'failed' ? "bg-red-500" : "bg-yellow-500"
          )} />
          {status}
        </div>
      </td>
      <td className="py-5 text-xs font-bold text-white/40">{method}</td>
      <td className="py-5 text-right">
        <div className={cn(
          "text-sm font-black tracking-tight",
          type === 'success' ? "text-white" : 
          type === 'failed' ? "text-red-500/60" : "text-white/60"
        )}>
          {amount}
        </div>
      </td>
    </tr>
  );
};
