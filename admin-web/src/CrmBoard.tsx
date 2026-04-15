import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { supabase } from "./supabase";

export const CRM_STAGES = [
  "DEMO_REQUESTED",
  "DOWNLOADED",
  "DEMO_ACTIVATED",
  "SCANNED",
  "UPGRADE_INTENT",
  "PAID",
  "ACTIVATED",
  "ARCHIVED",
  "affiliate_customer",
] as const;

type Contact = {
  id: string;
  stage: string;
  display_name: string | null;
  email: string | null;
  visitor_id: string | null;
  last_activity_at: string | null;
  phone: string | null;
  category_id: string | null;
};

function DroppableCol({ stage, children }: { stage: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border min-h-[220px] p-2 flex flex-col gap-2 ${isOver ? "border-amber-500/60 bg-amber-950/20" : "border-zinc-800 bg-zinc-900/40"}`}
    >
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase px-1 shrink-0">{stage}</h3>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[70vh]">{children}</div>
    </div>
  );
}

function DraggableCard({ contact, onSelect }: { contact: Contact; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `contact-${contact.id}`,
    data: { contact },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.85 : 1 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-xs cursor-grab active:cursor-grabbing"
    >
      <div className="font-medium">{contact.display_name || contact.email || contact.visitor_id?.slice(0, 12) || "—"}</div>
      <div className="text-zinc-500 truncate">{contact.email ?? ""}</div>
      <button
        type="button"
        className="mt-2 text-[10px] text-amber-500 underline"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onSelect()}
      >
        Detail
      </button>
    </div>
  );
}

export function CrmKanbanDnd() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; event_type: string; created_at: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string; due_at: string | null; status: string }[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [waTemplates, setWaTemplates] = useState<{ id: string; name: string; body: string }[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("crm_contacts")
      .select("id, stage, display_name, email, visitor_id, last_activity_at, phone, category_id")
      .order("last_activity_at", { ascending: false })
      .limit(400);
    if (error) setErr(error.message);
    else {
      setErr(null);
      setContacts((data ?? []) as Contact[]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const [c, w] = await Promise.all([
        supabase.from("crm_categories").select("id, name").order("sort_order"),
        supabase.from("wa_templates").select("id, name, body").order("name"),
      ]);
      setCategories((c.data ?? []) as { id: string; name: string }[]);
      setWaTemplates((w.data ?? []) as { id: string; name: string; body: string }[]);
    })();
  }, []);

  const openDetail = async (c: Contact) => {
    setDetail(c);
    const [n, e, t] = await Promise.all([
      supabase.from("crm_notes").select("id, body, created_at").eq("contact_id", c.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("crm_events").select("id, event_type, created_at").eq("contact_id", c.id).order("created_at", { ascending: false }).limit(80),
      supabase.from("crm_tasks").select("id, title, due_at, status").eq("contact_id", c.id).order("due_at", { ascending: true }).limit(50),
    ]);
    setNotes((n.data ?? []) as typeof notes);
    setEvents((e.data ?? []) as typeof events);
    setTasks((t.data ?? []) as typeof tasks);
    setNoteBody("");
    setTaskTitle("");
    setTaskDue("");
  };

  const onDragEnd = async (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over) return;
    const newStage = String(over.id);
    const id = String(active.id).replace("contact-", "");
    if (!CRM_STAGES.includes(newStage as (typeof CRM_STAGES)[number])) return;
    const { error } = await supabase.from("crm_contacts").update({ stage: newStage, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) setErr(error.message);
    else void load();
  };

  const addNote = async () => {
    if (!detail || !noteBody.trim()) return;
    const { error } = await supabase.from("crm_notes").insert({ contact_id: detail.id, body: noteBody.trim() });
    if (error) setErr(error.message);
    else {
      setNoteBody("");
      void openDetail(detail);
    }
  };

  const addTask = async () => {
    if (!detail || !taskTitle.trim()) return;
    const { error } = await supabase.from("crm_tasks").insert({
      contact_id: detail.id,
      title: taskTitle.trim(),
      due_at: taskDue ? new Date(taskDue).toISOString() : null,
      status: "open",
    });
    if (error) setErr(error.message);
    else {
      setTaskTitle("");
      setTaskDue("");
      void openDetail(detail);
    }
  };

  const waFill = useMemo(() => {
    if (!detail) return "";
    const t = waTemplates[0]?.body ?? "Halo {name}";
    return t
      .replace(/\{name\}/g, detail.display_name || "—")
      .replace(/\{email\}/g, detail.email || "—")
      .replace(/\{checkoutLink\}/g, "https://macfyi.com");
  }, [detail, waTemplates]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white">CRM — Kanban</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <DndContext sensors={sensors} onDragEnd={(e) => void onDragEnd(e)}>
        <div className="flex gap-2 overflow-x-auto pb-4">
          {CRM_STAGES.map((st) => (
            <div key={st} className="min-w-[200px] w-[200px] shrink-0">
              <DroppableCol stage={st}>
                {contacts
                  .filter((c) => c.stage === st)
                  .map((c) => (
                    <DraggableCard key={c.id} contact={c} onSelect={() => void openDetail(c)} />
                  ))}
              </DroppableCol>
            </div>
          ))}
        </div>
      </DndContext>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="presentation" onClick={() => setDetail(null)}>
          <div
            className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-5 overflow-y-auto h-full"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Lead</h3>
            <p className="text-xs text-zinc-500 mt-1">{detail.email}</p>
            <label className="block mt-4 text-xs text-zinc-500">
              Kategori
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                value={detail.category_id ?? ""}
                onChange={async (e) => {
                  const v = e.target.value || null;
                  await supabase.from("crm_contacts").update({ category_id: v, updated_at: new Date().toISOString() }).eq("id", detail.id);
                  setDetail({ ...detail, category_id: v });
                  void load();
                }}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-white mb-2">WhatsApp</h4>
              <textarea readOnly className="w-full text-xs rounded border border-zinc-800 bg-zinc-900 p-2 min-h-[80px]" value={waFill} />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="text-xs text-amber-500 underline"
                  onClick={() => void navigator.clipboard.writeText(waFill)}
                >
                  Salin pesan
                </button>
                <a
                  className="text-xs text-emerald-400 underline"
                  href={`https://wa.me/?text=${encodeURIComponent(waFill)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka WhatsApp
                </a>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-white mb-2">Catatan</h4>
              <ul className="space-y-2 text-xs text-zinc-300 max-h-40 overflow-y-auto">
                {notes.map((n) => (
                  <li key={n.id} className="border-b border-zinc-800 pb-2">
                    {n.body}
                  </li>
                ))}
              </ul>
              <textarea
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                placeholder="Catatan baru…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <button type="button" className="mt-1 text-xs text-amber-500" onClick={() => void addNote()}>
                Simpan catatan
              </button>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-white mb-2">Tugas</h4>
              <ul className="text-xs space-y-1">
                {tasks.map((t) => (
                  <li key={t.id} className="text-zinc-400">
                    {t.title} — {t.status} {t.due_at ? `(${t.due_at.slice(0, 10)})` : ""}
                  </li>
                ))}
              </ul>
              <input
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                placeholder="Judul tugas"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
              <input type="datetime-local" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              <button type="button" className="mt-1 text-xs text-amber-500" onClick={() => void addTask()}>
                Tambah tugas
              </button>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-white mb-2">Timeline</h4>
              <ul className="text-xs text-zinc-500 space-y-1 max-h-48 overflow-y-auto">
                {events.map((ev) => (
                  <li key={ev.id}>
                    {ev.created_at.slice(0, 16)} — {ev.event_type}
                  </li>
                ))}
              </ul>
            </div>

            <button type="button" className="mt-8 text-sm text-zinc-400 underline" onClick={() => setDetail(null)}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
