"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, Button, Badge, Spinner } from "@/components/ui";
import { Search, RotateCcw, Save, Trash2 } from "lucide-react";
import { useUpdateContent } from "@/lib/useEditableContent";
import { format } from "date-fns";

export default function ContentManagerPage() {
  const [search, setSearch] = useState("");
  const updateMutation = useUpdateContent();

  const { data: blocks, isLoading, refetch } = useQuery({
    queryKey: ["all-content-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_blocks")
        .select("*, profiles(full_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = blocks?.filter(b => 
    b.content_key.toLowerCase().includes(search.toLowerCase()) ||
    b.content_value.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = async (key: string) => {
    if (!confirm("Kembalikan ke default? (Akan menghapus override dari database)")) return;
    const { error } = await supabase.from("content_blocks").delete().eq("content_key", key);
    if (!error) refetch();
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="font-display text-3xl font-bold">Content Manager</h1>
            <p className="text-muted text-sm mt-1">Kelola semua override teks dan template narasi di database.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari kunci atau isi..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-surface border border-border outline-none focus:border-primary w-64"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            </div>
            <Badge tone="primary">{filtered?.length || 0} Blok</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex py-20 justify-center"><Spinner /></div>
        ) : (
          <div className="grid gap-4">
            {filtered?.map((block) => (
              <Card key={block.id} className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono font-bold">
                      {block.content_key}
                    </code>
                    <div className="flex gap-3 mt-2 text-[10px] text-muted font-medium uppercase tracking-wider">
                      <span>Tipe: {block.content_type}</span>
                      <span>•</span>
                      <span>Oleh: {block.profiles?.full_name || "Unknown"}</span>
                      <span>•</span>
                      <span>{format(new Date(block.updated_at), "dd MMM yyyy, HH:mm")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleReset(block.content_key)}
                      className="text-danger border-danger/20 hover:bg-danger/5"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                    </Button>
                  </div>
                </div>
                <textarea 
                  className="w-full bg-background border border-border p-3 rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  defaultValue={block.content_value}
                  onBlur={(e) => {
                    if (e.target.value !== block.content_value) {
                      updateMutation.mutate({ key: block.content_key, value: e.target.value });
                    }
                  }}
                />
              </Card>
            ))}
            {filtered?.length === 0 && (
              <div className="py-20 text-center text-muted border border-dashed border-border rounded-3xl italic">
                Tidak ada blok konten yang ditemukan.
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
