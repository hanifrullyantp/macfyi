import React from "react";
import { Bell, RefreshCw, Search, User } from "lucide-react";

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-[#0E0E11]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-8">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-red-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Cari perintah (⌘K)..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-white/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all">
          <RefreshCw size={20} />
        </button>
        <button
          type="button"
          className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all relative"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border border-[#0E0E11]" />
        </button>
        <div className="h-8 w-[1px] bg-white/10 mx-2" />
        <button type="button" className="flex items-center gap-3 p-1.5 pl-3 hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">Admin User</p>
            <p className="text-[10px] text-white/40">Super Admin</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center border border-white/20 shadow-lg shadow-red-500/20">
            <User size={16} />
          </div>
        </button>
      </div>
    </header>
  );
};

