import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Link, Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "./supabase";
import { PasswordField } from "./PasswordField";

function formatIdr(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

function MemberLayout() {
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm ${isActive ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-white"}`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 border-b md:border-b-0 md:border-r border-zinc-800 p-4 flex flex-wrap md:flex-col gap-1 shrink-0">
        <div className="w-full font-bold text-amber-500 mb-2">Macfyi Member</div>
        <NavLink to="/member" end className={navCls}>
          Beranda
        </NavLink>
        <NavLink to="/member/affiliate" className={navCls}>
          Affiliate
        </NavLink>
        <NavLink to="/member/komisi" className={navCls}>
          Komisi
        </NavLink>
        <NavLink to="/member/penarikan" className={navCls}>
          Penarikan
        </NavLink>
        <NavLink to="/member/notifikasi" className={navCls}>
          Notifikasi
        </NavLink>
        <NavLink to="/member/acara" className={navCls}>
          Acara
        </NavLink>
        <NavLink to="/member/pengumuman" className={navCls}>
          Pengumuman
        </NavLink>
      </aside>
      <main className="flex-1 p-6 max-w-3xl w-full">
        <Outlet />
      </main>
    </div>
  );
}

function RequireAuth({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/member/masuk" replace />;
  return <>{children}</>;
}

function MasukPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr(error.message);
    else nav("/member");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm space-y-4 border border-zinc-800 rounded-2xl p-8 bg-zinc-900/50">
        <h1 className="text-xl font-semibold">Masuk</h1>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <p className="text-right -mt-2">
          <Link to="/member/lupa-password" className="text-xs text-zinc-500 hover:text-amber-500 underline">
            Lupa kata sandi?
          </Link>
        </p>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white">
          Masuk
        </button>
        <p className="text-xs text-zinc-500 text-center">
          Belum punya akun? <button type="button" className="text-amber-500 underline" onClick={() => nav("/member/daftar")}>Daftar</button>
        </p>
      </form>
    </div>
  );
}

function DaftarPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const origin =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: origin },
    });
    if (error) setErr(error.message);
    else setMsg("Cek email untuk verifikasi (jika diaktifkan), lalu masuk.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm space-y-4 border border-zinc-800 rounded-2xl p-8 bg-zinc-900/50">
        <h1 className="text-xl font-semibold">Daftar</h1>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button type="submit" className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white">
          Buat akun
        </button>
        <p className="text-xs text-zinc-500 text-center">
          <button type="button" className="text-amber-500 underline" onClick={() => nav("/member/masuk")}>Sudah punya akun</button>
        </p>
      </form>
    </div>
  );
}

