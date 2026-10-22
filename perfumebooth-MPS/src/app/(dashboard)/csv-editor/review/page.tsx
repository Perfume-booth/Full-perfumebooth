'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CSVEditorNav from '@/components/csv/CSVEditorNav';
import { useCSVEditorStore } from '@/lib/csv/changeSetStore';
import { FIELD_TO_CSV_HEADER } from '@/lib/csv/minimalCsvGenerator';
import { GitCompare, Download, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

export default function ChangeReviewPage() {
  const router = useRouter();
  const { getChangesList, resetField, getStats } = useCSVEditorStore();
  const changes = getChangesList();
  const stats = getStats();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <CSVEditorNav />

      <div className="bg-card neu-extruded rounded-3xl border-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/50 flex flex-wrap justify-between items-center gap-4 bg-secondary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-card neu-inset-sm rounded-2xl text-primary">
              <GitCompare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">Change Review Audit Screen</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Review exact <strong className="text-rose-500">OLD VALUE</strong> → <strong className="text-emerald-800 dark:text-emerald-300">NEW VALUE</strong> comparisons prior to exporting CSV.
              </p>
            </div>
          </div>

          {changes.length > 0 && (
            <button
              onClick={() => router.push('/csv-editor/export')}
              className="px-6 py-3 neu-btn-primary text-xs font-bold rounded-2xl cursor-pointer transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Proceed to Export ({changes.length} Edits)
            </button>
          )}
        </div>

        {/* Change List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-secondary/40 border-b border-border/50 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-4 px-5 min-w-[150px]">Product Handle</th>
                <th className="py-4 px-4 min-w-[120px]">SKU</th>
                <th className="py-4 px-4 min-w-[140px]">CSV Column</th>
                <th className="py-4 px-5 min-w-[180px]">OLD VALUE</th>
                <th className="py-4 px-5 min-w-[180px]">NEW VALUE</th>
                <th className="py-4 px-4 min-w-[110px]">Status State</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {changes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-14 text-center text-muted-foreground text-xs font-semibold">
                    No pending changes recorded. Use <strong className="text-primary cursor-pointer hover:underline" onClick={() => router.push('/csv-editor/single')}>Update One Field</strong> or the <strong className="text-primary cursor-pointer hover:underline" onClick={() => router.push('/csv-editor/spreadsheet')}>Spreadsheet Editor</strong> to make edits.
                  </td>
                </tr>
              ) : (
                changes.map((change) => {
                  const csvHeader = FIELD_TO_CSV_HEADER[String(change.field)] || String(change.field);
                  const isWarning = change.state === 'CLEARED' || change.field === 'handle' || change.field === 'sku';

                  return (
                    <tr key={change.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-5 font-mono text-[11px] text-foreground font-bold">
                        {change.productHandle}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground font-medium">
                        {change.variantSku || 'ALL'}
                      </td>
                      <td className="py-4 px-4 font-bold text-primary">
                        {csvHeader}
                      </td>
                      <td className="py-4 px-5 bg-rose-500/10 text-rose-800 dark:text-rose-300 font-mono break-all font-medium">
                        {change.oldValue || '(Blank)'}
                      </td>
                      <td className="py-4 px-5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-mono font-bold break-all">
                        {change.state === 'CLEARED' ? (
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> (CLEARED / EMPTY)
                          </span>
                        ) : (
                          change.newValue || '(Blank)'
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {isWarning ? (
                          <span className="px-3 py-1 neu-inset-sm text-amber-600 font-bold rounded-full text-[10px]">
                            Warning
                          </span>
                        ) : (
                          <span className="px-3 py-1 neu-inset-sm text-emerald-800 dark:text-emerald-300 font-bold rounded-full text-[10px]">
                            Valid Update
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => resetField(change.productHandle, change.variantSku, String(change.field))}
                          className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground neu-btn rounded-xl cursor-pointer transition-all inline-flex items-center gap-1.5 font-bold"
                        >
                          <RotateCcw className="w-3 h-3" /> Revert
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
