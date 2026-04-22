import { useQuery } from "@tanstack/react-query";
import { Bell, Menu, Moon, PanelLeftClose, PanelLeft, Search, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { breadcrumbFromPath, normalizePathname } from "../../lib/navigation";
import { useAppUi } from "../../store/appUi";
import { Button } from "../ui/Button";
import { supabase } from "../../supabase";
import { toast } from "sonner";
import { UserBar } from "./UserBar";

export function Topbar({
  onOpenMobileNav,
  sessionEmail,
  onSignOut,
}: {
  onOpenMobileNav: () => void;
  sessionEmail: string;
  onSignOut: () => void;
}) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const crumbs = useMemo(() => breadcrumbFromPath(normalizePathname(pathname)), [pathname]);
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed } = useAppUi();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const previewQ = useQuery({
    queryKey: ["topbar", "license-count", debouncedQ],
    enabled: debouncedQ.length >= 3,
    queryFn: async () => {
      const { count, error } = await supabase.from("licenses").select("id", { count: "exact", head: true }).ilike("email", `%${debouncedQ}%`);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const runSearch = () => {
    const t = q.trim();
    if (!t) return;
    void (async () => {
      const { data, error } = await supabase
        .from("licenses")
        .select("id,email")
        .ilike("email", `%${t}%`)
        .limit(5);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data?.length) {
        toast.message("No license match", { description: "Try Transactions for order id." });
        return;
      }
      nav(`/licenses?q=${encodeURIComponent(t)}`);
    })();
  };

  return (
    <header className="sticky top-0 z-30 shrink-0 flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0E0E11]/80 px-4 py-3 backdrop-blur-sm">
      <button
        type="button"
        className="lg:hidden rounded-xl p-2 text-white/60 hover:bg-white/5"
        onClick={onOpenMobileNav}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <button
        type="button"
        className="hidden lg:flex rounded-xl p-2 text-white/60 hover:bg-white/5"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
      </button>
      <nav className="flex-1 min-w-0 text-xs text-white/35 truncate">
        {crumbs.map((c, i) => (
          <span key={`${c}-${i}`}>
            {i > 0 ? <span className="mx-1.5 text-white/20">/</span> : null}
            <span className={i === crumbs.length - 1 ? "text-white font-semibold" : ""}>{c}</span>
          </span>
        ))}
      </nav>
      <div className="flex min-w-[200px] max-w-md flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3">
          <Search className="h-4 w-4 shrink-0 text-white/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search license email…"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white/85 outline-none placeholder:text-white/20"
          />
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => runSearch()}>
            Go
          </Button>
        </div>
        {debouncedQ.length >= 3 ? (
          <p className="px-2 text-[10px] text-white/30">
            {previewQ.isFetching ? "Counting matches…" : previewQ.isError ? "Preview unavailable" : `${previewQ.data ?? 0} license(s) match (debounced 300ms)`}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <UserBar email={sessionEmail} onSignOut={onSignOut} />
        <button
          type="button"
          className="rounded-xl p-2 text-white/60 hover:bg-white/5"
          title="Notifications (placeholder)"
          disabled
        >
          <Bell className="w-4 h-4 opacity-40" />
        </button>
        <button
          type="button"
          className="rounded-xl p-2 text-white/60 hover:bg-white/5"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
