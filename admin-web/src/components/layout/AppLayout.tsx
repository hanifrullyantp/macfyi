import { Outlet } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { useAppUi } from "../../store/appUi";
import { cn } from "../../lib/cn";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { Topbar } from "./Topbar";

export function AppLayout({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void | Promise<void>;
}) {
  const { mobileNavOpen, setMobileNavOpen } = useAppUi();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <div className="flex min-h-0 flex-1">
        <div className="relative z-20 hidden h-full min-h-0 shrink-0 lg:block">
          <Sidebar />
        </div>
        {mobileNavOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-[min(88vw,280px)] max-w-full overflow-hidden shadow-2xl lg:hidden",
                "border-r border-zinc-800 bg-zinc-950",
              )}
            >
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            sessionEmail={session.user.email ?? ""}
            onSignOut={() => void onSignOut()}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="relative z-0 min-h-0 min-w-0 flex-1 overflow-auto p-4 md:p-6">
            <Outlet context={{ session } satisfies { session: Session }} />
          </main>
          <StatusBar />
        </div>
      </div>
    </div>
  );
}
