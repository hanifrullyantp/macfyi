import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { AlertCircle } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { supabase, supabaseConfigured } from "../../admin-web/src/supabase";
import { AdminSessionProvider } from "../../admin-web/src/context/AdminSessionContext";

const Dashboard = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.DashboardPage })));
const Analytics = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.AnalyticsPage })));
const Licenses = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.LicensesPage })));
const Transactions = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.TransactionsPage })));
const CRM = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.CrmPage })));
const Withdrawals = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.WithdrawalsPage })));
const Affiliates = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.AffiliatesPage })));
const PromoPricing = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.PromoAndPricingPage })));
const LandingEditor = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.LandingEditorPage })));
const AppSettings = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.AppSettingsPage })));
const PlatformSettings = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.PlatformSettingsPage })));
const EdgeMonitor = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.EdgeFunctionsPage })));
const Logs = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.LogsPage })));
const AdminUsers = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.AdminUsersPage })));
const LiveActivity = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.LiveActivityPage })));
const Announcements = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.AnnouncementsPage })));
const WaTemplates = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.WaTemplatesPage })));
const Events = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.EventsPage })));
const Marketing = lazy(() => import("./bridges/adminWebPages").then((m) => ({ default: m.MarketingPage })));

function isAdmin(session: Session | null): boolean {
  return session?.user.app_metadata?.role === "admin";
}

/** Vite `base` is `/` on admin subdomain or `/admin/` when nested on main site. */
function routerBasename(): string | undefined {
  const b = import.meta.env.BASE_URL;
  if (b === "/" || b === "./") return undefined;
  const trimmed = b.replace(/\/$/, "");
  return trimmed === "" ? undefined : trimmed;
}

const PageSkeleton = () => (
  <div className="p-8 space-y-6 animate-pulse">
    <div className="h-8 w-48 bg-white/5 rounded" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-[#16161C] border border-white/5 rounded-xl" />
      ))}
    </div>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Terjadi kesalahan</h2>
          <button type="button" onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg">
            Muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  authError,
  busy,
  onSignIn,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  authError: string | null;
  busy: boolean;
  onSignIn: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0E0E11] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#16161C] p-8 shadow-2xl">
        <h1 className="text-2xl font-black text-white tracking-tight">Macfyi Admin</h1>
        <p className="mt-2 text-sm text-white/40">
          Masuk dengan akun Supabase yang memiliki <code className="text-white/70">app_metadata.role = &quot;admin&quot;</code>.
        </p>
        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm outline-none focus:border-red-500/50"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm outline-none focus:border-red-500/50"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {authError ? <p className="mt-3 text-sm text-red-400">{authError}</p> : null}
        <button
          type="button"
          onClick={() => void onSignIn()}
          disabled={busy || !email.trim() || !password}
          className="mt-6 w-full rounded-2xl bg-red-600 py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 hover:bg-red-500"
        >
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </div>
    </div>
  );
}

function AppShell() {
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
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/+$/, "") || undefined
        : undefined;
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    setBusy(false);
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-red-300">
        <p className="max-w-md text-center">
          Set <code className="text-zinc-300">VITE_SUPABASE_URL</code> dan <code className="text-zinc-300">VITE_SUPABASE_ANON_KEY</code> untuk build admin.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authError={authError}
        busy={busy}
        onSignIn={signIn}
      />
    );
  }

  if (!isAdmin(session)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="max-w-md text-center text-red-300">
          Akun ini bukan admin. Set <code className="text-zinc-300">role: &quot;admin&quot;</code> di Supabase Auth → App metadata, lalu masuk lagi.
        </p>
        <button type="button" onClick={() => void signOut()} className="text-sm text-red-400 underline">
          Keluar
        </button>
      </div>
    );
  }

  return (
    <AdminSessionProvider session={session}>
      <Layout onSignOut={() => void signOut()}>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/live" element={<LiveActivity />} />
              <Route path="/licenses" element={<Licenses />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/promo" element={<PromoPricing />} />
              <Route path="/affiliates" element={<Affiliates />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/landing" element={<LandingEditor />} />
              <Route path="/settings" element={<AppSettings />} />
              <Route path="/platform" element={<PlatformSettings />} />
              <Route path="/config" element={<Marketing />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/wa-templates" element={<WaTemplates />} />
              <Route path="/events" element={<Events />} />
              <Route path="/edge-monitor" element={<EdgeMonitor />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/admin-users" element={<AdminUsers />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </AdminSessionProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename()}>
        <AppShell />
      </BrowserRouter>
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
