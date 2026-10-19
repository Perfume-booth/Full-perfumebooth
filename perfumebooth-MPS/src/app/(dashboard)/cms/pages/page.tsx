'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  FileText, 
  Folder, 
  ExternalLink 
} from 'lucide-react';
import InfoPagesManager from '@/components/cms/InfoPagesManager';

export default function CMSPagesPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-130px)] max-w-7xl mx-auto w-full text-foreground">
      {/* Top Navigation Bar: 3 Primary Modes */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card neu-extruded px-6 py-4 rounded-3xl border border-border/10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Home */}
          <button
            type="button"
            onClick={() => router.push('/cms')}
            className="px-5 py-2.5 font-bold text-xs rounded-2xl flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Home</span>
          </button>

          {/* Tab 2: Pages (Active) */}
          <button
            type="button"
            className="px-5 py-2.5 font-bold text-xs rounded-2xl flex items-center gap-2.5 neu-inset-sm text-primary ring-1 ring-primary/20 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Pages</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-500">
              8
            </span>
          </button>

          {/* Tab 3: Media Library */}
          <button
            type="button"
            onClick={() => router.push('/cms/media')}
            className="px-5 py-2.5 font-bold text-xs rounded-2xl flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer"
          >
            <Folder className="w-4 h-4 text-emerald-500" />
            <span>Media Library (R2)</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3000/info/about-us"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 neu-btn text-foreground font-bold rounded-2xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Open live storefront page in a new tab"
          >
            <span>View Live</span>
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </div>

      {/* Info & Policy Pages Studio */}
      <InfoPagesManager />
    </div>
  );
}
