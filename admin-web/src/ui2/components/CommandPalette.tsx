import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Calendar,
  Command,
  Contact,
  Cpu,
  CreditCard,
  Globe,
  Key,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Tag,
  Terminal,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type PaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CmdItem = {
  icon: typeof LayoutDashboard;
  label: string;
  to: string;
  keywords?: string[];
};

const ITEMS: CmdItem[] = [
  { icon: LayoutDashboard, label: "Dasbor", to: "/dashboard", keywords: ["dashboard", "home"] },
  { icon: BarChart3, label: "Analitik", to: "/analytics", keywords: ["stats"] },
  { icon: Activity, label: "Aktivitas langsung", to: "/live", keywords: ["live"] },
  { icon: Key, label: "Lisensi", to: "/licenses", keywords: ["license"] },
  { icon: CreditCard, label: "Transaksi", to: "/transactions", keywords: ["payment", "orders"] },
  { icon: Tag, label: "Promo & harga", to: "/promo-pricing", keywords: ["pricing"] },
  { icon: Users, label: "Afiliasi", to: "/affiliates", keywords: ["affiliate"] },
  { icon: Wallet, label: "Penarikan", to: "/withdrawals", keywords: ["withdraw"] },
  { icon: Contact, label: "CRM", to: "/crm", keywords: ["contacts"] },
  { icon: Globe, label: "Halaman utama (landing)", to: "/landing", keywords: ["editor"] },
  { icon: Settings, label: "Pengaturan aplikasi", to: "/app-settings", keywords: ["app"] },
  { icon: Cpu, label: "Pengaturan platform", to: "/platform", keywords: ["platform"] },
  { icon: Sparkles, label: "Marketing / public keys", to: "/marketing", keywords: ["seo", "pixel"] },
  { icon: Calendar, label: "Promo events", to: "/events", keywords: ["calendar"] },
  { icon: MessageSquare, label: "Template WA", to: "/wa-templates", keywords: ["whatsapp"] },
  { icon: Megaphone, label: "Pengumuman", to: "/announcements", keywords: ["news"] },
  { icon: Zap, label: "Edge monitor", to: "/edge-functions", keywords: ["functions"] },
  { icon: Terminal, label: "Log sistem", to: "/logs", keywords: ["logs"] },
  { icon: ShieldAlert, label: "Admin sistem", to: "/admin-users", keywords: ["users"] },
];

export const CommandPalette = ({ open, onOpenChange }: PaletteProps) => {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true;
      return item.keywords?.some((k) => k.includes(q)) ?? false;
    });
  }, [query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        const pick = filtered[highlight];
        if (pick) {
          onOpenChange(false);
          nav(pick.to);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, highlight, nav, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-xl bg-[#16161C] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative"
          >
            <div className="p-5 border-b border-white/5 flex items-center gap-4">
              <Search className="w-5 h-5 text-white/20" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik nama halaman…"
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-white/10"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                <Command size={12} className="text-white/40" />
                <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">ESC</span>
              </div>
            </div>

            <div className="p-3 max-h-[min(60vh,420px)] overflow-y-auto custom-scrollbar">
              <div className="px-4 py-3 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Halaman</div>
              <div className="space-y-1">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-white/40">Tidak ada hasil.</div>
                ) : (
                  filtered.map((item, idx) => (
                    <button
                      type="button"
                      key={item.to}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => {
                        onOpenChange(false);
                        nav(item.to);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl cursor-pointer group transition-all text-left ${
                        idx === highlight ? "bg-red-500/10 shadow-[inset_0_0_0_1px_rgba(225,6,0,0.25)]" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <item.icon size={20} className="text-white/20 group-hover:text-red-500 transition-colors" />
                        <span className="text-[13px] font-bold text-white/80 group-hover:text-white">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/25">{item.to}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0E0E11] p-4 flex justify-center gap-8 border-t border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <span className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 text-white/40 italic">↑↓</span>
                Navigasi
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <span className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 text-white/40 italic">↵</span>
                Buka
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <span className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 text-white/40 italic">ESC</span>
                Tutup
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
