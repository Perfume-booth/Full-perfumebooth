'use client';

import React, { useState } from 'react';
import CSVEditorNav from '@/components/csv/CSVEditorNav';
import { useCSVEditorStore } from '@/lib/csv/changeSetStore';
import { validateCatalogChanges } from '@/lib/csv/validationEngine';
import { generateMinimalCatalogCsv } from '@/lib/csv/minimalCsvGenerator';
import { generateFullCatalogCsv } from '@/lib/csv/fullCsvGenerator';
import {
  Download,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

export default function ExportCenterPage() {
  const { products, getChangesList, getStats, rawHeaders } = useCSVEditorStore();
  const changes = getChangesList();
  const stats = getStats();

  const validationIssues = validateCatalogChanges(products, changes);
  const errors = validationIssues.filter((i) => i.severity === 'ERROR');
  const warnings = validationIssues.filter((i) => i.severity === 'WARNING');

  const [exportMode, setExportMode] = useState<'MINIMAL' | 'FULL'>('MINIMAL');

  const handleDownloadCsv = () => {
    let csvData = '';
    let filename = '';

    if (exportMode === 'MINIMAL') {
      const { csvString } = generateMinimalCatalogCsv(products, changes);
      csvData = csvString;
      filename = `catalog_safe_update_${Date.now()}.csv`;
    } else {
      csvData = generateFullCatalogCsv(products, rawHeaders);
      filename = `catalog_full_export_${Date.now()}.csv`;
    }

    if (!csvData) {
      alert('No data or changes to export.');
      return;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadReport = () => {
    let reportText = `CATALOG UPDATE VALIDATION REPORT\nGenerated: ${new Date().toISOString()}\n\n`;
    reportText += `Total Products: ${stats.totalProducts}\nTotal Variants: ${stats.totalVariants}\nChanged Products: ${stats.changedProductsCount}\nChanged Fields: ${stats.changedFieldsCount}\n\n`;
    reportText += `VALIDATION ISSUES (${validationIssues.length}):\n`;
    validationIssues.forEach((issue) => {
      reportText += `[${issue.severity}] Product: ${issue.handle} | Field: ${issue.field} | Message: ${issue.message}\n`;
    });

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalog_validation_report_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <CSVEditorNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Export Control Panel */}
        <div className="md:col-span-2 bg-card p-6 rounded-2xl border border-border flex flex-col gap-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Generate Catalog Import CSV</h2>
              <p className="text-xs text-muted-foreground">
                Export update files ready for importing into PerfumeBooth.
              </p>
            </div>
          </div>

          {/* Export Mode Toggle */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-foreground">Export Mode Selection:</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Minimal Mode */}
              <div
                onClick={() => setExportMode('MINIMAL')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                  exportMode === 'MINIMAL'
                    ? 'border-emerald-500 bg-emerald-500/10 text-foreground shadow-xs'
                    : 'border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> SAFE MINIMAL UPDATE MODE
                  </span>
                  {exportMode === 'MINIMAL' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] leading-relaxed">
                  Exports <strong>ONLY</strong> product handles, required identifiers, and explicitly edited fields. Untouched catalog data remains unchanged.
                </p>
              </div>

              {/* Full Mode */}
              <div
                onClick={() => setExportMode('FULL')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                  exportMode === 'FULL'
                    ? 'border-primary bg-primary/10 text-foreground shadow-xs'
                    : 'border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" /> FULL CATALOG MODE
                  </span>
                  {exportMode === 'FULL' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed">
                  Exports the complete catalog file containing all columns and all products.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            <button
              onClick={handleDownloadCsv}
              disabled={errors.length > 0}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download {exportMode === 'MINIMAL' ? 'Safe Minimal CSV' : 'Full Catalog CSV'}
            </button>

            <button
              onClick={handleDownloadReport}
              className="py-3 px-4 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl border border-border flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4 text-primary" /> Download Validation Report
            </button>
          </div>
        </div>

        {/* Validation Issues Sidebar */}
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" /> Pre-Export Check
            </h3>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center p-2.5 bg-secondary/50 rounded-lg border border-border text-xs">
                <span>Changed Products:</span>
                <strong className="text-foreground">{stats.changedProductsCount}</strong>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-secondary/50 rounded-lg border border-border text-xs">
                <span>Changed Fields:</span>
                <strong className="text-foreground">{stats.changedFieldsCount}</strong>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                <span>Warnings:</span>
                <strong>{warnings.length}</strong>
              </div>

              {errors.length > 0 ? (
                <div className="p-3 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs rounded-lg border border-rose-500/20 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {errors.length} blocking error(s) must be resolved before exporting.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Ready for export! Zero blocking errors detected.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
