import { useState } from "react";
import { CrmKanbanDnd } from "./CrmBoard";
import { CrmLeadsTableAdmin } from "./CrmLeadsTable";
import { CrmRecentEvents } from "./CrmRecentEvents";

export function CrmHubAdmin() {
  const [tab, setTab] = useState<"kanban" | "table" | "events">("kanban");
  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      key={id}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"}`}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {tabBtn("kanban", "Kanban")}
        {tabBtn("table", "Table & export")}
        {tabBtn("events", "Events timeline")}
      </div>
      {tab === "kanban" ? <CrmKanbanDnd /> : null}
      {tab === "table" ? <CrmLeadsTableAdmin /> : null}
      {tab === "events" ? <CrmRecentEvents /> : null}
    </div>
  );
}
