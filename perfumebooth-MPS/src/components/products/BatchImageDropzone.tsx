'use client';

import React, { useState } from 'react';
import { Upload, X, FileImage, Check } from 'lucide-react';

interface BatchImageDropzoneProps {
  onFeaturedFileChange: (file: File | null) => void;
  onGalleryFilesChange: (files: File[]) => void;
  productTitle?: string;
}

export default function BatchImageDropzone({
  onFeaturedFileChange,
  onGalleryFilesChange,
  productTitle = '',
}: BatchImageDropzoneProps) {
  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [featuredPreview, setFeaturedPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const handleFeaturedSelect = (file: File | null) => {
    if (file) {
      setFeaturedFile(file);
      onFeaturedFileChange(file);
      const url = URL.createObjectURL(file);
      setFeaturedPreview(url);
    } else {
      setFeaturedFile(null);
      onFeaturedFileChange(null);
      setFeaturedPreview(null);
    }
  };

  const handleGallerySelect = (filesList: FileList | null) => {
    if (!filesList) return;
    const newFiles = Array.from(filesList);
    const updated = [...galleryFiles, ...newFiles];
    setGalleryFiles(updated);
    onGalleryFilesChange(updated);

    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setGalleryPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeGalleryFile = (index: number) => {
    const updatedFiles = galleryFiles.filter((_, idx) => idx !== index);
    const updatedPreviews = galleryPreviews.filter((_, idx) => idx !== index);
    setGalleryFiles(updatedFiles);
    setGalleryPreviews(updatedPreviews);
    onGalleryFilesChange(updatedFiles);
  };

  return (
    <div className="flex flex-col gap-5 bg-[#0f1117] border border-border p-6 rounded-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-foreground">Media Gallery & Dropzone</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload main product bottle photo and additional gallery angles
          </p>
        </div>
        {productTitle && (
          <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
            Auto Alt: {productTitle}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Featured Image Dropzone */}
        <div className="md:col-span-1 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main Featured Bottle Photo
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFeaturedSelect(e.dataTransfer.files[0]);
            }}
            className="relative border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 rounded-xl p-4 min-h-[160px] flex flex-col items-center justify-center text-center transition cursor-pointer overflow-hidden"
          >
            {featuredPreview ? (
              <div className="relative w-full h-36">
                <img
                  src={featuredPreview}
                  alt="Featured Preview"
                  className="w-full h-full object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeaturedSelect(null);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-red-500 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer py-4">
                <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-semibold text-foreground">Main Bottle Image</span>
                <span className="text-[10px] text-muted-foreground mt-1">Drag & drop or click</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleFeaturedSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Gallery Dropzone & Thumbnails */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Additional Gallery Angles ({galleryFiles.length} uploaded)
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleGallerySelect(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 rounded-xl p-4 min-h-[160px] flex flex-col items-center justify-center transition cursor-pointer"
          >
            <label className="w-full flex flex-col items-center justify-center cursor-pointer py-2 mb-3">
              <Upload className="w-6 h-6 text-muted-foreground mb-1.5" />
              <span className="text-xs font-semibold text-foreground">
                Drop additional bottle images or click to select multiple files
              </span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleGallerySelect(e.target.files)}
                className="hidden"
              />
            </label>

            {galleryPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 w-full pt-2 border-t border-border/50">
                {galleryPreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg bg-black/40 overflow-hidden group border border-border">
                    <img src={preview} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryFile(idx)}
                      className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
