'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Folder, 
  Trash2, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  ImageIcon
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import MediaLibraryModal from './MediaLibraryModal';

interface ImageUploadPickerProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  aspectRatio?: 'banner' | 'square' | 'portrait' | 'video' | 'auto';
  helpText?: string;
}

export default function ImageUploadPicker({
  label,
  value,
  onChange,
  folder = 'general',
  aspectRatio = 'banner',
  helpText
}: ImageUploadPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'banner':
        return 'aspect-21/9 min-h-[140px]';
      case 'video':
        return 'aspect-16/9 min-h-[140px]';
      case 'portrait':
        return 'aspect-3/4 min-h-[160px]';
      case 'square':
        return 'aspect-square min-h-[120px]';
      default:
        return 'aspect-16/9 min-h-[120px]';
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('folder', folder);
      formData.append('file', file);

      const res = await apiFetch('/cms/media/upload/', {
        method: 'POST',
        body: formData
      });

      if (res.success && res.first_url) {
        onChange(res.first_url);
      }
    } catch (err: any) {
      alert(err.message || 'Image upload failed. Please try a valid JPG, PNG, or WebP file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider">
            {label}
          </label>
          {helpText && (
            <span className="text-[10px] text-muted-foreground">{helpText}</span>
          )}
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFileUpload(e.target.files);
        }}
      />

      {value ? (
        /* ═══════════════════════════════════════════════════════════
           IMAGE FILLED STATE: Thumbnail preview + Filament Action Buttons
           ═══════════════════════════════════════════════════════════ */
        <div className="relative group bg-muted/20 border border-border/40 rounded-2xl overflow-hidden shadow-xs">
          <div className={`relative w-full ${getAspectClass()} overflow-hidden bg-black/5 flex items-center justify-center`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label || 'Uploaded Image'}
              className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
              onError={(e) => {
                // Graceful fallback if image link is broken
                (e.target as HTMLElement).style.display = 'none';
              }}
            />

            {/* Quick Hover Controls Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="Upload file directly from computer"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md hover:brightness-110 transition cursor-pointer"
                title="Browse Media Library with folders"
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Media Library</span>
              </button>

              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-black/70 text-white rounded-xl hover:bg-black transition"
                title="View full resolution image"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1.5 bg-red-600/90 text-white rounded-xl hover:bg-red-700 transition cursor-pointer"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Footer showing current image URL / info */}
          <div className="px-3 py-1.5 bg-card border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate max-w-[85%]" title={value}>{value}</span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-red-500 hover:text-red-700 font-bold shrink-0 ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════
           EMPTY STATE: Filament-style Dropzone with Direct Drag & Drop
           ═══════════════════════════════════════════════════════════ */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFileUpload(e.dataTransfer.files);
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition duration-200 cursor-pointer text-center ${
            isDragOver 
              ? 'border-primary bg-primary/10 shadow-md' 
              : 'border-border/60 hover:border-primary/50 bg-muted/10 hover:bg-muted/20'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-4 text-primary">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs font-bold">Uploading to server...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-extrabold text-foreground">
                  Drop image here, or <span className="text-primary underline">browse</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Supports PNG, JPG, WebP up to 10MB
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 neu-btn text-[11px] font-bold rounded-xl text-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-primary" />
                  <span>Upload File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-1.5 neu-btn-primary text-[11px] font-bold rounded-xl text-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Media Library</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultFolder={folder}
        title={`Choose Image (${label || 'Media'})`}
        onSelect={(url) => {
          onChange(url);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
