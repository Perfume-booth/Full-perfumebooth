'use client';

import React, { useState, useEffect } from 'react';
import { Upload, X, Star, Image as ImageIcon, Sparkles, Check } from 'lucide-react';

interface BatchImageDropzoneProps {
  onFeaturedFileChange: (file: File | null) => void;
  onGalleryFilesChange: (files: File[]) => void;
  productTitle?: string;
  initialFeaturedUrl?: string | null;
  initialGalleryUrls?: string[];
}

interface ImageItem {
  id: string;
  previewUrl: string;
  file: File | null;
}

export default function BatchImageDropzone({
  onFeaturedFileChange,
  onGalleryFilesChange,
  productTitle = '',
  initialFeaturedUrl = null,
  initialGalleryUrls = [],
}: BatchImageDropzoneProps) {
  // Main image item
  const [mainItem, setMainItem] = useState<ImageItem | null>(null);
  // Featured / gallery images items
  const [featuredItems, setFeaturedItems] = useState<ImageItem[]>([]);

  // Initialize or reset from props
  useEffect(() => {
    if (initialFeaturedUrl) {
      setMainItem({
        id: 'init-main',
        previewUrl: initialFeaturedUrl,
        file: null,
      });
    } else {
      setMainItem(null);
    }
  }, [initialFeaturedUrl]);

  useEffect(() => {
    if (initialGalleryUrls && initialGalleryUrls.length > 0) {
      setFeaturedItems(
        initialGalleryUrls.map((url, i) => ({
          id: `init-feat-${i}`,
          previewUrl: url,
          file: null,
        }))
      );
    } else {
      setFeaturedItems([]);
    }
  }, [initialGalleryUrls]);

  // Sync to parent callbacks
  const notifyParent = (newMain: ImageItem | null, newFeatured: ImageItem[]) => {
    onFeaturedFileChange(newMain?.file || null);
    const validGalleryFiles = newFeatured.map((item) => item.file).filter((f): f is File => f !== null);
    onGalleryFilesChange(validGalleryFiles);
  };

  // When files are selected in batch (e.g. user selects 5 files at once)
  const handleBatchFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    let updatedMain = mainItem;
    let updatedFeatured = [...featuredItems];

    if (!updatedMain) {
      // First file is Main Image
      const firstFile = files[0];
      updatedMain = {
        id: `file-main-${Date.now()}`,
        previewUrl: URL.createObjectURL(firstFile),
        file: firstFile,
      };
      // Other files are Featured Images
      const restFiles = files.slice(1);
      const newItems: ImageItem[] = restFiles.map((f, i) => ({
        id: `file-feat-${Date.now()}-${i}`,
        previewUrl: URL.createObjectURL(f),
        file: f,
      }));
      updatedFeatured = [...updatedFeatured, ...newItems];
    } else {
      // Main image already exists, add all to featured
      const newItems: ImageItem[] = files.map((f, i) => ({
        id: `file-feat-${Date.now()}-${i}`,
        previewUrl: URL.createObjectURL(f),
        file: f,
      }));
      updatedFeatured = [...updatedFeatured, ...newItems];
    }

    setMainItem(updatedMain);
    setFeaturedItems(updatedFeatured);
    notifyParent(updatedMain, updatedFeatured);
  };

  // Set single main image
  const handleSetMainFile = (file: File | null) => {
    let updatedMain: ImageItem | null = null;
    if (file) {
      updatedMain = {
        id: `file-main-${Date.now()}`,
        previewUrl: URL.createObjectURL(file),
        file,
      };
    }
    setMainItem(updatedMain);
    notifyParent(updatedMain, featuredItems);
  };

  // Swap any featured image to be the Main Image
  const handleMakeMain = (index: number) => {
    const selected = featuredItems[index];
    if (!selected) return;

    const remainingFeatured = featuredItems.filter((_, idx) => idx !== index);
    let newFeatured = remainingFeatured;

    // If there was an existing main image, move it to featured images
    if (mainItem) {
      newFeatured = [mainItem, ...remainingFeatured];
    }

    setMainItem(selected);
    setFeaturedItems(newFeatured);
    notifyParent(selected, newFeatured);
  };

  // Remove main image
  const handleRemoveMain = () => {
    let nextMain: ImageItem | null = null;
    let nextFeatured = [...featuredItems];

    // If featured images exist, auto-promote the first featured image to main
    if (featuredItems.length > 0) {
      nextMain = featuredItems[0];
      nextFeatured = featuredItems.slice(1);
    }

    setMainItem(nextMain);
    setFeaturedItems(nextFeatured);
    notifyParent(nextMain, nextFeatured);
  };

  // Remove a featured image
  const handleRemoveFeatured = (index: number) => {
    const updated = featuredItems.filter((_, idx) => idx !== index);
    setFeaturedItems(updated);
    notifyParent(mainItem, updated);
  };

  return (
    <div className="flex flex-col gap-6 bg-card neu-extruded border border-border/10 p-6 sm:p-7 rounded-3xl transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-border/30">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-foreground tracking-tight">Product Images</h3>
            <span className="text-[11px] font-bold text-primary neu-inset-sm px-3 py-0.5 rounded-full">
              1st is Main • Others are Featured
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            The first image is your primary listing image. Additional images are featured in the gallery.
          </p>
        </div>
        {productTitle && (
          <span className="text-xs font-semibold text-muted-foreground neu-inset-sm px-3 py-1 rounded-xl self-start sm:self-auto truncate max-w-xs">
            Auto Alt: {productTitle}
          </span>
        )}
      </div>

      {/* Global Drag & Drop Notice Banner */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleBatchFiles(e.dataTransfer.files);
        }}
        className="flex items-center justify-between p-4 rounded-2xl neu-inset-sm border border-dashed border-primary/40 hover:border-primary/80 transition cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl neu-extruded-sm flex items-center justify-center text-primary group-hover:scale-105 transition-transform flex-shrink-0">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              Drop all product photos here or click to batch upload
            </div>
            <div className="text-[11px] text-muted-foreground">
              First uploaded photo automatically becomes the Main Image; rest become Featured Images.
            </div>
          </div>
        </div>
        <span className="text-xs font-bold text-primary px-3.5 py-1.5 rounded-xl neu-btn transition">
          Browse Files
        </span>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleBatchFiles(e.target.files || [])}
          className="hidden"
        />
      </label>

      {/* Grid: Main Image (Left) vs Featured Images (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Main Image Column */}
        <div className="md:col-span-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Main Image
            </label>
            <span className="text-[10px] text-muted-foreground font-semibold">Cover & Listing Card</span>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) {
                if (e.dataTransfer.files.length > 1) {
                  handleBatchFiles(e.dataTransfer.files);
                } else if (e.dataTransfer.files[0]) {
                  handleSetMainFile(e.dataTransfer.files[0]);
                }
              }
            }}
            className="relative neu-inset rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-500 p-4 min-h-[220px] flex flex-col items-center justify-center text-center transition cursor-pointer overflow-hidden group"
          >
            {mainItem ? (
              <div className="relative w-full h-48 flex items-center justify-center">
                <img
                  src={mainItem.previewUrl}
                  alt="Main Preview"
                  className="w-full h-full object-contain rounded-xl"
                />
                <div className="absolute top-2 left-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-black" />
                  Main
                </div>
                <button
                  type="button"
                  title="Remove or promote next image"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMain();
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/80 text-white rounded-xl hover:bg-red-500 transition shadow-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer py-6">
                <div className="w-12 h-12 rounded-2xl neu-extruded-sm flex items-center justify-center text-amber-500 mb-2 group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 fill-amber-500" />
                </div>
                <span className="text-xs font-bold text-foreground">Select Main Image</span>
                <span className="text-[10px] text-muted-foreground mt-1">Drop image here or browse</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleSetMainFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Featured Images Column */}
        <div className="md:col-span-8 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              Featured Images ({featuredItems.length})
            </label>
            <span className="text-[10px] text-muted-foreground font-semibold">Gallery Angles & Zoom Views</span>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleBatchFiles(e.dataTransfer.files);
            }}
            className="neu-inset rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/50 p-4 min-h-[220px] flex flex-col justify-between transition"
          >
            {/* Gallery Grid */}
            {featuredItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
                {featuredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl neu-extruded-sm overflow-hidden group flex flex-col aspect-square border border-border/20"
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Featured ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />

                    {/* Featured number badge */}
                    <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      #{idx + 1}
                    </div>

                    {/* Action overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-between p-1.5">
                      <div className="w-full flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveFeatured(idx)}
                          className="p-1 rounded-lg bg-red-500 text-white transition"
                          title="Delete image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleMakeMain(idx)}
                        className="w-full py-1 px-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 shadow-md"
                      >
                        <Star className="w-2.5 h-2.5 fill-black" />
                        Make Main
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add more slot in grid */}
                <label className="border-2 border-dashed border-border/50 hover:border-primary rounded-xl flex flex-col items-center justify-center cursor-pointer p-2 aspect-square neu-inset-sm transition group">
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition" />
                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground mt-1">
                    + Add Angle
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleBatchFiles(e.target.files || [])}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer py-10">
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-bold text-foreground">No Featured Images yet</span>
                <span className="text-[10px] text-muted-foreground mt-1">
                  Click or drag files here to add extra angles, bottle shots, or box art
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleBatchFiles(e.target.files || [])}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
