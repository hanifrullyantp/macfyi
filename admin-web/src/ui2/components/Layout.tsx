import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { CommandPalette } from "./CommandPalette";
import { AdminRouteErrorBoundary } from "../../components/AdminRouteErrorBoundary";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#0E0E11] text-white flex">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-72"}`}>
        <Navbar
          onOpenCommandPalette={() => setCommandOpen(true)}
          onRefreshAll={() => void queryClient.invalidateQueries()}
        />
        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AdminRouteErrorBoundary resetKey={location.pathname}>{children}</AdminRouteErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </main>
    </div>
  );
};

