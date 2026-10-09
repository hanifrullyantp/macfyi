"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export function useEditableContent(contentKey: string, defaultValue: string) {
  return useQuery({
    queryKey: ["content-block", contentKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_blocks")
        .select("content_value")
        .eq("content_key", contentKey)
        .single();
      
      if (error || !data) return defaultValue;
      return data.content_value;
    },
    staleTime: 1000 * 60 * 5, // 5 menit
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("content_blocks")
        .upsert({ 
          content_key: key, 
          content_value: value, 
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        }, { onConflict: "content_key" });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["content-block", variables.key] });
    }
  });
}
