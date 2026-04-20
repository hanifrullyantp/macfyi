import { lazy, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { RouteErrorBoundary } from "./components/shared/RouteErrorBoundary";
import { LEGACY_REDIRECTS } from "./lib/navigation";
import { supabase, supabaseConfigured } from "./supabase";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LicensesPage = lazy(() => import("./pages/LicensesPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const PromoAndPricingPage = lazy(() => import("./pages/PromoAndPricingPage"));
const AppSettingsPage = lazy(() => import("./pages/AppSettingsPage"));
const LandingEditorPage = lazy(() => import("./pages/LandingEditorPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const LiveActivityPage = lazy(() => import("./pages/LiveActivityPage"));
const AffiliatesPage = lazy(() => import("./pages/AffiliatesPage"));
const WithdrawalsPage = lazy(() => import("./pages/WithdrawalsPage"));
const CrmPage = lazy(() => import("./pages/CrmPage"));
const PlatformSettingsPage = lazy(() => import("./pages/PlatformSettingsPage"));
const EdgeFunctionsPage = lazy(() => import("./pages/EdgeFunctionsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const MarketingPage = lazy(() => import("./pages/MarketingPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const WaTemplatesPage = lazy(() => import("./pages/WaTemplatesPage"));

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
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="max-w-md text-center text-red-300">
          Set <code className="text-zinc-300">VITE_SUPABASE_URL</code> and <code className="text-zinc-300">VITE_SUPABASE_ANON_KEY</code> in{" "}
          <code className="text-zinc-300">.env</code> (see <code className="text-zinc-300">.env.example</code>).
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
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
            className="mt-6 w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin(session)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="max-w-md text-center text-red-300">
          This account is not an admin. Set <code className="text-zinc-300">role: &quot;admin&quot;</code> in Supabase Auth → Users → Raw App Meta Data, then
          sign in again.
        </p>
        <button type="button" onClick={() => void signOut()} className="text-sm text-violet-400 underline">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout session={session} onSignOut={signOut} />} errorElement={<RouteErrorBoundary />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="licenses" element={<LicensesPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="promo-pricing" element={<PromoAndPricingPage />} />
        <Route path="app-settings" element={<AppSettingsPage />} />
        <Route path="landing" element={<LandingEditorPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="live" element={<LiveActivityPage />} />
        <Route path="affiliates" element={<AffiliatesPage />} />
        <Route path="withdrawals" element={<WithdrawalsPage />} />
        <Route path="crm" element={<CrmPage />} />
        <Route path="platform" element={<PlatformSettingsPage />} />
        <Route path="edge-functions" element={<EdgeFunctionsPage />} />
        <Route path="admin-users" element={<AdminUsersPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="wa-templates" element={<WaTemplatesPage />} />
      </Route>
      {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
        <Route key={from} path={from.replace(/^\//, "")} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
