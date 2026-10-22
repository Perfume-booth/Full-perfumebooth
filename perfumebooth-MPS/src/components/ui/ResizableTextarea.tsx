'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Maximize2, 
  Minimize2, 
  FileText,
  Code,
  Eye 
} from 'lucide-react';

const CKEditorWrapper = dynamic(() => import('@/components/cms/CKEditorWrapper'), {
  ssr: false,
  loading: () => (
    <div className="p-5 bg-card/60 border border-border/30 rounded-2xl text-xs text-muted-foreground animate-pulse flex items-center justify-center min-h-[220px]">
      Loading CKEditor with full features...
    </div>
  )
});

export type ResizableEditorMode = 'plain' | 'rich' | 'visual' | 'code';

export interface ResizableTextareaProps 
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  minHeight?: number;
  maxHeight?: number;
  initialHeight?: number;
  showSizeControls?: boolean;
  enableCKEditor?: boolean;
  initialMode?: ResizableEditorMode;
  helpText?: string;
}

export default function ResizableTextarea({
  label,
  minHeight = 60,
  maxHeight = 750,
  initialHeight,
  showSizeControls = true,
  enableCKEditor = true,
  initialMode,
  helpText,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
  disabled,
  ...props
}: ResizableTextareaProps) {
  // Compute initial height based on rows or provided initialHeight
  const defaultCalculatedHeight = initialHeight || Math.max(minHeight, Number(rows) * 26 + 24);
  const [height] = useState(defaultCalculatedHeight);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const valueString = typeof value === 'string' ? value : '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(valueString);
  const [activeMode, setActiveMode] = useState<'plain' | 'visual' | 'code'>(() => {
    if (initialMode === 'rich' || initialMode === 'visual') return 'visual';
    if (initialMode === 'code') return 'code';
    return hasHtml ? 'visual' : 'plain';
  });

  // Close fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const charCount = valueString.length;

  const handleCKEditorChange = (data: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: { value: data },
        currentTarget: { value: data }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <>
      {/* Backdrop for Fullscreen mode */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}

      <div className={`flex flex-col gap-1 w-full transition-all duration-200 ${
        isFullscreen 
          ? 'fixed inset-3 sm:inset-6 z-50 bg-card border-2 border-primary/40 rounded-3xl p-5 shadow-2xl overflow-hidden backdrop-blur-xl' 
          : 'relative'
      }`}>
        {/* Header with Label, CKEditor Switch, and Size Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs select-none">
          {label ? (
            <label className="text-[11px] font-extrabold text-foreground uppercase tracking-wider truncate">
              {label}
            </label>
          ) : <div />}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-wrap">
            {/* View Mode Segment Switch: Plain | Visual | Code View | Split */}
            {enableCKEditor && (
              <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => setActiveMode('plain')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    activeMode === 'plain'
                      ? 'bg-card text-foreground shadow-xs border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Plain text input mode"
                >
                  <FileText className="w-2.5 h-2.5" />
                  <span>Plain</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('visual')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    activeMode === 'visual'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visual rich text editor (CKEditor with bold, lists, tables & media)"
                >
                  <Eye className="w-2.5 h-2.5" />
                  <span>Visual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('code')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                    activeMode === 'code'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Code view mode: view and edit raw HTML source code"
                >
                  <Code className="w-2.5 h-2.5" />
                  <span>Code View</span>
                </button>
              </div>
            )}

            {/* Fullscreen Modal Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-1.5 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border/40 flex items-center gap-1 font-bold text-[10px] transition cursor-pointer"
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Expand editor to fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-2.5 h-2.5 text-primary" />
                  <span>Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-2.5 h-2.5 text-primary" />
                  <span>Full</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Body: CKEditor Mode (Visual/Code) OR Resizable Textarea Mode (Plain) */}
        {activeMode !== 'plain' ? (
          <div className="w-full">
            <CKEditorWrapper
              value={valueString}
              onChange={handleCKEditorChange}
              placeholder={placeholder}
              initialHeight={Math.max(180, height)}
              initialViewMode={activeMode}
              onViewModeChange={(m) => setActiveMode(m)}
            />
          </div>
        ) : (
          <div className={`relative w-full ${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              style={{
                height: isFullscreen ? '100%' : `${height}px`,
                minHeight: `${minHeight}px`,
                maxHeight: isFullscreen ? 'none' : `${maxHeight}px`,
                resize: isFullscreen ? 'none' : 'vertical'
              }}
              className={`w-full neu-input rounded-xl p-3 outline-none text-foreground text-xs leading-relaxed transition-colors duration-150 ${className} ${
                isFullscreen ? 'flex-1' : ''
              }`}
              {...props}
            />

            {/* Bottom Resize Info & Character Count - High Contrast Bold 700 */}
            <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-800 dark:text-slate-200 font-bold select-none">
              {helpText ? (
                <span className="truncate max-w-[70%] font-bold text-slate-800 dark:text-slate-100">{helpText}</span>
              ) : (
                <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                  ↕ Drag corner to resize height freely
                </span>
              )}
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 shrink-0 ml-auto">
                {charCount} chars {!isFullscreen && `· ${height}px`}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
