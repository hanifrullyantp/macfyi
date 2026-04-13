import React, { useState, useEffect, useRef } from 'react';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured, isSupabaseUserAdmin } from '../lib/supabase';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  isAdmin: boolean;
  as?: any;
  className?: string;
  multiline?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onSave,
  isAdmin,
  as: Tag = 'span',
  className = '',
  multiline = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    onSave(currentValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    }
  };

  if (isAdmin && isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          autoFocus
          className={`bg-white/10 text-inherit border border-red-500 rounded p-1 outline-none w-full ${className}`}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
        />
      );
    }
    return (
      <input
        autoFocus
        className={`bg-white/10 text-inherit border border-red-500 rounded p-1 outline-none ${className}`}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <Tag
      className={`${className} ${isAdmin ? 'cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/10' : ''}`}
      onClick={(e) => {
        if (!isAdmin) return;
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {value}
    </Tag>
  );
};

interface EditableImageProps {
  src: string;
  alt: string;
  onSave: (newSrc: string) => void;
  isAdmin: boolean;
  className?: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const EditableImage: React.FC<EditableImageProps> = ({
  src,
  alt,
  onSave,
  isAdmin,
  className = ''
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const openUrlPrompt = () => {
    const newSrc = prompt('URL gambar:', src);
    if (newSrc && newSrc.trim() && newSrc.trim() !== src) {
      onSave(newSrc.trim());
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!isAdmin) return;
    e.stopPropagation();
    if (e.shiftKey) {
      openUrlPrompt();
      return;
    }
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isAdmin) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Pilih file gambar (JPEG, PNG, WebP, GIF, SVG).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert('Ukuran maksimal 5 MB.');
      return;
    }
    if (!isSupabaseBrowserConfigured()) {
      window.alert('Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk upload.');
      openUrlPrompt();
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { data: sess } = await client.auth.getSession();
    if (!sess.session?.user || !isSupabaseUserAdmin(sess.session.user)) {
      window.alert('Login sebagai admin Supabase dulu (ikon gear → masuk).');
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `images/${Date.now()}_${safeName}`;
    const { data, error } = await client.storage.from('landing-media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      setUploading(false);
      window.alert(
        error.message.includes('Bucket not found')
          ? 'Bucket Storage "landing-media" belum ada. Jalankan migrasi Supabase terbaru (storage_landing_media).'
          : `Upload gagal: ${error.message}`
      );
      return;
    }
    const { data: pub } = client.storage.from('landing-media').getPublicUrl(data.path);
    onSave(pub.publicUrl);
    setUploading(false);
  };

  return (
    <div className={`relative group ${className}`}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => void handleFile(e)}
      />
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      {isAdmin && (
        <div
          onClick={handleOverlayClick}
          className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity border-2 border-dashed border-red-500 rounded gap-2"
        >
          <span className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold shadow-lg">
            {uploading ? 'Mengunggah…' : 'Klik — upload gambar'}
          </span>
          <span className="text-white/90 text-xs px-2 text-center max-w-[90%]">
            Shift+klik untuk isi URL · Maks 5 MB
          </span>
          <button
            type="button"
            className="text-xs text-white/80 underline"
            onClick={(ev) => {
              ev.stopPropagation();
              openUrlPrompt();
            }}
          >
            Atau pakai URL
          </button>
        </div>
      )}
    </div>
  );
};

interface EditableVideoProps {
  url: string;
  onSave: (newUrl: string) => void;
  isAdmin: boolean;
  className?: string;
}

export const EditableVideo: React.FC<EditableVideoProps> = ({
  url,
  onSave,
  isAdmin,
  className = ''
}) => {
  const handleClick = () => {
    if (!isAdmin) return;
    const newUrl = prompt('Enter video URL (e.g. YouTube/Vimeo embed):', url);
    if (newUrl && newUrl !== url) {
      onSave(newUrl);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="aspect-video bg-black/40 rounded-xl overflow-hidden">
        {url ? (
          <iframe
            src={url}
            className="w-full h-full"
            title="Video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            No video URL set
          </div>
        )}
      </div>
      {isAdmin && (
        <div 
          onClick={handleClick}
          className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity border-2 border-dashed border-red-500 rounded"
        >
          <span className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold shadow-lg">
            Edit Video URL
          </span>
        </div>
      )}
    </div>
  );
};
