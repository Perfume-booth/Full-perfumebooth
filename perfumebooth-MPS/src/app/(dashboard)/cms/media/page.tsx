'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Folder, 
  FolderPlus, 
  UploadCloud, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  Loader2, 
  Layout, 
  ImageIcon, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { MediaAssetItem, FolderItem } from '@/components/cms/MediaLibraryModal';

export default function MediaManagerPage() {
  const router = useRouter();
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia(selectedFolder, searchQuery);
  }, []);

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

  const handleFolderChange = (slug: string) => {
    setSelectedFolder(slug);
    fetchMedia(slug, searchQuery);
  };

  const handleSearch = (e: React.FormEvent) => {
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
        await fetchMedia(selectedFolder, searchQuery);
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to permanently delete this media file?')) return;
    try {
      await apiFetch(`/cms/media/${assetId}/`, { method: 'DELETE' });
      setAssets(prev => prev.filter(a => a.id !== assetId));
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

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className="flex flex-col gap-6 h-[calc(100vh-140px)] max-w-7xl mx-auto w-full text-foreground"
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
      {/* Top Navigation Sub-Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/cms')}
          className="px-5 py-2.5 font-bold text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-2xl neu-btn transition-colors cursor-pointer"
        >
          <Layout className="w-4 h-4" />
          <span>Visual CMS & Section Builder</span>
        </button>
        <button
          onClick={() => router.push('/cms/banners')}
          className="px-5 py-2.5 font-bold text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-2xl neu-btn transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Header Banners & Slideshows</span>
        </button>
        <button
          onClick={() => router.push('/cms/media')}
          className="px-5 py-2.5 font-bold text-xs neu-inset-sm text-primary flex items-center gap-2 rounded-2xl"
        >
          <Folder className="w-4 h-4" />
          <span>Media Library & Folders</span>
        </button>
      </div>

      {/* Header Banner & Controls */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-card neu-extruded p-6 rounded-3xl border border-border/10">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Media Assets & Folders Manager</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Organize high-resolution product imagery, promotional banners, and branding across folders with drag-and-drop
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleUploadFiles(e.target.files);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-bold rounded-2xl transition duration-200 cursor-pointer text-xs disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>{uploading ? 'Uploading...' : 'Upload Image(s)'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Manager */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left Column: Folders Directory (4 cols) */}
        <div className="lg:col-span-4 bg-card neu-extruded p-5 rounded-3xl border border-border/10 flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-border/20">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Folders</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowNewFolderInput(!showNewFolderInput)}
              className="p-1.5 rounded-xl text-primary hover:bg-primary/10 transition"
              title="Add New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {showNewFolderInput && (
            <form onSubmit={handleCreateFolder} className="flex gap-2 p-2 bg-muted/20 rounded-xl border border-border/30">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="flex-1 px-3 py-1.5 text-xs neu-input rounded-lg"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold neu-btn-primary rounded-lg text-primary"
              >
                Create
              </button>
            </form>
          )}

          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {folders.map((f) => {
              const isActive = selectedFolder === f.slug;
              return (
                <button
                  key={f.slug}
                  type="button"
                  onClick={() => handleFolderChange(f.slug)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Files Grid & Search (8 cols) */}
        <div className="lg:col-span-8 bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4 overflow-hidden">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images by name..."
                className="w-full pl-9 pr-4 py-2.5 text-xs neu-input rounded-2xl font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold neu-btn rounded-2xl text-foreground cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Grid of Files */}
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
                  Drag and drop image files directly onto this window or click Upload Image(s) above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-primary/60 hover:shadow-lg transition flex flex-col"
                  >
                    <div className="relative aspect-square w-full bg-muted/20 dark:bg-black/20 overflow-hidden flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="object-contain max-w-full max-h-full group-hover:scale-105 transition-transform duration-300 drop-shadow-xs"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/70 text-white">
                            {asset.width && asset.height ? `${asset.width}×${asset.height}` : formatFileSize(asset.file_size)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(asset.id)}
                            className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white transition"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(asset.url, asset.id)}
                            className="flex-1 py-1.5 bg-white text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm"
                          >
                            {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === asset.id ? 'Copied!' : 'Copy URL'}</span>
                          </button>
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-black/70 text-white rounded-xl hover:bg-black transition flex items-center justify-center"
                            title="Open full image"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 flex flex-col gap-0.5 bg-card">
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
    </div>
  );
}
