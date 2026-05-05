import React, { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./ui2/components/Layout";
import { supabase, supabaseConfigured } from "./supabase";

import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LicensesPage from "./pages/LicensesPage";
import TransactionsPage from "./pages/TransactionsPage";
import CrmPage from "./pages/CrmPage";
import WithdrawalsPage from "./pages/WithdrawalsPage";
import AffiliatesPage from "./pages/AffiliatesPage";
import PromoAndPricingPage from "./pages/PromoAndPricingPage";
import LandingEditorPage from "./pages/LandingEditorPage";
import AppSettingsPage from "./pages/AppSettingsPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import EdgeFunctionsPage from "./pages/EdgeFunctionsPage";
import LogsPage from "./pages/LogsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import LiveActivityPage from "./pages/LiveActivityPage";
import WaTemplatesPage from "./pages/WaTemplatesPage";
import EventsPage from "./pages/EventsPage";
import MarketingPage from "./pages/MarketingPage";
import ApiKeysPage from "./pages/ApiKeys";
import ReleasesPage from "./pages/ReleasesPage";
import { AdminSessionProvider } from "./context/AdminSessionContext";

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
      <div className="min-h-screen bg-[#0E0E11] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#16161C] p-8 shadow-2xl">
          <h1 className="text-2xl font-black text-white tracking-tight">MacFYI Admin</h1>
          <p className="mt-2 text-sm text-white/40">
            Masuk dengan user Supabase yang memiliki <code className="text-white/70">app_metadata.role = \"admin\"</code>.
          </p>
          <div className="mt-6 space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Email</label>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none focus:border-red-500/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Password</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none focus:border-red-500/50"
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
            className="mt-6 w-full rounded-2xl bg-red-600 py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:bg-red-500 transition-colors"
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
    <AdminSessionProvider session={session}>
      <Router>
        <Layout>
          <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/live" element={<LiveActivityPage />} />
          <Route path="/licenses" element={<LicensesPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/promo-pricing" element={<PromoAndPricingPage />} />
          <Route path="/affiliates" element={<AffiliatesPage />} />
          <Route path="/withdrawals" element={<WithdrawalsPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/landing" element={<LandingEditorPage />} />
          <Route path="/app-settings" element={<AppSettingsPage />} />
          <Route path="/platform" element={<PlatformSettingsPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/edge-functions" element={<EdgeFunctionsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/admin-users" element={<AdminUsersPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/wa-templates" element={<WaTemplatesPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/marketing" element={<MarketingPage />} />
          <Route path="/releases" element={<ReleasesPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Layout>
      </Router>
    </AdminSessionProvider>
  );
}
