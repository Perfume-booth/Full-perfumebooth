'use client';

import React from 'react';
import Image from 'next/image';
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  GripVertical, 
  ImageIcon 
} from 'lucide-react';

interface AccordionItemProps {
  title: string;
  subtitle?: string;
  index: number;
  total: number;
  thumbnail?: string | null;
  badge?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export default function AccordionItem({
  title,
  subtitle,
  index,
  total,
  thumbnail,
  badge,
  isExpanded,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
  children
}: AccordionItemProps) {
  return (
    <div className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
      isExpanded 
        ? 'bg-card border-primary/40 shadow-sm ring-1 ring-primary/20' 
        : 'bg-card hover:bg-muted/30 border-border/30'
    }`}>
      {/* Clickable Header Bar */}
      <div 
        onClick={onToggle}
        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Order Badge / Grip */}
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <GripVertical className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              #{index + 1}
            </span>
          </div>

          {/* Thumbnail Preview */}
          <div className="w-10 h-10 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/20 flex items-center justify-center relative">
            {thumbnail ? (
              <Image 
                src={thumbnail} 
                alt={title} 
                fill 
                className="object-contain p-0.5"
                unoptimized
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate max-w-[220px]">
                {title || `Item #${index + 1}`}
              </span>
              {badge && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[260px]">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition cursor-pointer"
            title="Move item up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition cursor-pointer"
            title="Move item down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition cursor-pointer ml-1"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand / Collapse Indicator */}
          <div 
            onClick={onToggle}
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer ml-1 ${
              isExpanded ? 'bg-primary/10 text-primary rotate-180' : ''
            }`}
          >
            <ChevronDown className="w-4 h-4 transition-transform duration-200" />
          </div>
        </div>
      </div>

      {/* Expanded Content Form */}
      {isExpanded && (
        <div className="p-4 pt-2 border-t border-border/20 bg-muted/5 flex flex-col gap-3.5">
          {children}
        </div>
      )}
    </div>
  );
}
