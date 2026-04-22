import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Contact, LayoutGrid, List, Plus, X } from "lucide-react";
import { supabase } from "../../supabase";
import { cn } from "../utils/cn";
import { ConfirmDialog } from "../components/ConfirmDialog";

type Stage = "lead" | "contacted" | "demo" | "trial" | "customer" | "churned";

const CRM_STAGES: { id: Stage; label: string; dot: string }[] = [
  { id: "lead", label: "Lead", dot: "bg-blue-500" },
  { id: "contacted", label: "Contacted", dot: "bg-purple-500" },
  { id: "demo", label: "Demo", dot: "bg-yellow-500" },
  { id: "trial", label: "Trial", dot: "bg-orange-500" },
  { id: "customer", label: "Customer", dot: "bg-emerald-500" },
  { id: "churned", label: "Churned", dot: "bg-red-500" },
];

type ContactRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  stage: Stage;
  last_activity_at: string | null;
  estimated_value_idr: number | null;
  actual_value_idr: number | null;
  created_at: string;
};

type ContactDetail = {
  contact: ContactRow;
  events: { id: string; event_type: string; payload: unknown; created_at: string }[];
  notes: { id: string; body: string; created_at: string }[];
};

function stageLabel(stage: Stage): string {
  return CRM_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export const CRM: React.FC = () => {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<{ id: string; next: Stage } | null>(null);

  const contactsQ = useQuery({
    queryKey: ["crm", "contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, display_name, email, stage, last_activity_at, estimated_value_idr, actual_value_idr, created_at")
        .order("last_activity_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ContactRow[];
    },
  });

  const detailQ = useQuery({
    queryKey: ["crm", "detail", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const id = selectedId!;
      const { data: contact, error } = await supabase
        .from("crm_contacts")
        .select("id, display_name, email, stage, last_activity_at, estimated_value_idr, actual_value_idr, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!contact) throw new Error("Contact not found");
      const [eventsRes, notesRes] = await Promise.all([
        supabase.from("crm_events").select("id, event_type, payload, created_at").eq("contact_id", id).order("created_at", { ascending: false }).limit(200),
        supabase.from("crm_notes").select("id, body, created_at").eq("contact_id", id).order("created_at", { ascending: false }).limit(200),
      ]);
      return {
        contact: contact as ContactRow,
        events: (eventsRes.data ?? []) as ContactDetail["events"],
        notes: (notesRes.data ?? []) as ContactDetail["notes"],
      } satisfies ContactDetail;
    },
  });

  const updateStageMut = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Stage }) => {
      const { error } = await supabase
        .from("crm_contacts")
        .update({ stage: next, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("crm_events").insert({
        contact_id: id,
        event_type: "stage_changed",
        payload: { stage: next },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crm"] });
    },
  });

  const rows = contactsQ.data ?? [];
  const countByStage = useMemo(() => {
    const map = new Map<Stage, number>();
    for (const s of CRM_STAGES) map.set(s.id, 0);
    for (const r of rows) map.set(r.stage, (map.get(r.stage) ?? 0) + 1);
    return map;
  }, [rows]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-600 shadow-[0_0_20px_rgba(225,6,0,0.1)]">
              <Contact size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Hubungan Pelanggan</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
            CRM <span className="text-red-600 italic">Hub</span>
          </h1>
          <p className="text-white/30 font-medium max-w-xl">Conversion pipeline berbasis `crm_contacts.stage` + event timeline dari `crm_events`.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#16161C] border border-white/5 rounded-2xl mr-2">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn("p-2 rounded-xl transition-all", viewMode === "board" ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white")}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-xl transition-all", viewMode === "list" ? "bg-red-600 text-white shadow-lg" : "text-white/30 hover:text-white")}
            >
              <List size={18} />
            </button>
          </div>
          <button
            type="button"
            disabled
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-red-600/40 text-white/60 font-black text-[11px] uppercase tracking-[0.2em] cursor-not-allowed"
            title="Tambah kontak manual akan ditambahkan setelah pipeline stabil"
          >
            <Plus size={16} />
            Tambah Kontak
          </button>
        </div>
      </div>

      {contactsQ.isError ? <p className="text-sm text-red-400">{(contactsQ.error as Error).message}</p> : null}

      {viewMode === "board" ? (
        <div className="flex gap-6 overflow-x-auto pb-10 custom-scrollbar -mx-4 px-4 h-[calc(100vh-320px)] min-h-[600px]">
          {CRM_STAGES.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", stage.dot)} />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">{stage.label}</h3>
                  <span className="text-[10px] font-black text-white/20 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                    {countByStage.get(stage.id) ?? 0}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {(rows.filter((c) => c.stage === stage.id) ?? []).map((contact) => {
                  const name = (contact.display_name ?? contact.email ?? "Unknown").slice(0, 120);
                  const email = contact.email ?? "—";
                  const value = Number(contact.actual_value_idr ?? contact.estimated_value_idr ?? 0);
                  const last = contact.last_activity_at ?? contact.created_at;
                  return (
                    <motion.div
                      layoutId={contact.id}
                      key={contact.id}
                      onClick={() => setSelectedId(contact.id)}
                      className="bg-[#16161C] border border-white/[0.05] rounded-3xl p-6 shadow-xl hover:border-red-500/20 transition-all group cursor-pointer active:scale-95 duration-500"
                    >
                      <div className="flex flex-col gap-4">
                        <div>
                          <h4 className="font-black text-white group-hover:text-red-500 transition-colors leading-tight">{name}</h4>
                          <p className="text-[10px] font-medium text-white/30 truncate mt-1">{email}</p>
                        </div>

                        <div className="pt-4 border-t border-white/[0.03] flex items-center justify-between">
                          <div className="text-xs font-black text-red-500 tabular-nums">Rp {value.toLocaleString("id-ID")}</div>
                          <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{String(last).slice(0, 19).replace("T", " ")}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#16161C] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/[0.03]">
                  <th className="px-8 py-6">Nama & Kontak</th>
                  <th className="px-8 py-6">Tahap</th>
                  <th className="px-8 py-6">Nilai</th>
                  <th className="px-8 py-6">Last activity</th>
                  <th className="px-8 py-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {rows.map((c) => (
                  <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedId(c.id)}>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-red-500 transition-colors tracking-tight">
                          {(c.display_name ?? c.email ?? "Unknown").slice(0, 120)}
                        </span>
                        <span className="text-[11px] font-medium text-white/30">{c.email ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 text-white/80 shadow-lg bg-white/5 border border-white/10">
                        {stageLabel(c.stage)}
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-red-500 text-xs tabular-nums">
                      Rp {Number(c.actual_value_idr ?? c.estimated_value_idr ?? 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-white/30">{String(c.last_activity_at ?? c.created_at).slice(0, 19).replace("T", " ")}</td>
                    <td className="px-8 py-6 text-right">
                      <button type="button" className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400">
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedId && detailQ.data?.contact ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#0E0E11] border-l border-white/10 z-[110] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter">{detailQ.data.contact.display_name ?? detailQ.data.contact.email ?? "Contact"}</h2>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-0.5">{stageLabel(detailQ.data.contact.stage)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-red-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <section className="space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Update stage</div>
                  <div className="flex flex-wrap gap-2">
                    {CRM_STAGES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setPendingStage({ id: selectedId, next: s.id })}
                        className={cn(
                          "px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          detailQ.data?.contact.stage === s.id
                            ? "bg-red-600 text-white border-red-500/40"
                            : "bg-white/[0.02] text-white/40 border-white/10 hover:text-white hover:border-red-500/30",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Events</div>
                  {detailQ.data.events.length ? (
                    <ul className="space-y-2">
                      {detailQ.data.events.slice(0, 30).map((e) => (
                        <li key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-white/25">{e.event_type}</div>
                          <div className="text-[10px] text-white/25 mt-1">{String(e.created_at).slice(0, 19).replace("T", " ")}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-white/30">Belum ada event.</p>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Notes</div>
                  {detailQ.data.notes.length ? (
                    <ul className="space-y-2">
                      {detailQ.data.notes.slice(0, 30).map((n) => (
                        <li key={n.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/70">
                          {n.body}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-white/30">Belum ada catatan.</p>
                  )}
                </section>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={Boolean(pendingStage)}
        onClose={() => setPendingStage(null)}
        onConfirm={async () => {
          if (!pendingStage) return;
          await updateStageMut.mutateAsync({ id: pendingStage.id, next: pendingStage.next });
        }}
        title="Ubah stage CRM?"
        description={pendingStage ? `Ubah stage menjadi ${stageLabel(pendingStage.next)}?` : ""}
        confirmText={updateStageMut.isPending ? "Menyimpan…" : "Ya, ubah"}
        type="info"
      />
    </div>
  );
};

