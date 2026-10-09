"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { profiles } from "@/db/schema"; // Typings only

export function useAuth() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) return null;
      return data as { id: string; email: string; full_name: string; role: 'student' | 'teacher' | 'admin' };
    },
    staleTime: 1000 * 60 * 10, // 10 menit
  });
}
