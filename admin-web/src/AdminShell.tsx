import { NavLink, Outlet } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-white"}`;

export function AdminShell({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <aside className="md:w-52 border-b md:border-b-0 md:border-r border-zinc-800 p-4 shrink-0">
        <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3">Macfyi Admin</div>
        <nav className="flex flex-col gap-0.5">
          <NavLink to="/" end className={linkCls}>
            Lisensi &amp; app
          </NavLink>
          <NavLink to="/analitik" className={linkCls}>
            Analitik
          </NavLink>
          <NavLink to="/penarikan" className={linkCls}>
            Penarikan
          </NavLink>
          <NavLink to="/transaksi" className={linkCls}>
            Transaksi
          </NavLink>
          <NavLink to="/crm" className={linkCls}>
            CRM
          </NavLink>
          <NavLink to="/affiliates" className={linkCls}>
            Affiliate
          </NavLink>
          <NavLink to="/platform" className={linkCls}>
            Platform JSON
          </NavLink>
          <NavLink to="/acara" className={linkCls}>
            Acara
          </NavLink>
          <NavLink to="/pengumuman" className={linkCls}>
            Pengumuman
          </NavLink>
        </nav>
      </aside>
      <div className="flex-1 p-6 md:p-10 max-w-6xl w-full">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Panel admin</h1>
            <p className="text-sm text-zinc-500 mt-1">{session.user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Keluar
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
