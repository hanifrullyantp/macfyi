import { ReactNode, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Activity,
  Bolt,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  HardDrive,
  PackageOpen,
  Search,
  Settings,
  User,
  Sparkles,
  Trash2,
  Trash,
} from "lucide-react";
import { ScanOrbButton, type OrbDisplayMode } from "./ScanOrbButton";
import { useI18n } from "../i18n/context";

export type FeatureId =
  | "smart-care"
  | "cleanup"
  | "my-clutter"
  | "uninstaller"
  | "user-trash"
  | "monitor"
  | "performance"
  | "history"
  | "settings";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  activeFeature: FeatureId;
  onFeatureChange: (feature: FeatureId) => void;
  orbMode: OrbDisplayMode;
  orbMainText?: string;
  onScanOrbClick: () => void;
  scanOrbDisabled?: boolean;
  /** When orb is visible during a long operation (e.g. future inline scan) */
  scanOrbProgressPct?: number;
  onAIButtonClick?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  diskUsedPercent?: number;
  freeSpaceGb?: string;
  badges?: Record<string, number>;
  inspector?: ReactNode;
  contentBackgroundClass?: string;
  orbSubLabel?: string;
  /** When false, bottom scan orb is hidden (e.g. while Scanner shows primary progress). */
  showScanOrb?: boolean;
  /** Trash vs permanent — shown in sidebar footer */
  deletionMode?: "trash" | "permanent";
  onDeletionModeClick?: () => void;
  /** Hide decorative red glows in main pane (e.g. during scan) to avoid flicker with solid scan UI */
  hideMainGlow?: boolean;
  onUpgradeClick?: () => void;
}

interface FeatureItem {
  id: FeatureId;
  label: string;
  icon: ComponentType<{ size?: number }>;
  group: "maintenance" | "insights" | "system";
}

const FEATURE_ITEMS: FeatureItem[] = [
  { id: "smart-care", label: "shell.smartCare", icon: Sparkles, group: "maintenance" },
  { id: "cleanup", label: "shell.cleanup", icon: Trash, group: "maintenance" },
  { id: "my-clutter", label: "shell.myClutter", icon: CircleDashed, group: "maintenance" },
  { id: "uninstaller", label: "shell.uninstaller", icon: PackageOpen, group: "maintenance" },
  { id: "user-trash", label: "shell.userTrash", icon: Trash2, group: "maintenance" },
  { id: "monitor", label: "shell.monitor", icon: Activity, group: "insights" },
  { id: "performance", label: "shell.performance", icon: Bolt, group: "insights" },
  { id: "history", label: "shell.history", icon: Clock3, group: "insights" },
  { id: "settings", label: "shell.settings", icon: Settings, group: "system" },
];

const GROUP_LABEL_KEY: Record<FeatureItem["group"], string> = {
  maintenance: "shell.maintenance",
  insights: "shell.insights",
  system: "shell.system",
};

