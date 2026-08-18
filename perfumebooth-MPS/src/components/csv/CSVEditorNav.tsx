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
    <div className="flex flex-col gap-4 border-b border-border pb-4 mb-6">
      {/* Top Banner */}
      <div className="flex flex-wrap justify-between items-center bg-card p-4 rounded-xl border border-border gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              Shopify Safe Partial CSV Editor
              <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-semibold rounded-full border border-emerald-500/20">
                Safe Partial Updates Active
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Guarantees untouched Shopify fields are never modified or cleared during updates.
            </p>
          </div>
        </div>

        {/* Global Summary Quick Stats */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="bg-secondary/60 px-3 py-1.5 rounded-lg border border-border">
            <span className="text-muted-foreground">Loaded Products: </span>
            <strong className="text-foreground font-semibold">{stats.totalProducts}</strong> ({stats.totalVariants} variants)
          </div>

          <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <span>Changed Fields: </span>
            <strong className="font-bold">{stats.changedFieldsCount}</strong>
          </div>

          {stats.warningsCount > 0 && (
            <div className="bg-rose-500/10 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-500/20 flex items-center gap-1.5">
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
              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Reset All
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tab Pills */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/20 text-primary'
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