function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const origin = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: origin ? `${origin}member/reset-password` : undefined,
    });
    if (error) setErr(error.message);
    else setMsg("Email reset kata sandi telah dikirim. Cek kotak masuk Anda.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm space-y-4 border border-zinc-800 rounded-2xl p-8 bg-zinc-900/50">
        <h1 className="text-xl font-semibold">Lupa kata sandi</h1>
        <p className="text-sm text-zinc-500">Masukkan email akun Anda untuk menerima tautan reset.</p>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button type="submit" className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white">
          Kirim tautan reset
        </button>
        <p className="text-xs text-zinc-500 text-center">
          <button type="button" className="text-amber-500 underline" onClick={() => nav("/member/masuk")}>
            Kembali ke masuk
          </button>
        </p>
      </form>
    </div>
  );
}

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
      setChecking(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== password2) {
      setErr("Konfirmasi kata sandi tidak sama.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setErr(error.message);
    else {
      setMsg("Kata sandi berhasil diperbarui.");
      nav("/member/masuk");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-zinc-500 text-sm">
        Memuat…
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 border border-zinc-800 rounded-2xl p-8 bg-zinc-900/50 text-center">
          <p className="text-sm text-zinc-400">Tautan reset tidak valid atau sudah kedaluwarsa.</p>
          <button
            type="button"
            className="text-amber-500 underline text-sm"
            onClick={() => nav("/member/lupa-password")}
          >
            Minta tautan baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm space-y-4 border border-zinc-800 rounded-2xl p-8 bg-zinc-900/50">
        <h1 className="text-xl font-semibold">Kata sandi baru</h1>
        <PasswordField value={password} onChange={setPassword} placeholder="Kata sandi baru" autoComplete="new-password" />
        <PasswordField value={password2} onChange={setPassword2} placeholder="Konfirmasi kata sandi" autoComplete="new-password" />
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button type="submit" className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white">
          Simpan kata sandi
        </button>
      </form>
    </div>
  );
}

function BerandaPage({ user }: { user: User }) {
  const [aff, setAff] = useState<{ slug: string; status: string; balance_available_idr: number; balance_pending_idr: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("affiliates").select("slug, status, balance_available_idr, balance_pending_idr").eq("user_id", user.id).maybeSingle();
      setAff(data);
    })();
  }, [user.id]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refUrl = aff?.slug ? `${origin.replace(/\/$/, "")}/ref/${aff.slug}` : "—";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Beranda</h1>
      <p className="text-sm text-zinc-500">Halo, {user.email}</p>
      {aff ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 text-sm">
          <p>
            Status affiliate: <span className="text-amber-400">{aff.status}</span>
          </p>
          <p>Saldo tersedia: {formatIdr(Number(aff.balance_available_idr) || 0)}</p>
          <p>Saldo tertahan: {formatIdr(Number(aff.balance_pending_idr) || 0)}</p>
          <p className="break-all">
            Tautan referral: <code className="text-xs text-zinc-300">{refUrl}</code>
          </p>
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">Anda belum mendaftar affiliate. Buka menu Affiliate.</p>
      )}
      <button
        type="button"
        className="text-sm text-zinc-500 underline"
        onClick={() => void supabase.auth.signOut()}
      >
        Keluar
      </button>
    </div>
  );
}

function AffiliatePage({ user }: { user: User }) {
  const [slug, setSlug] = useState("");
  const [bank, setBank] = useState('{"bank_name":"","account_number":"","account_name":""}');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);

  const load = () => {
    void (async () => {
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      setRow(data);
      if (data?.slug) setSlug(String(data.slug));
      if (data?.bank) setBank(JSON.stringify(data.bank, null, 2));
    })();
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length < 2) {
      setErr("Slug minimal 2 karakter (huruf, angka, tanda hubung).");
      return;
    }
    const { error } = await supabase.from("affiliates").insert({
      user_id: user.id,
      slug: clean,
      status: "pending",
    });
    if (error) setErr(error.message);
    else {
      setMsg("Pendaftaran dikirim. Menunggu persetujuan admin.");
      load();
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    let bankJson: Record<string, unknown> = {};
    try {
      bankJson = JSON.parse(bank) as Record<string, unknown>;
    } catch {
      setErr("JSON rekening tidak valid.");
      return;
    }
    const { error } = await supabase.rpc("update_my_affiliate_profile", {
      p_slug: slug.trim() || null,
      p_bank: bankJson,
      p_ewallet: null,
      p_bio: null,
    });
    if (error) setErr(error.message);
    else {
      setMsg("Profil disimpan.");
      load();
    }
  };

  if (!row) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Gabung affiliate</h1>
        <form onSubmit={(e) => void apply(e)} className="space-y-3 max-w-md">
          <label className="block text-sm text-zinc-400">Slug referral (unik)</label>
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
          {err && <p className="text-sm text-red-400">{err}</p>}
          {msg && <p className="text-sm text-emerald-400">{msg}</p>}
          <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white">
            Kirim pendaftaran
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profil affiliate</h1>
      <p className="text-sm text-zinc-500">Status: {String(row.status)}</p>
      <form onSubmit={(e) => void saveProfile(e)} className="space-y-3 max-w-lg">
        <label className="block text-sm text-zinc-400">Slug</label>
        <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <label className="block text-sm text-zinc-400">Rekening bank (JSON)</label>
        <textarea className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono h-32" value={bank} onChange={(e) => setBank(e.target.value)} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white">
          Simpan
        </button>
      </form>
    </div>
  );
}

