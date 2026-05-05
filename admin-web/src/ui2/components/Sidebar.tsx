import React from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Contact,
  Cpu,
  CreditCard,
  Globe,
  Key,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Rocket,
  Settings,
  ShieldAlert,
  Sparkles,
  Tag,
  Terminal,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../utils/cn";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const menuGroups = [
  {
    label: "Utama",
    items: [
      { name: "Dasbor", icon: LayoutDashboard, path: "/dashboard" },
      { name: "Analitik", icon: BarChart3, path: "/analytics" },
      { name: "Aktivitas Langsung", icon: Activity, path: "/live" },
    ],
  },
  {
    label: "Manajemen",
    items: [
      { name: "Lisensi", icon: Key, path: "/licenses" },
      { name: "Transaksi", icon: CreditCard, path: "/transactions" },
      { name: "Promo & Harga", icon: Tag, path: "/promo-pricing" },
      { name: "Afiliasi", icon: Users, path: "/affiliates" },
      { name: "Kontak CRM", icon: Contact, path: "/crm" },
    ],
  },
  {
    label: "Konfigurasi",
    items: [
      { name: "Halaman Utama", icon: Globe, path: "/landing" },
      { name: "Pengaturan Aplikasi", icon: Settings, path: "/app-settings" },
      { name: "Pengaturan Platform", icon: Cpu, path: "/platform" },
      { name: "API Keys", icon: Key, path: "/api-keys" },
      { name: "Marketing", icon: Sparkles, path: "/marketing" },
      { name: "Releases", icon: Rocket, path: "/releases" },
    ],
  },
  {
    label: "Operasi",
    items: [
      { name: "Pengumuman", icon: Megaphone, path: "/announcements" },
      { name: "Promo Events", icon: Calendar, path: "/events" },
      { name: "Template WA", icon: MessageSquare, path: "/wa-templates" },
      { name: "Penarikan", icon: Wallet, path: "/withdrawals" },
      { name: "Edge Monitor", icon: Zap, path: "/edge-functions" },
      { name: "Log Sistem", icon: Terminal, path: "/logs" },
      { name: "Admin Sistem", icon: ShieldAlert, path: "/admin-users" },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0E0E11] border-r border-white/[0.05] transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] z-50 flex flex-col shadow-2xl ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="p-7 flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 flex-shrink-0">
            <img
              src="/logo-macfyi.png"
              alt="MacFYI Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(225,6,0,0.5)]"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter whitespace-nowrap leading-none">
                Mac<span className="text-red-500">FYI</span>
              </span>
              <span className="text-[10px] font-black text-red-500/50 uppercase tracking-[0.2em] mt-1">Admin Pusat</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 custom-scrollbar">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="mb-8">
            {!collapsed && (
              <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.25em] text-white/20 mb-4">
                {group.label}
              </h3>
            )}
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-300 group relative",
                      isActive
                        ? "bg-red-500/10 text-red-500 shadow-[inset_0_0_0_1px_rgba(225,6,0,0.2)]"
                        : "text-white/30 hover:text-white hover:bg-white/[0.03]",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={20}
                        className={cn("flex-shrink-0 transition-transform duration-300 group-hover:scale-110", collapsed ? "mx-auto" : "")}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {!collapsed && <span className="text-[13px] font-bold tracking-tight">{item.name}</span>}
                      {collapsed && (
                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#16161C] border border-white/10 rounded-xl text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                          {item.name.toUpperCase()}
                        </div>
                      )}
                      <div
                        className={cn(
                          "absolute left-0 w-1 bg-red-500 rounded-full transition-all duration-300",
                          collapsed ? "left-[6px]" : "left-0",
                          isActive ? "h-6 opacity-100" : "h-0 opacity-0",
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/[0.03] p-4 space-y-4">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-12 flex items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.03] text-white/20 hover:text-white hover:bg-red-600 transition-all duration-300 active:scale-95 group shadow-sm"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}
        </button>
      </div>
    </aside>
  );
};

