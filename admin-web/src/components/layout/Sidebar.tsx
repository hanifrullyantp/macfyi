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
        "flex h-full flex-col border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200",
        sidebarCollapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          M
        </div>
        {!sidebarCollapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-100">MacFYI Admin</div>
            <div className="truncate text-[10px] text-zinc-500">Control panel</div>
          </div>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4">
            {!sidebarCollapsed ? (
              <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {group.label}
              </div>
            ) : (
              <div className="mx-1 mb-2 h-px bg-zinc-800" />
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
                          "relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-violet-600/15 text-violet-200 ring-1 ring-violet-500/30"
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                          sidebarCollapsed && "justify-center px-0",
                        )
                      }
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0 opacity-90" />
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
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
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