function KomisiPage({ user }: { user: User }) {
  const [rows, setRows] = useState<{ id: string; order_id: string; amount_idr: number; status: string; created_at: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      if (!aff) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from("commissions")
        .select("id, order_id, amount_idr, status, created_at")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data ?? []) as typeof rows);
    })();
  }, [user.id]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Komisi</h1>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm text-left">
          <thead className="text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Jumlah</th>
              <th className="p-3">Status</th>
              <th className="p-3">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/80">
                <td className="p-3 font-mono text-xs">{r.order_id}</td>
                <td className="p-3">{formatIdr(Number(r.amount_idr) || 0)}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-zinc-500">{r.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-zinc-500 text-sm">Belum ada komisi.</p>}
      </div>
    </div>
  );
}

function PenarikanPage({ user }: { user: User }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank" | "ewallet">("bank");
  const [minAmt, setMinAmt] = useState(100_000);
  const [list, setList] = useState<{ id: string; amount_idr: number; status: string; created_at: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    void (async () => {
      const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      if (!aff) return;
      const { data: w } = await supabase
        .from("withdrawal_requests")
        .select("id, amount_idr, status, created_at")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setList((w ?? []) as typeof list);
      const { data: ps } = await supabase.from("platform_settings").select("value").eq("key", "withdrawal.min_amount_idr").maybeSingle();
      const v = ps?.value as unknown;
      const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
      if (Number.isFinite(n)) setMinAmt(n);
    })();
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const n = Math.floor(Number(amount.replace(/\D/g, "")));
    if (!Number.isFinite(n) || n < minAmt) {
      setErr(`Minimum ${formatIdr(minAmt)}`);
      return;
    }
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
    if (!token || !base) {
      setErr("Sesi tidak valid.");
      return;
    }
    const { data: aff } = await supabase.from("affiliates").select("bank").eq("user_id", user.id).maybeSingle();
    const account_details = (aff?.bank as Record<string, unknown>) ?? { note: "isi di halaman Affiliate" };
    const res = await fetch(`${base}/functions/v1/submit-withdrawal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount_idr: n, method, account_details }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
    if (!res.ok) setErr(j.error ?? "Gagal mengirim");
    else {
      setMsg("Permintaan penarikan dikirim.");
      setAmount("");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Penarikan</h1>
      <form onSubmit={(e) => void submit(e)} className="space-y-3 max-w-md border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500">Detail rekening diambil dari JSON bank di halaman Affiliate.</p>
        <label className="block text-sm text-zinc-400">Jumlah (IDR)</label>
        <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
        <label className="block text-sm text-zinc-400">Metode</label>
        <select className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value as "bank" | "ewallet")}>
          <option value="bank">Bank</option>
          <option value="ewallet">E-wallet</option>
        </select>
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white">
          Ajukan penarikan
        </button>
      </form>
      <div className="rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="p-3 text-left">Jumlah</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/80">
                <td className="p-3">{formatIdr(Number(r.amount_idr) || 0)}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-zinc-500">{r.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotifikasiPage({ user }: { user: User }) {
  const [rows, setRows] = useState<{ id: string; title: string; body: string | null; read_at: string | null; link: string | null; created_at: string }[]>([]);

  const load = () => {
    void (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, read_at, link, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data ?? []) as typeof rows);
    })();
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const mark = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notifikasi</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className={`rounded-xl border p-4 text-sm ${r.read_at ? "border-zinc-800/50 opacity-70" : "border-zinc-700"}`}>
            <div className="font-medium">{r.title}</div>
            {r.body && <p className="text-zinc-400 mt-1">{r.body}</p>}
            <div className="mt-2 flex gap-3 text-xs">
              {!r.read_at && (
                <button type="button" className="text-amber-500 underline" onClick={() => void mark(r.id)}>
                  Tandai dibaca
                </button>
              )}
              {r.link && (
                <a href={r.link} className="text-zinc-500 underline">
                  Buka
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-zinc-500 text-sm">Tidak ada notifikasi.</p>}
    </div>
  );
}

function AcaraPage({ user }: { user: User }) {
  const [events, setEvents] = useState<{ id: string; title: string; ends_at: string; status: string }[]>([]);
  const [board, setBoard] = useState<{ event_id: string; affiliate_id: string; sales_count: number; affiliates: { slug: string } | null }[]>([]);
  const [affId, setAffId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: ev } = await supabase.from("promo_events").select("id, title, ends_at, status").in("status", ["active", "ended"]).order("starts_at", { ascending: false });
      setEvents((ev ?? []) as typeof events);
      const { data: a } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setAffId(a?.id ?? null);
    })();
  }, [user.id]);

  const loadBoard = (eventId: string) => {
    void (async () => {
      const { data } = await supabase
        .from("event_participants")
        .select("event_id, affiliate_id, sales_count, affiliates(slug)")
        .eq("event_id", eventId)
        .order("sales_count", { ascending: false })
        .limit(30);
      setBoard((data ?? []) as typeof board);
    })();
  };

  const join = async (eventId: string) => {
    if (!affId) return;
    await supabase.from("event_participants").insert({ event_id: eventId, affiliate_id: affId });
    loadBoard(eventId);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Acara & papan peringkat</h1>
      {!affId && <p className="text-sm text-zinc-500">Daftar affiliate dulu untuk ikut acara.</p>}
      <ul className="space-y-4">
        {events.map((e) => (
          <li key={e.id} className="rounded-xl border border-zinc-800 p-4">
            <div className="font-medium">{e.title}</div>
            <p className="text-xs text-zinc-500 mt-1">Berakhir: {e.ends_at?.slice(0, 10)} · {e.status}</p>
            {affId && (
              <button type="button" className="mt-2 text-xs text-amber-500 underline" onClick={() => void join(e.id)}>
                Gabung / refresh papan
              </button>
            )}
            <button type="button" className="mt-2 ml-3 text-xs text-zinc-500 underline" onClick={() => loadBoard(e.id)}>
              Lihat papan
            </button>
          </li>
        ))}
      </ul>
      {board.length > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Affiliate</th>
                <th className="p-2 text-left">Penjualan</th>
              </tr>
            </thead>
            <tbody>
              {board.map((b, i) => (
                <tr key={`${b.event_id}-${b.affiliate_id}`} className="border-b border-zinc-800/80">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-mono text-xs">{b.affiliates?.slug ?? b.affiliate_id.slice(0, 8)}</td>
                  <td className="p-2">{b.sales_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PengumumanPage() {
  const [rows, setRows] = useState<{ id: string; title: string; content: string; type: string; pinned: boolean }[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("announcements").select("id, title, content, type, pinned").order("pinned", { ascending: false }).order("publish_at", { ascending: false });
      setRows((data ?? []) as typeof rows);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pengumuman</h1>
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2">
              {r.pinned && <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">Semat</span>}
              <span className="text-xs text-zinc-500">{r.type}</span>
            </div>
            <h2 className="font-semibold mt-2">{r.title}</h2>
            <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{r.content}</p>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-zinc-500 text-sm">Belum ada pengumuman.</p>}
    </div>
  );
}

export function App() {
  const { session, loading } = useSession();

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-red-300 text-center">Setel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Memuat…</p>
      </div>
    );
  }

  const user = session?.user ?? null;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/member" replace />} />
      <Route path="/member/masuk" element={user ? <Navigate to="/member" replace /> : <MasukPage />} />
      <Route path="/member/daftar" element={user ? <Navigate to="/member" replace /> : <DaftarPage />} />
      <Route path="/member/lupa-password" element={user ? <Navigate to="/member" replace /> : <LupaPasswordPage />} />
      <Route path="/member/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/member"
        element={
          <RequireAuth user={user}>
            <MemberLayout />
          </RequireAuth>
        }
      >
        <Route index element={<BerandaPage user={user!} />} />
        <Route path="affiliate" element={<AffiliatePage user={user!} />} />
        <Route path="komisi" element={<KomisiPage user={user!} />} />
        <Route path="penarikan" element={<PenarikanPage user={user!} />} />
        <Route path="notifikasi" element={<NotifikasiPage user={user!} />} />
        <Route path="acara" element={<AcaraPage user={user!} />} />
        <Route path="pengumuman" element={<PengumumanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/member" replace />} />
    </Routes>
  );
}
