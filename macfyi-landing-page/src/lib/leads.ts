export type LeadStage = "new" | "contacted" | "qualified" | "lost";

export interface CrmLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  stage: LeadStage;
  createdAt: number;
}

const KEY = "macfyi_landing_leads";

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadLeads(): CrmLead[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as CrmLead[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveLeads(rows: CrmLead[]): void {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 500)));
}

export function addLead(entry: Omit<CrmLead, "id" | "createdAt" | "stage"> & { stage?: LeadStage }): CrmLead {
  const lead: CrmLead = {
    id: uid(),
    createdAt: Date.now(),
    stage: entry.stage ?? "new",
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    message: entry.message,
  };
  saveLeads([lead, ...loadLeads()]);
  return lead;
}

export function updateLeadStage(id: string, stage: LeadStage): void {
  saveLeads(loadLeads().map((l) => (l.id === id ? { ...l, stage } : l)));
}
