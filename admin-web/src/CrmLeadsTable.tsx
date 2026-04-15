import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { CRM_STAGES } from "./CrmBoard";

type Row = {
  id: string;
  stage: string;
  display_name: string | null;
  email: string | null;
  visitor_id: string | null;
  last_activity_at: string | null;
  phone: string | null;
};

export function CrmLeadsTableAdmin() {
  const [data, setData] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "last_activity_at", desc: true }]);

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from("crm_contacts")
      .select("id, stage, display_name, email, visitor_id, last_activity_at, phone")
      .order("last_activity_at", { ascending: false })
      .limit(500);
    if (error) setErr(error.message);
    else {
      setErr(null);
      setData((rows ?? []) as Row[]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: "display_name", header: "Nama" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "phone", header: "Tel" },
      { accessorKey: "stage", header: "Stage" },
      { accessorKey: "last_activity_at", header: "Aktivitas terakhir" },
      { accessorKey: "visitor_id", header: "Visitor" },
    ],
    []
  );

  const filteredData = useMemo(() => {
    let d = data;
    if (stageFilter) d = d.filter((r) => r.stage === stageFilter);
    const q = globalFilter.trim().toLowerCase();
    if (q) {
      d = d.filter((r) =>
        [r.email, r.display_name, r.visitor_id, r.phone].some((x) => (x ?? "").toLowerCase().includes(q))
      );
    }
    return d;
  }, [data, globalFilter, stageFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const stageRows = table.getRowModel().rows;

  const exportCsv = () => {
    const headers = ["id", "stage", "display_name", "email", "phone", "last_activity_at", "visitor_id"];
    const lines = [headers.join(",")];
    for (const r of stageRows) {
      const o = r.original;
      lines.push(
        [o.id, o.stage, JSON.stringify(o.display_name ?? ""), JSON.stringify(o.email ?? ""), o.phone ?? "", o.last_activity_at ?? "", o.visitor_id ?? ""].join(
          ","
        )
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <h2 className="text-lg font-medium text-white">CRM — Tabel leads</h2>
        <button type="button" className="text-sm rounded-lg bg-amber-600 px-3 py-2 text-white" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="Cari nama / email…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Semua stage</option>
          {CRM_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className="text-xs text-zinc-400 underline" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500 border-b border-zinc-800">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="p-2 cursor-pointer select-none" onClick={h.column.getToggleSortingHandler()}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[h.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {stageRows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/80">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2 text-zinc-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
