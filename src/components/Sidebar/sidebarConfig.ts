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
  accent: SidebarAccent;
  group: SidebarGroup;
  /** Premium icon used for both expanded and collapsed states. */
  icon: ComponentType<{ size?: number; className?: string }>;
  /** If true, show count badge (from App `badges` prop) when no byte badge. */
  useCountFallback?: boolean;
  /**
   * Tampilan inden + rail (hasil irisan Deep Scanning). Dipasangkan berturutan dengan satu entry `cleanup` + `my-clutter`.
   */
  nestedUnderDeepScan?: boolean;
}

export type SidebarNavSegment =
  | { kind: "item"; entry: SidebarNavEntry }
  | { kind: "deepScanSlices"; entries: readonly [SidebarMenuEntry, SidebarMenuEntry] };

function isSidebarMenuRow(e: SidebarNavEntry | undefined | null): e is SidebarMenuEntry {
  return e != null && e.id !== AI_SIDEBAR_ID;
}

/** Mengelompokkan Cleanup + My Files berturutan agar bisa dibungkus rail hierarki. */
export function segmentSidebarNav(entries: SidebarNavEntry[]): SidebarNavSegment[] {
  const out: SidebarNavSegment[] = [];
  let i = 0;
  while (i < entries.length) {
    const a = entries[i];
    if (a == null) {
      i += 1;
      continue;
    }
    const b = entries[i + 1];
    const canPair =
      isSidebarMenuRow(a) &&
      isSidebarMenuRow(b) &&
      a.id === "cleanup" &&
      b.id === "my-clutter" &&
      Boolean(a.nestedUnderDeepScan) &&
      Boolean(b.nestedUnderDeepScan);
    if (canPair) {
      out.push({ kind: "deepScanSlices", entries: [a, b] });
      i += 2;
    } else {
      out.push({ kind: "item", entry: a });
      i += 1;
    }
  }
  return out;
}

/** English primary label + Indonesian helper line; order matches product flow. */
export const SIDEBAR_MENUS: SidebarMenuEntry[] = [
  {
    id: "smart-care",
    label: "Deep Scanning",
    sublabel: "Pemindaian mendalam & ringkasan",
    accent: "purple",
    group: "maintenance",
    icon: Sparkles,
  },
  {
    id: "cleanup",
    label: "Junk Cleanup",
    sublabel: "Deep Scan · cache & sampah aman",
    accent: "green",
    group: "maintenance",
    icon: Trash,
    useCountFallback: true,
    nestedUnderDeepScan: true,
  },
  {
    id: "my-clutter",
    label: "My Files",
    sublabel: "Deep Scan · berkas besar & duplikat",
    accent: "blue",
    group: "maintenance",
    icon: CircleDashed,
    useCountFallback: true,
    nestedUnderDeepScan: true,
  },
  {
    id: "disk-explorer",
    label: "Disk Explorer",
    sublabel: "Telusuri isi folder",
    accent: "indigo",
    group: "maintenance",
    icon: FolderTree,
  },
  {
    id: "uninstaller",
    label: "App Uninstaller",
    sublabel: "Hapus app + sisa file",
    accent: "orange",
    group: "maintenance",
    icon: PackageOpen,
    useCountFallback: true,
  },
  {
    id: "user-trash",
    label: "Trash Manager",
    sublabel: "Kosongkan & pulihkan",
    accent: "slate",
    group: "maintenance",
    icon: Trash2,
  },
  {
    id: "monitor",
    label: "Monitor",
    sublabel: "RAM, CPU, & disk",
    accent: "yellow",
    group: "insights",
    icon: Activity,
  },
  {
    id: "performance",
    label: "Performance",
    sublabel: "Grafik beban & storage",
    accent: "yellow",
    group: "insights",
    icon: Bolt,
  },
  {
    id: "history",
    label: "History",
    sublabel: "Aktivitas sebelumnya",
    accent: "slate",
    group: "insights",
    icon: Clock3,
  },
  {
    id: "settings",
    label: "Settings",
    sublabel: "Pengaturan app",
    accent: "slate",
    group: "system",
    icon: Settings,
  },
];

export interface SidebarAIRow {
  id: typeof AI_SIDEBAR_ID;
  label: string;
  sublabel: string;
  accent: SidebarAccent;
  group: "maintenance";
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const SIDEBAR_AI_ROW: SidebarAIRow = {
  id: AI_SIDEBAR_ID,
  label: "AI Assistant",
  sublabel: "Tanya soal storage Mac",
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
