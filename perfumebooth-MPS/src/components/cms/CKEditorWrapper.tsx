'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { 
  Maximize2, 
  Minimize2, 
  Code, 
  Eye 
} from 'lucide-react';

interface CKEditorWrapperProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  initialHeight?: number;
  initialViewMode?: 'visual' | 'code' | string;
  onViewModeChange?: (mode: 'visual' | 'code') => void;
}

// The predefined build bundles its own CKEditor types. The React adapter uses
// the equivalent types from the `ckeditor5` package, so TypeScript sees two
// nominally different Editor classes even though their runtime API matches.
const CompatibleClassicEditor = ClassicEditor as unknown as React.ComponentProps<
  typeof CKEditor
>['editor'];


export default function CKEditorWrapper({ 
  value, 
  onChange, 
  placeholder,
  initialHeight = 280,
  initialViewMode = 'visual',
  onViewModeChange
}: CKEditorWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>(
    initialViewMode === 'code' ? 'code' : 'visual'
  );

  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when parent changes mode
  useEffect(() => {
    if (initialViewMode === 'code' || initialViewMode === 'visual') {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const handleSetViewMode = (mode: 'visual' | 'code') => {
    if (mode === 'code' && value && !value.includes('\n')) {
      const formatted = value.replace(/>\s*<(?=\/?(?:h[1-6]|p|div|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|section|article|header|footer|figure|hr)\b)/gi, '>\n<');
      onChange(formatted);
    }
    setViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const handleKeyDownInCode = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = value || '';
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onChange(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const codeLines = (value || '').split('\n');
  const codeChars = (value || '').length;
  const codeWords = (value || '').trim() ? (value || '').trim().split(/\s+/).length : 0;

  const currentHeightPx = isFullscreen ? 'calc(100vh - 220px)' : `${initialHeight}px`;

  return (
    <>
      {/* Backdrop when in fullscreen mode */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}

      <div className={`transition-all duration-200 ${
        isFullscreen 
          ? 'fixed inset-3 sm:inset-6 z-50 bg-card border-2 border-primary/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 overflow-hidden backdrop-blur-xl' 
          : 'neu-inset rounded-2xl overflow-hidden p-1 text-foreground text-sm flex flex-col gap-1'
      }`}>
        {/* Editor Controls Bar: Mode Switch (Visual | Code View) and Fullscreen */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/40 rounded-xl border border-border/20 text-xs select-none">
          {/* Mode Switch (Visual | Code View) */}
          <div className="flex items-center gap-1 bg-card/80 p-0.5 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => handleSetViewMode('visual')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'visual'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
              title="Visual WYSIWYG editor"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode('code')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'code'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
              title="View and edit raw HTML code"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code View</span>
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-2.5 py-1 rounded-md bg-card hover:bg-muted text-foreground border border-border/40 flex items-center gap-1.5 font-bold text-[11px] transition cursor-pointer"
            title={isFullscreen ? 'Exit fullscreen editor (Esc)' : 'Expand to Fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-primary" />
                <span>Exit</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body: Visual, Code View, or Split View */}
        <div className={`w-full ${isFullscreen ? 'flex-1 overflow-hidden' : ''}`}>
          {/* 1. VISUAL MODE */}
          {viewMode === 'visual' && (
            <div className={isFullscreen ? 'h-full flex flex-col' : ''}>
              <CKEditor
                editor={CompatibleClassicEditor}
                data={value || ''}
                config={{
                  licenseKey: process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY || 'GPL',
                  placeholder: placeholder || 'Type your content here...',
                  toolbar: [
                    'heading',
                    '|',
                    'bold',
                    'italic',
                    'link',
                    '|',
                    'bulletedList',
                    'numberedList',
                    'outdent',
                    'indent',
                    '|',
                    'blockQuote',
                    'insertTable',
                    'mediaEmbed',
                    '|',
                    'undo',
                    'redo'
                  ],
                  table: {
                    contentToolbar: [
                      'tableColumn',
                      'tableRow',
                      'mergeTableCells'
                    ]
                  }
                }}
                onChange={(_event, editor) => {
                  const data = editor.getData();
                  onChange(data);
                }}
              />
            </div>
          )}

          {/* 2. CODE VIEW MODE */}
          {viewMode === 'code' && (
            <div className={`flex flex-col gap-1 w-full ${isFullscreen ? 'h-full' : ''}`}>
              {/* Code Info & Stats Bar - High Contrast & Crystal Clear */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-zinc-900 rounded-t-xl border border-b-0 border-zinc-700/80 font-mono select-none">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-2 text-white font-bold text-xs tracking-wide">
                    <Code className="w-4 h-4 text-emerald-400" />
                    <span>HTML Source Code Editor</span>
                  </span>
                  <span className="hidden sm:inline px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] tracking-wide">
                    HTML5
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-semibold">
                  <span className="text-zinc-100 bg-zinc-800/90 px-2 py-0.5 rounded border border-zinc-700">
                    {codeLines.length} {codeLines.length === 1 ? 'line' : 'lines'}
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-100 bg-zinc-800/90 px-2 py-0.5 rounded border border-zinc-700">
                    {codeWords} words
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-100 bg-zinc-800/90 px-2 py-0.5 rounded border border-zinc-700">
                    {codeChars} chars
                  </span>
                </div>
              </div>

              {/* Code Editor Body */}
              <div className="flex w-full overflow-hidden border border-zinc-700/80 rounded-b-xl bg-[#09090b]">
                <textarea
                  ref={codeTextareaRef}
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKeyDownInCode}
                  placeholder="Write or paste raw HTML code here (<p>, <h2>, <strong>, <table>, etc.)..."
                  style={{
                    height: currentHeightPx,
                    minHeight: '180px',
                    resize: isFullscreen ? 'none' : 'vertical'
                  }}
                  className="w-full bg-transparent text-emerald-300 font-mono text-[13px] p-4 outline-none focus:ring-1 focus:ring-emerald-500/50 leading-relaxed selection:bg-emerald-500/30 shadow-inner"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Resize Drag Grip & Indicator */}
        {!isFullscreen && (
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold select-none">
            <span>
              {viewMode === 'code' 
                ? 'Editing raw HTML source code' 
                : 'Drag bottom corner to resize height freely'}
            </span>
          </div>
        )}

        <style jsx global>{`
          .ck-editor__editable_inline {
            height: ${currentHeightPx} !important;
            min-height: 160px !important;
            font-size: 15px !important;
            resize: vertical !important;
            overflow-y: auto !important;
            background-color: var(--color-background, #121212) !important;
            color: var(--color-foreground, #ffffff) !important;
            padding: 1rem !important;
            border-bottom-left-radius: 1rem !important;
            border-bottom-right-radius: 1rem !important;
          }
          .ck-toolbar {
            background-color: var(--color-card, #1a1a1a) !important;
            border-color: var(--color-border, #333333) !important;
            border-top-left-radius: 1rem !important;
            border-top-right-radius: 1rem !important;
          }
          .ck-toolbar__items .ck-button {
            color: var(--color-foreground, #e5e5e5) !important;
          }
          .ck-toolbar__items .ck-button:hover {
            background-color: var(--color-muted, #262626) !important;
          }
          .ck-toolbar__items .ck-button.ck-on {
            background-color: var(--color-primary, #d4af37) !important;
            color: #000000 !important;
          }
          .ck-dropdown__panel {
            background-color: var(--color-card, #1a1a1a) !important;
            border-color: var(--color-border, #333333) !important;
          }
          .ck-list__item .ck-button {
            color: var(--color-foreground, #ffffff) !important;
          }
          .ck-list__item .ck-button:hover {
            background-color: var(--color-muted, #262626) !important;
          }
          .ck-content .table {
            margin: 1rem 0 !important;
            width: 100% !important;
          }
          .ck-content .table table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .ck-content .table th, .ck-content .table td {
            border: 1px solid var(--color-border, #333333) !important;
            padding: 0.6rem 0.8rem !important;
          }
          .ck-content .table th {
            background-color: var(--color-muted, #1e1e1e) !important;
            font-weight: 700 !important;
          }
          .ck-content blockquote {
            border-left: 3px solid var(--color-primary, #d4af37) !important;
            padding-left: 1rem !important;
            font-style: italic !important;
            color: var(--color-muted-foreground, #a1a1aa) !important;
            margin: 0.8rem 0 !important;
          }
          .ck-content ul {
            list-style-type: disc !important;
            padding-left: 1.5rem !important;
            margin: 0.5rem 0 !important;
          }
          .ck-content ol {
            list-style-type: decimal !important;
            padding-left: 1.5rem !important;
            margin: 0.5rem 0 !important;
          }
          .ck-content a {
            color: var(--color-primary, #d4af37) !important;
            text-decoration: underline !important;
          }
          .ck-content h1, .ck-content h2, .ck-content h3, .ck-content h4 {
            font-weight: 800 !important;
            margin-top: 1rem !important;
            margin-bottom: 0.5rem !important;
          }
        `}</style>
      </div>
    </>
  );
}
