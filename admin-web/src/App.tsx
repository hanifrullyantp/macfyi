import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AffiliatesAdmin,
  AnalyticsAdmin,
  AnnouncementsAdmin,
  CrmHubAdmin,
  EventsAdmin,
  PlatformSettingsAdmin,
  TransactionsAdmin,
  WithdrawalsAdmin,
} from "./AdminExtraPages";
import { ErrorsLogsAdmin } from "./ErrorsLogsAdmin";
import { MarketingSettingsAdmin } from "./MarketingSettingsAdmin";
import { WaTemplatesAdmin } from "./WaTemplatesAdmin";
import { AdminShell } from "./AdminShell";
import { LegacyDashboard } from "./LegacyDashboard";
import { supabase, supabaseConfigured } from "./supabase";

function isAdmin(session: Session | null): boolean {
  return session?.user.app_metadata?.role === "admin";
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setAuthError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-red-300 max-w-md text-center">
          Set <code className="text-zinc-300">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-zinc-300">VITE_SUPABASE_ANON_KEY</code> in <code className="text-zinc-300">.env</code>{" "}
          (see <code className="text-zinc-300">.env.example</code>).
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
          <h1 className="text-xl font-semibold text-white">Macfyi Admin</h1>
          <p className="mt-2 text-sm text-zinc-400">Sign in with a Supabase user that has app_metadata.role = &quot;admin&quot;.</p>
          <div className="mt-6 space-y-3">
            <label className="block text-xs uppercase tracking-wide text-zinc-500">Email</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <label className="block text-xs uppercase tracking-wide text-zinc-500">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {authError && <p className="mt-3 text-sm text-red-400">{authError}</p>}
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={busy || !email.trim() || !password}
            className="mt-6 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin(session)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-300 text-center max-w-md">
          This account is not an admin. Set <code className="text-zinc-300">role: &quot;admin&quot;</code> in Supabase Auth →
          Users → Raw App Meta Data, then sign in again.
        </p>
        <button type="button" onClick={() => void signOut()} className="text-sm text-amber-500 underline">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AdminShell session={session} onSignOut={signOut} />}>
        <Route index element={<LegacyDashboard session={session} />} />
        <Route path="analitik" element={<AnalyticsAdmin />} />
        <Route path="penarikan" element={<WithdrawalsAdmin session={session} />} />
        <Route path="transaksi" element={<TransactionsAdmin />} />
        <Route path="crm" element={<CrmHubAdmin />} />
        <Route path="affiliates" element={<AffiliatesAdmin />} />
        <Route path="platform" element={<PlatformSettingsAdmin />} />
        <Route path="acara" element={<EventsAdmin />} />
        <Route path="pengumuman" element={<AnnouncementsAdmin />} />
        <Route path="marketing" element={<MarketingSettingsAdmin />} />
        <Route path="wa-templates" element={<WaTemplatesAdmin />} />
        <Route path="logs" element={<ErrorsLogsAdmin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
