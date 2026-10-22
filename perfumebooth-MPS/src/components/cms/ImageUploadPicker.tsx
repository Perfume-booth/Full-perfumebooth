'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Folder, 
  Trash2, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  ImageIcon,
  Maximize2
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
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'banner':
        return 'aspect-[21/9] min-h-[140px] max-h-[260px]';
      case 'video':
        return 'aspect-video min-h-[140px] max-h-[260px]';
      case 'portrait':
        return 'aspect-[3/4] min-h-[160px] max-h-[300px]';
      case 'square':
        return 'aspect-square min-h-[140px] max-h-[240px]';
      default:
        return 'aspect-video min-h-[120px] max-h-[240px]';
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
          <div className={`relative w-full ${getAspectClass()} overflow-hidden bg-neutral-900/5 dark:bg-black/30 border-b border-border/20 flex items-center justify-center p-2.5`}>
            {/* Checkerboard pattern background for clear transparency/border perception */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

            {/* Top-right Fit mode badge indicator */}
            <div className="absolute top-2.5 right-2.5 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
                className="px-2 py-1 bg-background/80 hover:bg-background text-foreground text-[10px] font-bold rounded-lg flex items-center gap-1.5 border border-border/40 shadow-xs backdrop-blur-md cursor-pointer transition"
                title={fitMode === 'contain' ? 'Image fits 100% inside box. Click to fill/cover.' : 'Image fills box. Click to fit inside box.'}
              >
                <Maximize2 className="w-3 h-3 text-primary" />
                <span>{fitMode === 'contain' ? 'Fit in Box' : 'Fill Box'}</span>
              </button>
            </div>

            {/* Image Preview with object-contain default to ensure entire image fits box */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label || 'Uploaded Image'}
              className={`${
                fitMode === 'contain'
                  ? 'max-w-full max-h-full w-auto h-auto object-contain rounded-lg drop-shadow-sm select-none'
                  : 'w-full h-full object-cover rounded-lg select-none'
              } transition-all duration-300`}
              onError={(e) => {
                // Graceful fallback if image link is broken
                (e.target as HTMLElement).style.display = 'none';
              }}
            />

            {/* Quick Hover Controls Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-3 z-20">
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

              <button
                type="button"
                onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
                className="px-3 py-1.5 bg-black/80 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md border border-white/20 transition cursor-pointer"
                title={fitMode === 'contain' ? 'Fill container (Crop)' : 'Fit inside box (No crop)'}
              >
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span>{fitMode === 'contain' ? 'Fit in Box' : 'Fill Box'}</span>
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

          {/* Footer showing current image URL / info + Fit toggle */}
          <div className="px-3 py-2 bg-card border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
                className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-semibold text-[10px] flex items-center gap-1 border border-border/40 shrink-0 transition cursor-pointer"
              >
                <Maximize2 className="w-2.5 h-2.5 text-primary" />
                <span>{fitMode === 'contain' ? 'Fit in Box' : 'Fill Box'}</span>
              </button>
              <span className="truncate max-w-[260px] text-[10px] font-mono" title={value}>{value}</span>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-red-500 hover:text-red-700 font-bold shrink-0 text-[10px] px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
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
