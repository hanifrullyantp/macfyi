import { motion } from "framer-motion";
import type { StorageEntry } from "../types";
import {
  Folder,
  Download,
  Image,
  Music,
  Film,
  Mail,
  Code,
  Archive,
  HardDrive,
  AppWindow,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  app: <AppWindow size={14} />,
  doc: <Folder size={14} />,
  download: <Download size={14} />,
  desktop: <HardDrive size={14} />,
  image: <Image size={14} />,
  audio: <Music size={14} />,
  video: <Film size={14} />,
  mail: <Mail size={14} />,
  code: <Code size={14} />,
  cache: <Archive size={14} />,
  support: <Folder size={14} />,
  log: <Folder size={14} />,
};

/** Muted indigo ramp — same look in browser (mock) and Tauri (live data). */
function segmentFill(index: number): string {
  const n = index % 12;
  const hue = 238 - n * 5;
  const sat = 26 + (n % 4) * 4;
  const light = 36 + (n % 5) * 5;
  return `hsl(${hue} ${sat}% ${light}% / 0.9)`;
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

export function StorageChart({ entries }: { entries: StorageEntry[] }) {
  const total = entries.reduce((a, e) => a + e.sizeBytes, 0);

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-5 rounded-full overflow-hidden flex bg-white/5">
        {entries.map((e, i) => {
          const pct = total > 0 ? (e.sizeBytes / total) * 100 : 0;
          if (pct < 0.5) return null;
          return (
            <motion.div
              key={e.name}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: segmentFill(i) }}
              title={`${e.name}: ${formatSize(e.sizeBytes)}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1.5">
        {entries.slice(0, 10).map((e, i) => (
          <div key={e.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: segmentFill(i) }}
            />
            <span className="text-white/50">{ICON_MAP[e.iconHint] ?? <Folder size={14} />}</span>
            <span className="text-[11px] text-white/80 font-medium truncate flex-1">{e.name}</span>
            <span className="text-[11px] text-white/40 font-mono tabular-nums">{formatSize(e.sizeBytes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
