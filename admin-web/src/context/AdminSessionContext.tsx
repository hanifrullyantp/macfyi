import { createContext, useContext, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

const AdminSessionContext = createContext<Session | null>(null);

export function AdminSessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <AdminSessionContext.Provider value={session}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): Session {
  const s = useContext(AdminSessionContext);
  if (!s) {
    throw new Error("useAdminSession must be used inside the authenticated admin shell (AdminSessionProvider).");
  }
  return s;
}
