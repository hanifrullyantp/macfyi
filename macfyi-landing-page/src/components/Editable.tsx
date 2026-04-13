import React, { useState, useEffect, useRef } from 'react';

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

export const EditableImage: React.FC<EditableImageProps> = ({
  src,
  alt,
  onSave,
  isAdmin,
  className = ''
}) => {
  const handleClick = () => {
    if (!isAdmin) return;
    const newSrc = prompt('Enter image URL:', src);
    if (newSrc && newSrc !== src) {
      onSave(newSrc);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      {isAdmin && (
        <div 
          onClick={handleClick}
          className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity border-2 border-dashed border-red-500 rounded"
        >
          <span className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold shadow-lg">
            Change Image
          </span>
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
