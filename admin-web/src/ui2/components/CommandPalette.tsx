import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Key, LayoutDashboard, Search, Settings, Tag, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const items = [
    { icon: LayoutDashboard, label: "Ke Dasbor", shortcut: "G D", to: "/dashboard" },
    { icon: Key, label: "Lisensi", shortcut: "⌘ L", to: "/licenses" },
    { icon: Users, label: "CRM", shortcut: "⌘ C", to: "/crm" },
    { icon: Tag, label: "Promo & Harga", shortcut: "⌘ P", to: "/promo-pricing" },
    { icon: Settings, label: "Pengaturan Platform", shortcut: "⌘ S", to: "/platform" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
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
                placeholder="Ketik perintah atau cari sesuatu..."
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-white/10"
                onChange={() => {
                  // TODO: searchable list
                }}
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                <Command size={12} className="text-white/40" />
                <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">ESC</span>
              </div>
            </div>

            <div className="p-3">
              <div className="px-4 py-3 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Aksi Cepat</div>
              <div className="space-y-1">
                {items.map((item, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setIsOpen(false);
                      nav(item.to);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-white/[0.03] cursor-pointer group transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={20} className="text-white/20 group-hover:text-red-500 transition-colors" />
                      <span className="text-[13px] font-bold text-white/60 group-hover:text-white">{item.label}</span>
                    </div>
                    <div className="text-[10px] font-black text-white/20 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      {item.shortcut}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0E0E11] p-4 flex justify-center gap-8 border-t border-white/5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <span className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 text-white/40 italic">↑↓</span>
                Navigasi
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <span className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 text-white/40 italic">↵</span>
                Pilih
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

