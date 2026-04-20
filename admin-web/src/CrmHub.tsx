import { useState } from "react";
import { CrmKanbanDnd } from "./CrmBoard";
import { CrmLeadsTableAdmin } from "./CrmLeadsTable";

export function CrmHubAdmin() {
  const [tab, setTab] = useState<"kanban" | "table">("kanban");
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "kanban" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"}`}
          onClick={() => setTab("kanban")}
        >
          Kanban
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "table" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"}`}
          onClick={() => setTab("table")}
        >
          Tabel &amp; export
        </button>
      </div>
      {tab === "kanban" ? <CrmKanbanDnd /> : <CrmLeadsTableAdmin />}
    </div>
  );
}
