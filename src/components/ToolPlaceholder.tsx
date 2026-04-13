import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";

export function ToolPlaceholder({
  title,
  slug,
}: {
  title: string;
  slug: string;
}) {
  const navigate = useNavigate();
  const premium = slug === "malware" || slug === "privacy";

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-12 bg-[#1e1e1e]/50">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md"
      >
        <Sparkles className="mx-auto mb-4 text-blue-500" size={40} />
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          {premium
            ? "Premium tools are planned for a future release. Smart Scan already covers safe caches, duplicates, large files, and backups."
            : "Run Smart Scan from the dashboard to analyze duplicates, large files, and caches. This view is a shortcut — results appear in Smart Scan."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Smart Scan
        </button>
      </motion.div>
    </div>
  );
}
