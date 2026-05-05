import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Search,
  Settings,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { ScanOrbButton, type OrbDisplayMode } from "./ScanOrbButton";
import { useI18n } from "../i18n/context";
import { DEFAULT_BRAND_LOGO_URL } from "../lib/defaultBrandLogo";
import type { FeatureId } from "../lib/featureId";
import { AI_SIDEBAR_ID } from "../lib/featureId";
import {
  appendAIRow,
  getGroupedSidebarMenu,
  GROUP_LABEL_KEY,
  segmentSidebarNav,
} from "./Sidebar/sidebarConfig";
import { SidebarItem } from "./Sidebar/SidebarItem";
import type { SidebarMenuEntry, SidebarNavEntry } from "./Sidebar/sidebarConfig";
import { cn } from "../utils/cn";

export type { FeatureId };

interface AppShellProps {
  children: ReactNode;
  title?: string;
  /** Logo dari landing (public-config); jika kosong memakai mark bawaan aplikasi. */
  brandLogoUrl?: string | null;
  /** Teks proses latar (manusiawi) di atas area bawah / orb. */
  footerActivity?: string | null;
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
  /** Short free/total line near header controls (e.g. main volume summary). */
  diskInlineSummary?: string | null;
  badges?: Record<string, number>;
  /** Short byte labels for sidebar after scan, e.g. { "smart-care": "2.1 GB" } */
  sidebarByteBadges?: Partial<Record<FeatureId, string>>;
  /** Highlights AI row when the assistant panel is open */
  isAIPanelOpen?: boolean;
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

function isNavFeature(entry: SidebarNavEntry): entry is SidebarMenuEntry {
  return entry.id !== AI_SIDEBAR_ID;
}

/** Real app chrome: full viewport, no fake macOS window frame. */
export const AppShell = ({
  children,
  title,
  brandLogoUrl = null,
  footerActivity = null,
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
  diskInlineSummary = null,
  badges = {},
  sidebarByteBadges = {},
  isAIPanelOpen = false,
  inspector,
  contentBackgroundClass = "from-[#1c1e26] via-[#181a22] to-[#13151c]",
  orbSubLabel = "Smart + Safe",
  showScanOrb = true,
  deletionMode: _deletionMode = "trash",
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

  const groupedItems = useMemo(() => appendAIRow(getGroupedSidebarMenu()), []);

  const diskFreeLabel =
    freeSpaceGb != null && freeSpaceGb.length > 0 ? t("shell.diskFree", { n: freeSpaceGb }) : null;

  const logoSrc =
    typeof brandLogoUrl === "string" && brandLogoUrl.trim().length > 0 ? brandLogoUrl.trim() : DEFAULT_BRAND_LOGO_URL;

  return (
    <div className="flex h-full w-full min-h-0 bg-[var(--color-bg)] text-white">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-[72px]" : "w-56"
        } bg-[var(--color-bg-sidebar)]/90 border-r border-white/5 flex flex-col p-3 shrink-0 overflow-y-auto custom-scrollbar transition-all duration-200`}
      >
        <div className={`flex items-center mb-2 px-1 ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={logoSrc}
                alt=""
                className="h-7 w-7 rounded-lg object-contain bg-white/5 border border-white/10 shrink-0"
              />
              <span className="text-[11px] font-semibold text-white/80 tracking-wide truncate">{t("appName")}</span>
            </div>
          )}
          {collapsed ? (
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-9 rounded-lg object-contain bg-white/5 border border-white/10"
            />
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={`p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0 ${
              collapsed ? "" : "ml-auto"
            }`}
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
            {segmentSidebarNav(items).map((seg) => {
              if (seg.kind === "deepScanSlices") {
                return (
                  <div
                    key="deep-scan-branches"
                    role="group"
                    aria-label={t("shell.sidebarDeepScanBranchesAria")}
                    className={cn(
                      collapsed ? "space-y-0.5" : "mt-0.5 mb-1 space-y-0.5 rounded-r-xl border-l-2 border-purple-500/40 bg-gradient-to-r from-purple-500/[0.06] to-transparent py-1 pl-2 ml-2"
                    )}
                  >
                    {!collapsed ? (
                      <p className="text-[9px] font-bold text-purple-400/70 uppercase tracking-widest pl-1.5 pt-0.5 pb-0.5">
                        {t("shell.sidebarDeepScanBranchCaption")}
                      </p>
                    ) : null}
                    {seg.entries.map((item) => {
                      const isActive =
                        activeFeature === item.id;
                      const byteLabel = sidebarByteBadges[item.id];
                      const count = badges[item.id];
                      return (
                        <SidebarItem
                          key={item.id}
                          entry={item}
                          isActive={isActive}
                          collapsed={collapsed}
                          badgeText={byteLabel}
                          countFallback={count}
                          onSelect={() => onFeatureChange(item.id)}
                        />
                      );
                    })}
                  </div>
                );
              }

              const item = seg.entry;
              const key = item.id;
              const isActive = isNavFeature(item)
                ? activeFeature === item.id
                : isAIPanelOpen;
              const byteLabel = isNavFeature(item) ? sidebarByteBadges[item.id] : undefined;
              const count = isNavFeature(item) ? badges[item.id] : undefined;
              return (
                <SidebarItem
                  key={key}
                  entry={item}
                  isActive={isActive}
                  collapsed={collapsed}
                  badgeText={byteLabel}
                  countFallback={count}
                  onSelect={() => {
                    if (isNavFeature(item)) onFeatureChange(item.id);
                    else onAIButtonClick?.();
                  }}
                />
              );
            })}
          </div>
        ))}

      </aside>

      {/* Main split view */}
      <div className="flex-1 flex min-w-0 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <header className="h-11 flex items-center justify-between px-4 border-b border-white/10 bg-[#15161a]/92 backdrop-blur-sm shrink-0 relative z-50 gap-3">
            <span className="text-sm font-semibold text-white/80 truncate min-w-0">{headerTitle}</span>
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              {diskInlineSummary ? (
                <span
                  className="hidden md:inline text-[11px] text-white/45 tabular-nums truncate max-w-[min(220px,28vw)]"
                  title={diskInlineSummary}
                >
                  {diskInlineSummary}
                </span>
              ) : null}
              <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onSearchClick}
                className="p-1.5 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label={t("shell.search")}
              >
                <Search size={17} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={onSettingsClick}
                className="p-1.5 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label={t("settings.title")}
              >
                <Settings size={17} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={onDeletionModeClick}
                className="p-1.5 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                title={t("shell.deletionModeTitle")}
                aria-label={t("shell.deletionModeAria")}
              >
                <SlidersHorizontal size={17} strokeWidth={2.25} />
              </button>
              <div className="relative" ref={diskPopoverRef}>
                <button
                  type="button"
                  onClick={() => setDiskMenuOpen((o) => !o)}
                  className="p-1.5 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  title={diskFreeLabel ? `${t("shell.disk")} ${pct}%` : t("shell.disk")}
                  aria-label={t("shell.disk")}
                  aria-expanded={diskMenuOpen}
                >
                  <HardDrive size={17} strokeWidth={2.25} />
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
                className="p-1.5 text-white/55 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                title={t("profile.title")}
                aria-label={t("profile.title")}
              >
                <User size={17} strokeWidth={2.25} />
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

          {footerActivity ? (
            <div
              className={`pointer-events-none fixed left-0 right-0 z-[55] px-4 sm:px-6 ${
                showScanOrb ? "bottom-[5.75rem] sm:bottom-24 max-md:bottom-[6.25rem]" : "bottom-3"
              }`}
            >
              <p
                className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-center text-[11px] leading-snug text-white/65 backdrop-blur-md shadow-lg"
                role="status"
                aria-live="polite"
              >
                {footerActivity}
              </p>
            </div>
          ) : null}

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
