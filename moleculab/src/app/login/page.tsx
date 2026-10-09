"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Spinner } from "@/components/ui";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Invalidate auth query agar data user terbaru ter-fetch
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });

      // Ambil profil untuk redirect berbasis role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "teacher") {
        router.push("/teacher-dashboard");
      } else if (profile?.role === "admin") {
        router.push("/lab");
      } else {
        router.push("/lab");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold">Masuk ke Moleculab</h1>
        {searchParams.get("message") && (
          <p className="mt-2 text-xs font-medium text-success bg-success/10 p-2 rounded-lg">{searchParams.get("message")}</p>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
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

          {error && <p className="text-danger text-xs font-medium">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : "Masuk"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Belum punya akun? <Link href="/register" className="text-primary font-bold">Daftar</Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner /></div>}>
      <LoginContent />
    </Suspense>
  );
}
