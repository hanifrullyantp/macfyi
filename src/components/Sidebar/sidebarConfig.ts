import type { ComponentType } from "react";
import {
  Activity,
  Bolt,
  Bot,
  CircleDashed,
  Clock3,
  FolderTree,
  PackageOpen,
  Settings,
  Sparkles,
  Trash,
  Trash2,
} from "lucide-react";
import type { FeatureId } from "../../lib/featureId";
import { AI_SIDEBAR_ID } from "../../lib/featureId";

export type SidebarGroup = "maintenance" | "insights" | "system";

export type SidebarAccent = "purple" | "green" | "blue" | "orange" | "indigo" | "yellow" | "pink" | "slate";

export interface SidebarMenuEntry {
  id: FeatureId;
  label: string;
  sublabel: string;
  emoji: string;
  accent: SidebarAccent;
  group: SidebarGroup;
  /** Lucide fallback when sidebar is collapsed (emoji also shown when expanded). */
  icon: ComponentType<{ size?: number; className?: string }>;
  /** If true, show count badge (from App `badges` prop) when no byte badge. */
  useCountFallback?: boolean;
}

/** English primary label + Indonesian helper line; order matches product flow. */
export const SIDEBAR_MENUS: SidebarMenuEntry[] = [
  {
    id: "smart-care",
    label: "Dashboard",
    sublabel: "Hasil ringkas & scan",
    emoji: "🏠",
    accent: "purple",
    group: "maintenance",
    icon: Sparkles,
  },
  {
    id: "cleanup",
    label: "Junk Cleanup",
    sublabel: "Cache & file sampah",
    emoji: "🧹",
    accent: "green",
    group: "maintenance",
    icon: Trash,
    useCountFallback: true,
  },
  {
    id: "my-clutter",
    label: "My Files",
    sublabel: "Download, duplikat, file besar",
    emoji: "📁",
    accent: "blue",
    group: "maintenance",
    icon: CircleDashed,
    useCountFallback: true,
  },
  {
    id: "disk-explorer",
    label: "Disk Explorer",
    sublabel: "Telusuri isi folder",
    emoji: "🔍",
    accent: "indigo",
    group: "maintenance",
    icon: FolderTree,
  },
  {
    id: "uninstaller",
    label: "App Uninstaller",
    sublabel: "Hapus app + sisa file",
    emoji: "🗑",
    accent: "orange",
    group: "maintenance",
    icon: PackageOpen,
    useCountFallback: true,
  },
  {
    id: "user-trash",
    label: "Trash Manager",
    sublabel: "Kosongkan & pulihkan",
    emoji: "🗂",
    accent: "slate",
    group: "maintenance",
    icon: Trash2,
  },
  {
    id: "monitor",
    label: "Monitor",
    sublabel: "RAM, CPU, & disk",
    emoji: "📊",
    accent: "yellow",
    group: "insights",
    icon: Activity,
  },
  {
    id: "performance",
    label: "Performance",
    sublabel: "Grafik beban & storage",
    emoji: "⚡",
    accent: "yellow",
    group: "insights",
    icon: Bolt,
  },
  {
    id: "history",
    label: "History",
    sublabel: "Aktivitas sebelumnya",
    emoji: "🕐",
    accent: "slate",
    group: "insights",
    icon: Clock3,
  },
  {
    id: "settings",
    label: "Settings",
    sublabel: "Pengaturan app",
    emoji: "⚙️",
    accent: "slate",
    group: "system",
    icon: Settings,
  },
];

export interface SidebarAIRow {
  id: typeof AI_SIDEBAR_ID;
  label: string;
  sublabel: string;
  emoji: string;
  accent: SidebarAccent;
  group: "maintenance";
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const SIDEBAR_AI_ROW: SidebarAIRow = {
  id: AI_SIDEBAR_ID,
  label: "AI Assistant",
  sublabel: "Tanya soal storage Mac",
  emoji: "🤖",
  accent: "pink",
  group: "maintenance",
  icon: Bot,
};

export type SidebarNavEntry = SidebarMenuEntry | SidebarAIRow;

const GROUP_ORDER: SidebarGroup[] = ["maintenance", "insights", "system"];

export function getGroupedSidebarMenu(): { group: SidebarGroup; items: SidebarMenuEntry[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    items: SIDEBAR_MENUS.filter((i) => i.group === group),
  }));
}

export function appendAIRow(
  groups: { group: SidebarGroup; items: SidebarMenuEntry[] }[]
): { group: SidebarGroup; items: SidebarNavEntry[] }[] {
  return groups.map((g) => {
    if (g.group !== "maintenance") return g;
    return { group: g.group, items: [...g.items, SIDEBAR_AI_ROW] };
  });
}

export const GROUP_LABEL_KEY: Record<SidebarGroup, string> = {
  maintenance: "shell.maintenance",
  insights: "shell.insights",
  system: "shell.system",
};
