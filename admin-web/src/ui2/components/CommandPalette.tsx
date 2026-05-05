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
  Rocket,
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
import { getAdminPageTitle } from "../../lib/adminRouteMeta";

type PaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CmdItem = {
  icon: typeof LayoutDashboard;
  to: string;
  keywords?: string[];
};

const ITEMS: CmdItem[] = [
  { icon: LayoutDashboard, to: "/dashboard", keywords: ["dashboard", "home"] },
  { icon: BarChart3, to: "/analytics", keywords: ["stats"] },
  { icon: Activity, to: "/live", keywords: ["live"] },
  { icon: Key, to: "/licenses", keywords: ["license"] },
  { icon: CreditCard, to: "/transactions", keywords: ["payment", "orders"] },
  { icon: Tag, to: "/promo-pricing", keywords: ["pricing"] },
  { icon: Users, to: "/affiliates", keywords: ["affiliate"] },
  { icon: Wallet, to: "/withdrawals", keywords: ["withdraw"] },
  { icon: Contact, to: "/crm", keywords: ["contacts"] },
  { icon: Globe, to: "/landing", keywords: ["editor", "landing"] },
  { icon: Settings, to: "/app-settings", keywords: ["app"] },
  { icon: Cpu, to: "/platform", keywords: ["platform"] },
  { icon: Sparkles, to: "/marketing", keywords: ["seo", "pixel", "public"] },
  { icon: Rocket, to: "/releases", keywords: ["release", "deploy", "rollback"] },
  { icon: Calendar, to: "/events", keywords: ["calendar"] },
  { icon: MessageSquare, to: "/wa-templates", keywords: ["whatsapp"] },
  { icon: Megaphone, to: "/announcements", keywords: ["news"] },
  { icon: Zap, to: "/edge-functions", keywords: ["functions"] },
  { icon: Terminal, to: "/logs", keywords: ["logs"] },
  { icon: ShieldAlert, to: "/admin-users", keywords: ["users"] },
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
      const label = getAdminPageTitle(item.to).toLowerCase();
      if (label.includes(q)) return true;
      if (item.to.toLowerCase().includes(q)) return true;
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
                        <span className="text-[13px] font-bold text-white/80 group-hover:text-white">{getAdminPageTitle(item.to)}</span>
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
