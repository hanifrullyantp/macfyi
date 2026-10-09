"use client";

import React, { useState, useEffect, useRef } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app";
import { useAuth } from "@/features/auth/useAuth"; // Asumsi hook auth ada
import { useEditableContent, useUpdateContent } from "@/lib/useEditableContent";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  contentKey: string;
  defaultValue: string;
  multiline?: boolean;
  className?: string;
}

export function EditableText({
  as: Component = "span",
  contentKey,
  defaultValue,
  multiline = false,
  className,
}: EditableTextProps) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: value, isLoading } = useEditableContent(contentKey, defaultValue);
  const updateMutation = useUpdateContent();

  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setLocalValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (value) setLocalValue(value);
  }, [value]);

  const handleStartEdit = (e: React.MouseEvent) => {
    if (!isAdmin) return;
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ key: contentKey, value: tempValue });
      setIsEditing(false);
    } catch (err) {
      console.error("Gagal menyimpan:", err);
    }
  };

  const handleCancel = () => {
    setLocalValue(value || defaultValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={cn("relative inline-block w-full animate-in fade-in zoom-in-95", className)}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={tempValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-full bg-surface p-2 border border-primary rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
            autoFocus
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={tempValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full bg-surface p-1 border border-primary rounded-lg text-foreground focus:outline-none"
            autoFocus
          />
        )}
        <div className="mt-2 flex gap-1.5 justify-end">
          <button onClick={handleSave} className="flex items-center gap-1 px-2 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:brightness-110">
            {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Simpan
          </button>
          <button onClick={handleCancel} className="flex items-center gap-1 px-2 py-1 bg-surface-hover text-muted rounded-lg text-xs font-bold">
            <X className="h-3 w-3" /> Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <Component
      className={cn(
        "relative group transition-all duration-200",
        isAdmin && "cursor-pointer hover:bg-primary/5 rounded-md pr-6",
        className
      )}
      onClick={handleStartEdit}
    >
      {isLoading ? "..." : (value || defaultValue)}
      
      {isAdmin && (
        <span className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-primary">
          <Pencil className="h-3.5 w-3.5" />
        </span>
      )}
    </Component>
  );
}
