import { LogOut, User } from "lucide-react";

export function UserBar({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-400">
      <User className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <span className="max-w-[160px] truncate text-zinc-300" title={email}>
        {email || "—"}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        className="ml-1 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Out</span>
      </button>
    </div>
  );
}
