'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Folder, 
  FolderPlus, 
  Search, 
  Trash2, 
  Check, 
  Loader2, 
  ImageIcon, 
  Filter, 
  Maximize2,
  Film
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export interface MediaAssetItem {
  id: string;
  name: string;
  folder: string;
  url: string;
  file_type?: string;
  file_size?: number;
  width?: number | null;
  height?: number | null;
  alt_text?: string;
  created_at?: string;
}

export interface FolderItem {
  name: string;
  slug: string;
  count: number;
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, asset?: MediaAssetItem) => void;
  defaultFolder?: string;
  title?: string;
}

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  defaultFolder = 'all',
  title = 'Media Library & Files'
}: MediaLibraryModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAssetItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync folder when prop changes
  useEffect(() => {
    if (isOpen) {
      setSelectedFolder(defaultFolder || 'all');
      fetchMedia(defaultFolder || 'all', '');
    }
  }, [isOpen, defaultFolder]);

  const fetchMedia = async (folder: string, search: string) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (folder && folder !== 'all') q.set('folder', folder);
      if (search) q.set('search', search);

      const res = await apiFetch(`/cms/media/?${q.toString()}`);
      setAssets(res?.assets || []);
      setFolders(res?.folders || []);
    } catch (err) {
      console.warn('Media fetch notice:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = (folderSlug: string) => {
    setSelectedFolder(folderSlug);
    fetchMedia(folderSlug, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMedia(selectedFolder, searchQuery);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await apiFetch('/cms/media/folders/', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName.trim() })
      });
      if (res.success && res.folder) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        setSelectedFolder(res.folder.slug);
        fetchMedia(res.folder.slug, '');
      }
    } catch (err) {
      alert('Failed to create folder');
    }
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('folder', selectedFolder === 'all' ? 'general' : selectedFolder);

      Array.from(fileList).forEach((file) => {
        formData.append('files', file);
      });

      const res = await apiFetch('/cms/media/upload/', {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        // Refresh media list
        await fetchMedia(selectedFolder, searchQuery);
        // If single file uploaded, we can optionally highlight it
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this media file?')) return;
    try {
      await apiFetch(`/cms/media/${assetId}/`, { method: 'DELETE' });
      setAssets(prev => prev.filter(a => a.id !== assetId));
      // update folder counts
      setFolders(prev => prev.map(f => {
        if (f.slug === 'all' || f.slug === selectedFolder) {
          return { ...f, count: Math.max(0, f.count - 1) };
        }
        return f;
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to delete asset');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="bg-card w-full max-w-5xl h-[85vh] rounded-3xl border border-border/20 shadow-2xl flex flex-col overflow-hidden text-foreground"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUploadFiles(e.dataTransfer.files);
          }
        }}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">
                Drop images anywhere to upload, browse folders, or pick an existing image
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Upload Button */}
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*,video/mp4,video/webm,video/quicktime" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files) handleUploadFiles(e.target.files);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 neu-btn-primary rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>{uploading ? 'Uploading...' : 'Upload Media (R2)'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drag Over Overlay Alert */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-primary/15 border-4 border-dashed border-primary backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-16 h-16 text-primary animate-bounce mb-3" />
            <h3 className="text-lg font-black text-foreground">Drop Media Files Here to Upload</h3>
            <p className="text-xs text-muted-foreground">Uploading directly to folder: {selectedFolder}</p>
          </div>
        )}

        {/* Main Body: 2-Column Sidebar + Media Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR: Folders */}
          <div className="w-64 border-r border-border/20 bg-muted/10 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Folders & Categories
              </span>
              <button
                type="button"
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="text-primary hover:text-primary/80 p-1"
                title="Create custom folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {/* New Folder Inline Form */}
            {showNewFolderInput && (
              <form onSubmit={handleCreateFolder} className="flex gap-1.5 p-2 bg-card rounded-xl border border-border/30">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="flex-1 px-2.5 py-1 text-xs neu-input rounded-lg"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-bold neu-btn-primary rounded-lg text-primary"
                >
                  Add
                </button>
              </form>
            )}

            {/* Folder List */}
            <div className="flex flex-col gap-1">
              {folders.map((f) => {
                const isActive = selectedFolder === f.slug;
                return (
                  <button
                    key={f.slug}
                    type="button"
                    onClick={() => handleFolderSelect(f.slug)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT AREA: Search & Grid */}
          <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files by name..."
                  className="w-full pl-9 pr-4 py-2 text-xs neu-input rounded-xl font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold neu-btn rounded-xl text-foreground cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Image Grid Container */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="h-full flex items-center justify-center text-primary">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : assets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/40 rounded-3xl">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <h4 className="text-sm font-extrabold text-foreground">No media assets in this folder</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Drag and drop image files directly onto this window or click the &quot;Upload Image(s)&quot; button above.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 neu-btn-primary rounded-xl text-xs font-bold text-primary flex items-center gap-2 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload First Image</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => {
                        onSelect(asset.url, asset);
                        onClose();
                      }}
                      className="group relative bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-primary/60 hover:shadow-lg transition cursor-pointer flex flex-col"
                    >
                      {/* Media Thumbnail Aspect Container */}
                      <div className="relative aspect-square w-full bg-muted/20 dark:bg-black/20 overflow-hidden flex items-center justify-center p-2">
                        {asset.file_type?.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(asset.url) ? (
                          <>
                            <video
                              src={asset.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="object-contain max-w-full max-h-full group-hover:scale-105 transition-transform duration-300 drop-shadow-xs pointer-events-none"
                            />
                            <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-purple-600/90 text-white text-[9px] font-black uppercase flex items-center gap-1 shadow-xs">
                              <Film className="w-2.5 h-2.5" />
                              <span>Video</span>
                            </div>
                          </>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={asset.url}
                            alt={asset.alt_text || asset.name}
                            className="object-contain max-w-full max-h-full group-hover:scale-105 transition-transform duration-300 drop-shadow-xs"
                            loading="lazy"
                          />
                        )}

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-white">
                              {asset.width && asset.height ? `${asset.width}×${asset.height}` : formatFileSize(asset.file_size)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAsset(asset.id, e)}
                              className="p-1 rounded-lg bg-red-500/80 hover:bg-red-600 text-white transition"
                              title="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            className="w-full py-1.5 bg-primary text-primary-foreground font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Select</span>
                          </button>
                        </div>
                      </div>

                      {/* File Details Footer */}
                      <div className="p-2 flex flex-col gap-0.5 bg-card">
                        <span className="text-[11px] font-bold text-foreground truncate" title={asset.name}>
                          {asset.name}
                        </span>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>{formatFileSize(asset.file_size)}</span>
                          <span className="uppercase text-[9px] font-bold">{asset.folder}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3 border-t border-border/20 bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
          <span>{assets.length} file(s) in {selectedFolder}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 neu-btn text-xs font-bold rounded-xl text-foreground cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
