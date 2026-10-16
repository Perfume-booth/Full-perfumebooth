'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCSVEditorStore } from '@/lib/csv/changeSetStore';
import {
  FileUp,
  Sliders,
  Table,
  Wand2,
  GitCompare,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export default function CSVEditorNav() {
  const pathname = usePathname();
  const { products, changeSet, resetAllChanges, getStats } = useCSVEditorStore();
  const stats = getStats();

  const navItems = [
    { href: '/csv-editor/import', label: '1. Import CSV', icon: FileUp },
    { href: '/csv-editor/single', label: '2. Update One Field', icon: Sliders },
    { href: '/csv-editor/spreadsheet', label: '3. Excel Grid Editor', icon: Table },
    { href: '/csv-editor/bulk', label: '4. Smart Bulk Operations', icon: Wand2 },
    { href: '/csv-editor/review', label: '5. Change Review', icon: GitCompare, badge: stats.changedFieldsCount },
    { href: '/csv-editor/export', label: '6. Validate & Export', icon: Download, badge: stats.warningsCount > 0 ? `${stats.warningsCount} Warnings` : undefined },
  ];

  return (
    <div className="flex flex-col gap-5 mb-8">
      {/* Top Banner */}
      <div className="flex flex-wrap justify-between items-center bg-card neu-extruded p-6 rounded-3xl border-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-card neu-inset-sm rounded-2xl text-primary shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              Safe Partial CSV Editor
              <span className="text-[11px] px-3 py-1 neu-inset-sm text-emerald-600 font-bold rounded-full">
                Safe Partial Updates Active
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Guarantees untouched catalog fields are never modified or cleared during updates.
            </p>
          </div>
        </div>

        {/* Global Summary Quick Stats */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="neu-inset-sm px-3.5 py-2 rounded-2xl">
            <span className="text-muted-foreground font-medium">Loaded: </span>
            <strong className="text-foreground font-bold">{stats.totalProducts} products</strong> ({stats.totalVariants} variants)
          </div>

          <div className="neu-inset-sm px-3.5 py-2 rounded-2xl text-amber-600">
            <span>Changed: </span>
            <strong className="font-bold">{stats.changedFieldsCount}</strong>
          </div>

          {stats.warningsCount > 0 && (
            <div className="neu-inset-sm px-3.5 py-2 rounded-2xl text-rose-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{stats.warningsCount} Warnings</span>
            </div>
          )}

          {stats.changedFieldsCount > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all pending changes?')) {
                  resetAllChanges();
                }
              }}
              className="px-3.5 py-2 text-xs text-rose-500 hover:text-rose-600 neu-btn rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset All
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tab Pills */}
      <nav className="flex items-center gap-2 p-1.5 neu-inset-sm rounded-2xl overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'neu-btn-primary shadow-none'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'neu-inset-sm text-primary'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
