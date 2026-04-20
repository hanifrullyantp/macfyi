import type { Session } from "@supabase/supabase-js";
import { useOutletContext } from "react-router-dom";

export type AdminOutletContext = { session: Session };

export function useAdminSession(): Session {
  const ctx = useOutletContext<AdminOutletContext | null>();
  if (!ctx?.session) throw new Error("useAdminSession must be used under AppLayout");
  return ctx.session;
}
