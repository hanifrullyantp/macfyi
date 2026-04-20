import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { supabase } from "../supabase";

const SECTION_KEYS = [
  "hero",
  "problem",
  "solution",
  "featuresList",
  "details",
  "steps",
  "pricing",
  "scarcity",
  "valueStack",
  "urgency",
  "trust",
  "comparison",
  "faq",
  "footer",
  "legal",
] as const;

const LANDING_DRAFT_KEY = "macfyi.admin.landingDraft";

type AdminMeta = { sectionOrder?: string[]; hiddenSections?: string[] };

function getAdminMeta(c: Record<string, unknown>): AdminMeta {
  const a = c._admin;
  if (a && typeof a === "object") return a as AdminMeta;
  return {};
}

function SortableRow({
  id,
  label,
  hidden,
  onToggleHidden,
}: {
  id: string;
  label: string;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="mb-1 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-2 text-sm">
      <button type="button" className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300" {...listeners} {...attributes}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="font-mono text-xs text-violet-300">{id}</span>
      <span className="text-xs text-zinc-500">{label}</span>
      <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-400">
        <input type="checkbox" className="rounded border-zinc-600" checked={hidden} onChange={onToggleHidden} />
        hidden
      </label>
    </div>
  );
}

export default function LandingEditorPage() {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const q = useQuery({
    queryKey: ["landing_site_content", "default"],
    queryFn: async () => {
      const { data, error } = await supabase.from("landing_site_content").select("id, content, updated_at").eq("id", "default").maybeSingle();
      if (error) throw error;
      return data as { id: string; content: Record<string, unknown> | null; updated_at: string } | null;
    },
    retry: 0,
  });

  const baseContent = useMemo(() => {
    const raw = q.data?.content;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...(raw as Record<string, unknown>) };
    return {} as Record<string, unknown>;
  }, [q.data?.content]);

  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const content = draft ?? baseContent;

  const sectionOrder = useMemo(() => {
    const meta = getAdminMeta(content);
    const fromMeta = meta.sectionOrder?.filter((k) => SECTION_KEYS.includes(k as (typeof SECTION_KEYS)[number]));
    if (fromMeta?.length) return fromMeta;
    const present = SECTION_KEYS.filter((k) => k in content);
    return present.length ? [...present] : [...SECTION_KEYS];
  }, [content]);

  const setSectionOrder = (order: string[]) => {
    setDraft((prev) => {
      const next = { ...(prev ?? baseContent) };
      const admin = { ...getAdminMeta(next), sectionOrder: order };
      next._admin = admin;
      return next;
    });
  };

  const hiddenSet = useMemo(() => new Set(getAdminMeta(content).hiddenSections ?? []), [content]);

  const toggleSectionHidden = (sectionId: string) => {
    setDraft((prev) => {
      const next = { ...(prev ?? baseContent) };
      const meta = getAdminMeta(next);
      const cur = new Set(meta.hiddenSections ?? []);
      if (cur.has(sectionId)) cur.delete(sectionId);
      else cur.add(sectionId);
      next._admin = { ...meta, hiddenSections: [...cur] };
      return next;
    });
  };

  const [localDraftNotice, setLocalDraftNotice] = useState<"none" | "available">("none");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LANDING_DRAFT_KEY);
      setLocalDraftNotice(raw ? "available" : "none");
    } catch {
      setLocalDraftNotice("none");
    }
  }, [q.data?.updated_at]);

  const saveDraftLocally = () => {
    try {
      const body = { savedAt: new Date().toISOString(), content: draft ?? baseContent };
      localStorage.setItem(LANDING_DRAFT_KEY, JSON.stringify(body));
      setLocalDraftNotice("available");
      toast.success("Draft saved in this browser only");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save draft");
    }
  };

  const clearLocalDraft = () => {
    try {
      localStorage.removeItem(LANDING_DRAFT_KEY);
      setLocalDraftNotice("none");
      toast.message("Local draft cleared");
    } catch {
      /* */
    }
  };

  const mergeLocalDraft = () => {
    try {
      const raw = localStorage.getItem(LANDING_DRAFT_KEY);
      if (!raw) {
        toast.error("No local draft");
        return;
      }
      const parsed = JSON.parse(raw) as { content?: Record<string, unknown> };
      if (!parsed.content || typeof parsed.content !== "object") {
        toast.error("Invalid draft shape");
        return;
      }
      setDraft({ ...baseContent, ...parsed.content });
      toast.success("Merged local draft into editor (review before Save to server)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid draft JSON");
    }
  };

  const hero = (content.hero && typeof content.hero === "object" ? content.hero : {}) as Record<string, string>;

  const setHeroField = (key: string, value: string) => {
    setDraft((prev) => {
      const base = { ...(prev ?? baseContent) };
      const h = { ...(typeof base.hero === "object" ? (base.hero as Record<string, string>) : {}) };
      h[key] = value;
      base.hero = h;
      return base;
    });
  };

  const [faqLocal, setFaqLocal] = useState("");

  useEffect(() => {
    if (!q.isSuccess || draft !== null) return;
    const faq = baseContent.faq;
    setFaqLocal(JSON.stringify(Array.isArray(faq) ? faq : [], null, 2));
  }, [q.isSuccess, q.data?.updated_at, baseContent.faq, draft]);

  const footer = (content.footer && typeof content.footer === "object" ? content.footer : {}) as Record<string, string>;

  const setFooterField = (key: string, value: string) => {
    setDraft((prev) => {
      const base = { ...(prev ?? baseContent) };
      const f = { ...(typeof base.footer === "object" ? (base.footer as Record<string, string>) : {}) };
      f[key] = value;
      base.footer = f;
      return base;
    });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      let faqParsed: unknown;
      try {
        faqParsed = JSON.parse(faqLocal || "[]");
      } catch {
        throw new Error("FAQ JSON invalid");
      }
      if (!Array.isArray(faqParsed)) throw new Error("FAQ must be a JSON array");
      const body = { ...(draft ?? baseContent), faq: faqParsed };
      const { error } = await supabase.from("landing_site_content").upsert({
        id: "default",
        content: body as never,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Landing content saved");
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["landing_site_content"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionOrder.indexOf(String(active.id));
    const newIndex = sectionOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setSectionOrder(arrayMove(sectionOrder, oldIndex, newIndex));
  };

  const previewUrl = import.meta.env.VITE_LANDING_PREVIEW_URL?.trim();

  if (q.isError) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-100">Landing editor</h1>
        <p className="text-sm text-red-400">{(q.error as Error).message}</p>
        <p className="text-xs text-zinc-500">
          If the table is missing, add migration <code className="text-zinc-400">landing_site_content</code> or deploy Edge that expects it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Landing page editor</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Section order and visibility under <code className="text-zinc-400">content._admin</code> (<code className="text-zinc-400">sectionOrder</code>,{" "}
            <code className="text-zinc-400">hiddenSections</code>). Local draft stays in <code className="text-zinc-400">localStorage</code> only — merge when you intend to publish.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={() => saveDraftLocally()}>
            Save draft locally
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => clearLocalDraft()}>
            Clear local draft
          </Button>
          <Button variant="primary" disabled={saveMut.isPending} onClick={() => void saveMut.mutateAsync()}>
            Save to server
          </Button>
        </div>
      </div>

      {localDraftNotice === "available" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
          <span>A saved local draft exists in this browser.</span>
          <Button variant="secondary" size="sm" type="button" onClick={() => mergeLocalDraft()}>
            Merge draft into editor
          </Button>
        </div>
      ) : null}

      {q.data?.updated_at ? <p className="text-xs text-zinc-500">Last updated: {q.data.updated_at}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-200">Section order</h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map((id) => (
                <SortableRow
                  key={id}
                  id={id}
                  label="block"
                  hidden={hiddenSet.has(id)}
                  onToggleHidden={() => toggleSectionHidden(id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">Preview</h2>
            {previewUrl ? (
              <Button variant="secondary" size="sm" type="button" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                Open preview in new tab
              </Button>
            ) : null}
          </div>
          {previewUrl ? (
            <iframe title="Landing preview" src={previewUrl} className="h-80 w-full rounded-lg border border-zinc-800 bg-white" />
          ) : (
            <p className="text-xs text-zinc-500">
              Set <code className="text-zinc-400">VITE_LANDING_PREVIEW_URL</code> for iframe preview, or open landing deploy manually.
            </p>
          )}
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Hero</h2>
        <label className="block text-xs text-zinc-500">
          Title
          <input className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm" value={hero.title ?? ""} onChange={(e) => setHeroField("title", e.target.value)} />
        </label>
        <label className="block text-xs text-zinc-500">
          Headline
          <input className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm" value={hero.headline ?? ""} onChange={(e) => setHeroField("headline", e.target.value)} />
        </label>
        <label className="block text-xs text-zinc-500">
          Subheadline
          <textarea
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            rows={2}
            value={hero.subheadline ?? ""}
            onChange={(e) => setHeroField("subheadline", e.target.value)}
          />
        </label>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-medium text-zinc-200">FAQ (JSON array of {"{q,a}"})</h2>
        <textarea
          className="min-h-[140px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 font-mono text-xs"
          value={faqLocal}
          onChange={(e) => setFaqLocal(e.target.value)}
          spellCheck={false}
        />
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Footer</h2>
        <label className="block text-xs text-zinc-500">
          Address
          <input className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm" value={footer.address ?? ""} onChange={(e) => setFooterField("address", e.target.value)} />
        </label>
        <label className="block text-xs text-zinc-500">
          Contact
          <input className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm" value={footer.contact ?? ""} onChange={(e) => setFooterField("contact", e.target.value)} />
        </label>
        <label className="block text-xs text-zinc-500">
          Copyright
          <input className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm" value={footer.copyright ?? ""} onChange={(e) => setFooterField("copyright", e.target.value)} />
        </label>
      </Card>
    </div>
  );
}