function Badge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto text-[9px] font-bold bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] px-1.5 py-0.5 rounded-md tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Real app chrome: full viewport, no fake macOS window frame. */
export const AppShell = ({
  children,
  title,
  activeFeature,
  onFeatureChange,
  orbMode,
  orbMainText,
  onScanOrbClick,
  scanOrbDisabled = false,
  scanOrbProgressPct = 0,
  onAIButtonClick,
  onSearchClick,
  onSettingsClick,
  diskUsedPercent = 45,
  freeSpaceGb,
  badges = {},
  inspector,
  contentBackgroundClass = "from-[#1c1e26] via-[#181a22] to-[#13151c]",
  orbSubLabel = "Smart + Safe",
  showScanOrb = true,
  deletionMode = "trash",
  onDeletionModeClick,
  hideMainGlow = false,
  onUpgradeClick,
}: AppShellProps) => {
  const { t } = useI18n();
  const pct = Math.min(100, Math.max(0, Math.round(diskUsedPercent)));
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem("macfyi.sidebar.collapsed");
      if (stored === "0") return false;
      if (stored === "1") return true;
      return true;
    } catch {
      return true;
    }
  });
  const [diskMenuOpen, setDiskMenuOpen] = useState(false);
  const diskPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!diskMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (diskPopoverRef.current && !diskPopoverRef.current.contains(e.target as Node)) {
        setDiskMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [diskMenuOpen]);

  const headerTitle = title ?? t("appName");

  useEffect(() => {
    localStorage.setItem("macfyi.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const scanOrbSubLabel = orbSubLabel;

  const groupedItems = useMemo(
    () =>
      (["maintenance", "insights", "system"] as const).map((group) => ({
        group,
        items: FEATURE_ITEMS.filter((i) => i.group === group),
      })),
    []
  );

  const diskFreeLabel =
    freeSpaceGb != null && freeSpaceGb.length > 0 ? t("shell.diskFree", { n: freeSpaceGb }) : null;

  return (
    <div className="flex h-full w-full min-h-0 bg-[var(--color-bg)] text-white">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-[72px]" : "w-56"
        } bg-[var(--color-bg-sidebar)]/90 border-r border-white/5 flex flex-col p-3 shrink-0 overflow-y-auto custom-scrollbar transition-all duration-200`}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--color-brand-glow)]/80 shadow-[0_0_10px_rgba(199,92,82,0.28)]" />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide">{t("appName")}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {groupedItems.map(({ group, items }) => (
          <div key={group} className="mt-3 space-y-1">
            {!collapsed && (
              <span className="text-[9px] font-bold text-white/20 px-2 uppercase tracking-widest mb-1 block">
                {t(GROUP_LABEL_KEY[group])}
              </span>
            )}
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeFeature === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onFeatureChange(item.id)}
                  title={collapsed ? t(item.label) : undefined}
                  className={`group relative w-full ${
                    collapsed ? "justify-center" : ""
                  } flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-200 text-left ${
                    isActive
                      ? "bg-[var(--color-sidebar-active-bg)] text-white shadow-[inset_3px_0_0_0_var(--color-sidebar-indicator)]"
                      : "text-white/50 hover:bg-white/[0.06] hover:text-white/88 border border-transparent"
                  }`}
                >
                  <Icon size={16} className={isActive ? "scale-105" : "group-hover:scale-105 transition-transform"} />
                  {!collapsed && (
                    <>
                      <span className="text-xs font-medium flex-1">{t(item.label)}</span>
                      {(item.id === "cleanup" || item.id === "my-clutter") && (
                        <Badge count={badges[item.id]} />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}

      </aside>

      {/* Main split view */}
      <div className="flex-1 flex min-w-0 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <header className="h-11 flex items-center justify-between px-4 border-b border-white/10 bg-[#15161a]/92 backdrop-blur-sm shrink-0 relative z-50">
            <span className="text-sm font-semibold text-white/80 truncate">{headerTitle}</span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onSearchClick}
                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label={t("shell.search")}
              >
                <Search size={16} />
              </button>
              <button
                type="button"
                onClick={onSettingsClick}
                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label={t("settings.title")}
              >
                <Settings size={16} />
              </button>
              <button
                type="button"
                onClick={onDeletionModeClick}
                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                title={deletionMode === "trash" ? t("shell.deletionTrash") : t("shell.deletionPermanent")}
                aria-label={t("shell.deletion")}
              >
                <Trash2 size={16} />
              </button>
              <div className="relative" ref={diskPopoverRef}>
                <button
                  type="button"
                  onClick={() => setDiskMenuOpen((o) => !o)}
                  className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  title={diskFreeLabel ? `${t("shell.disk")} ${pct}%` : t("shell.disk")}
                  aria-label={t("shell.disk")}
                  aria-expanded={diskMenuOpen}
                >
                  <HardDrive size={16} />
                </button>
                {diskMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-white/10 bg-[#1a1b20] shadow-xl p-3 z-[60]">
                    <p className="text-[10px] font-medium text-white/50 mb-2">{t("shell.disk")}</p>
                    <div className="flex justify-between text-[11px] text-white/80 mb-1">
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-glow)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {diskFreeLabel && <p className="text-[10px] text-white/55 mt-2 tabular-nums">{diskFreeLabel}</p>}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onUpgradeClick}
                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                title={`${t("shell.freePlan")} — ${t("shell.upgrade")}`}
                aria-label={t("shell.upgrade")}
              >
                <User size={16} />
              </button>
              <button
                type="button"
                onClick={onAIButtonClick}
                className="ml-1 px-2.5 py-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg flex items-center gap-1.5 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--color-brand-glow)]/70" />
                <span className="text-[10px] font-bold text-white/80">{t("shell.ai")}</span>
              </button>
            </div>
          </header>

          <main
            className={`relative flex flex-col flex-1 min-h-0 overflow-hidden bg-gradient-to-br ${contentBackgroundClass}`}
          >
            {/* Background-only glows (z-0). Disabled during scan to avoid competing repaints with Scanner */}
            {!hideMainGlow && (
              <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
                <div
                  className="absolute rounded-full blur-[88px] bg-indigo-500/[0.07]"
                  style={{
                    width: "min(52vw, 28rem)",
                    height: "min(52vw, 28rem)",
                    left: "8%",
                    top: "6%",
                    transform: "translate(-15%, -10%)",
                  }}
                />
                <div
                  className="absolute rounded-full blur-[72px] bg-violet-500/[0.05]"
                  style={{
                    width: "min(40vw, 20rem)",
                    height: "min(40vw, 20rem)",
                    right: "4%",
                    top: "22%",
                  }}
                />
                <div
                  className="absolute rounded-full bg-black/35 blur-[80px]"
                  style={{
                    width: "min(55vw, 30rem)",
                    height: "min(55vw, 30rem)",
                    right: "-4%",
                    bottom: "-6%",
                  }}
                />
              </div>
            )}
            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          </main>

          {showScanOrb && (
            <div className="fixed left-5 bottom-5 md:left-6 md:bottom-6 z-[60] pointer-events-none max-md:left-1/2 max-md:-translate-x-1/2 max-md:bottom-5">
              <div className="pointer-events-auto">
                <ScanOrbButton
                  mode={orbMode}
                  mainText={orbMainText}
                  disabled={scanOrbDisabled}
                  onClick={onScanOrbClick}
                  progressPct={scanOrbProgressPct}
                  subLabel={scanOrbSubLabel}
                />
              </div>
            </div>
          )}
        </div>

        {inspector && (
          <aside className="w-[320px] border-l border-white/5 bg-[#15161a]/95 shrink-0">
            {inspector}
          </aside>
        )}
      </div>
    </div>
  );
};
