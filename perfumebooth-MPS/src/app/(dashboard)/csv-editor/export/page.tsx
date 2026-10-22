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
        <div className="md:col-span-2 bg-card neu-extruded p-6 sm:p-8 rounded-3xl border-0 flex flex-col gap-6">
          <div className="flex items-center gap-4 border-b border-border/50 pb-4">
            <div className="p-3 bg-card neu-inset-sm rounded-2xl text-emerald-800 dark:text-emerald-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">Generate Catalog Import CSV</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Export update files ready for importing into PerfumeBooth.
              </p>
            </div>
          </div>

          {/* Export Mode Toggle */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Export Mode Selection:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Minimal Mode */}
              <div
                onClick={() => setExportMode('MINIMAL')}
                className={`p-5 rounded-2xl cursor-pointer transition-all flex flex-col gap-2.5 ${
                  exportMode === 'MINIMAL'
                    ? 'neu-inset text-foreground'
                    : 'neu-extruded-sm text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> SAFE MINIMAL UPDATE
                  </span>
                  {exportMode === 'MINIMAL' && <CheckCircle2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />}
                </div>
                <p className="text-[11px] leading-relaxed font-medium">
                  Exports <strong>ONLY</strong> product handles, required identifiers, and explicitly edited fields. Untouched catalog data remains unchanged.
                </p>
              </div>

              {/* Full Mode */}
              <div
                onClick={() => setExportMode('FULL')}
                className={`p-5 rounded-2xl cursor-pointer transition-all flex flex-col gap-2.5 ${
                  exportMode === 'FULL'
                    ? 'neu-inset text-foreground'
                    : 'neu-extruded-sm text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" /> FULL CATALOG MODE
                  </span>
                  {exportMode === 'FULL' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed font-medium">
                  Exports the complete catalog file containing all columns and all products.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
            <button
              onClick={handleDownloadCsv}
              disabled={errors.length > 0}
              className="flex-1 py-3.5 px-5 neu-btn-primary disabled:opacity-50 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download {exportMode === 'MINIMAL' ? 'Safe Minimal CSV' : 'Full Catalog CSV'}
            </button>

            <button
              onClick={handleDownloadReport}
              className="py-3.5 px-5 neu-btn text-foreground text-xs font-bold rounded-2xl flex items-center gap-2 cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4 text-primary" /> Download Validation Report
            </button>
          </div>
        </div>

        {/* Validation Issues Sidebar */}
        <div className="bg-card neu-extruded p-6 sm:p-8 rounded-3xl border-0 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2 tracking-tight">
              <FileCheck className="w-5 h-5 text-primary" /> Pre-Export Check
            </h3>

            <div className="flex flex-col gap-3 font-medium">
              <div className="flex justify-between items-center p-3.5 neu-inset-sm rounded-2xl text-xs">
                <span className="text-muted-foreground">Changed Products:</span>
                <strong className="text-foreground font-bold">{stats.changedProductsCount}</strong>
              </div>

              <div className="flex justify-between items-center p-3.5 neu-inset-sm rounded-2xl text-xs">
                <span className="text-muted-foreground">Changed Fields:</span>
                <strong className="text-foreground font-bold">{stats.changedFieldsCount}</strong>
              </div>

              <div className="flex justify-between items-center p-3.5 neu-inset-sm rounded-2xl text-xs text-amber-600 font-bold">
                <span>Warnings:</span>
                <strong>{warnings.length}</strong>
              </div>

              {errors.length > 0 ? (
                <div className="p-4 neu-inset-sm text-rose-500 text-xs rounded-2xl flex gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {errors.length} blocking error(s) must be resolved before exporting.
                  </span>
                </div>
              ) : (
                <div className="p-4 neu-inset-sm text-emerald-800 dark:text-emerald-400 text-xs rounded-2xl flex items-center gap-2 font-bold">
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
