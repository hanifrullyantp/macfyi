import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../../lib/cn";

export function CopyButton({ text, className, title = "Copy" }: { text: string; className?: string; title?: string }) {
  const [ok, setOk] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      window.setTimeout(() => setOk(false), 1600);
    } catch {
      /* */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors",
        className
      )}
      title={title}
    >
      {ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
