"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button, Card, Spinner } from "@/components/ui";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Gagal membuat user.");

      // Buat profil
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: role,
      });

      if (profileError) throw profileError;

      router.push("/login?message=Email konfirmasi telah dikirim (atau langsung masuk jika provider mendukung)");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold">Daftar Akun</h1>
        <p className="text-muted text-sm mt-1">Simpan progres belajarmu di cloud.</p>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted">Nama Lengkap</label>
            <input 
              type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
              className="mt-1 w-full bg-background border border-border px-4 py-2 rounded-xl focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted">Email</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full bg-background border border-border px-4 py-2 rounded-xl focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted">Password</label>
            <input 
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full bg-background border border-border px-4 py-2 rounded-xl focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted">Saya adalah...</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button 
                type="button" onClick={() => setRole("student")}
                className={`py-2 rounded-xl border font-bold text-sm transition-all ${role === "student" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted hover:bg-surface-hover"}`}
              >Siswa</button>
              <button 
                type="button" onClick={() => setRole("teacher")}
                className={`py-2 rounded-xl border font-bold text-sm transition-all ${role === "teacher" ? "bg-primary/10 border-primary text-primary" : "border-border text-muted hover:bg-surface-hover"}`}
              >Guru</button>
            </div>
          </div>

          {error && <p className="text-danger text-xs font-medium">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : "Daftar Sekarang"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Sudah punya akun? <Link href="/login" className="text-primary font-bold">Masuk</Link>
        </p>
      </Card>
    </div>
  );
}
