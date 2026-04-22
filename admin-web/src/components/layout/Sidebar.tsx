import { NavLink } from "react-router-dom";
import { NAV_GROUPS } from "../../lib/navigation";
import { useAppUi } from "../../store/appUi";
import { useNavBadges } from "../../hooks/useNavBadges";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { sidebarCollapsed } = useAppUi();
  const badges = useNavBadges();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/10 bg-[#0E0E11] transition-[width] duration-300",
        sidebarCollapsed ? "w-[80px]" : "w-[288px]",
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600/15 text-sm font-black text-red-400 ring-1 ring-red-500/25">
          <span className="italic">M</span>
        </div>
        {!sidebarCollapsed ? (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-black tracking-tight text-white">
              Mac<span className="text-red-500">FYI</span>
            </div>
            <div className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-red-500/50">Admin Pusat</div>
          </div>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4">
            {!sidebarCollapsed ? (
              <div className="mb-2 px-2 text-[9px] font-black uppercase tracking-[0.25em] text-white/25">
                {group.label}
              </div>
            ) : (
              <div className="mx-2 mb-3 h-px bg-white/10" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const count =
                  item.badgeKey === "withdrawals"
                    ? badges.withdrawals
                    : item.badgeKey === "payments"
                      ? badges.payments
                      : 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => onNavigate?.()}
                      className={({ isActive }) =>
                        cn(
                          "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all",
                          isActive
                            ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/25 shadow-[inset_0_0_0_1px_rgba(225,6,0,0.12)]"
                            : "text-white/35 hover:bg-white/[0.03] hover:text-white",
                          sidebarCollapsed && "justify-center px-0",
                        )
                      }
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0 opacity-90" />
                      {!sidebarCollapsed ? (
                        <>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {count > 0 ? (
                            <Badge tone="warning" className="tabular-nums">
                              {count > 99 ? "99+" : count}
                            </Badge>
                          ) : null}
                        </>
                      ) : count > 0 ? (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                      ) : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
