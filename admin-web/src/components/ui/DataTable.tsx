import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { cn } from "../../lib/cn";

const VIRTUAL_THRESHOLD = 100;

export function DataTable<T>({
  data,
  columns,
  getRowId,
  empty,
  className,
  maxHeightClass = "max-h-[min(70vh,560px)]",
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId?: (row: T, index: number) => string;
  empty?: React.ReactNode;
  className?: string;
  maxHeightClass?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const rows = table.getRowModel().rows;
  const virtualize = rows.length > VIRTUAL_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
    enabled: virtualize,
  });

  if (!rows.length && empty) {
    return <>{empty}</>;
  }

  const leafCols = table.getAllLeafColumns();
  const gridTemplate = `repeat(${leafCols.length}, minmax(0, 1fr))`;

  if (!virtualize) {
    return (
      <div className={cn("overflow-hidden rounded-xl border border-zinc-800", className)}>
        <div className={cn("overflow-auto", maxHeightClass)}>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 text-xs uppercase tracking-wide text-zinc-500 backdrop-blur-sm">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="whitespace-nowrap px-3 py-2 font-medium">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-3 py-2 align-middle">
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

  const vItems = rowVirtualizer.getVirtualItems();

  return (
    <div className={cn("overflow-hidden rounded-xl border border-zinc-800", className)}>
      <div ref={parentRef} className={cn("overflow-auto", maxHeightClass)}>
        <div className="min-w-[640px]">
          <div
            className="sticky top-0 z-10 grid gap-0 border-b border-zinc-800 bg-zinc-950/95 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 backdrop-blur-sm"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {table.getHeaderGroups()[0]?.headers.map((h) => (
              <div key={h.id} className="min-w-0 truncate py-1">
                {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
              </div>
            ))}
          </div>
          <div className="relative text-sm" style={{ height: rowVirtualizer.getTotalSize() }}>
            {vItems.map((vi) => {
              const row = rows[vi.index];
              return (
                <div
                  key={row.id}
                  className="absolute left-0 right-0 grid gap-0 border-b border-zinc-800/60 px-3 py-2 hover:bg-zinc-900/50"
                  style={{
                    gridTemplateColumns: gridTemplate,
                    transform: `translateY(${vi.start}px)`,
                    height: `${vi.size}px`,
                  }}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="min-w-0 truncate whitespace-nowrap align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
