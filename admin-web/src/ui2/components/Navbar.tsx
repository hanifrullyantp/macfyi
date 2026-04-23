import React, { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { Bell, ChevronDown, ChevronRight, LogOut, RefreshCw, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAdminSession } from "../../context/AdminSessionContext";
import { supabase } from "../../supabase";
import { getAdminPageTitle } from "../../lib/adminRouteMeta";

type NavbarProps = {
  onOpenCommandPalette: () => void;
  onRefreshAll: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommandPalette, onRefreshAll }) => {
  const session = useAdminSession();
  const location = useLocation();
  const fetching = useIsFetching();
  const email = session.user.email ?? session.user.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageTitle = getAdminPageTitle(location.pathname);

  useEffect(() => {
    document.title = `${pageTitle} · MacFYI Admin`;
  }, [pageTitle]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0E0E11]/80 backdrop-blur-md border-b border-white/5 min-h-16 flex flex-wrap items-center gap-3 justify-between px-6 sm:px-8 py-2 sm:py-0">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
        <nav className="hidden md:flex shrink-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/25" aria-label="Breadcrumb">
          <Link to="/dashboard" className="text-white/35 hover:text-red-400 transition-colors">
            MacFYI
          </Link>
          <ChevronRight className="h-3 w-3 text-white/15" aria-hidden />
          <span className="max-w-[200px] truncate text-white/55">{pageTitle}</span>
        </nav>

        <div className="relative group min-w-0 flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-red-500 transition-colors" size={18} />
          <input
            type="search"
            readOnly
            onFocus={() => onOpenCommandPalette()}
            onClick={() => onOpenCommandPalette()}
            placeholder="Cari halaman (⌘K)…"
            className="w-full cursor-pointer bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-white/20"
            aria-label="Buka palet perintah"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {fetching > 0 ? (
          <span
            className="hidden lg:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/40"
            title="Ada permintaan data ke Supabase / API"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Memuat
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onRefreshAll()}
          className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all"
          title="Muat ulang data (invalidate query)"
          aria-label="Refresh data"
        >
          <RefreshCw size={20} />
        </button>
        <button type="button" className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all relative" aria-label="Notifications">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border border-[#0E0E11]" />
        </button>
        <div className="h-8 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 sm:gap-3 p-1.5 pl-2 sm:pl-3 hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/10"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="text-right hidden sm:block max-w-[160px] lg:max-w-[180px]">
              <p className="text-xs font-bold truncate">{email}</p>
              <p className="text-[10px] text-white/40">Admin</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center border border-white/20 shadow-lg shadow-red-500/20">
              <User size={16} />
            </div>
            <ChevronDown className={`hidden sm:block h-4 w-4 text-white/40 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#16161C] py-2 shadow-2xl z-50"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/[0.05]"
                onClick={() => {
                  setMenuOpen(false);
                  void supabase.auth.signOut();
                }}
              >
                <LogOut className="h-4 w-4 text-white/40" />
                Keluar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
