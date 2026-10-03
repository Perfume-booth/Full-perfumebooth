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

      <div className="bg-card rounded-2xl border border-border flex flex-col shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex flex-wrap justify-between items-center gap-4 bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <GitCompare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Change Review Audit Screen</h2>
              <p className="text-xs text-muted-foreground">
                Review exact <strong className="text-rose-600">OLD VALUE</strong> → <strong className="text-emerald-600">NEW VALUE</strong> comparisons prior to exporting CSV.
              </p>
            </div>
          </div>

          {changes.length > 0 && (
            <button
              onClick={() => router.push('/csv-editor/export')}
              className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 cursor-pointer transition-all flex items-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4" /> Proceed to Export ({changes.length} Edits)
            </button>
          )}
        </div>

        {/* Change List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-secondary/80 border-b border-border font-semibold text-foreground">
              <tr>
                <th className="p-3.5 min-w-[150px]">Product Handle</th>
                <th className="p-3.5 min-w-[120px]">SKU</th>
                <th className="p-3.5 min-w-[140px]">CSV Column</th>
                <th className="p-3.5 min-w-[180px]">OLD VALUE</th>
                <th className="p-3.5 min-w-[180px]">NEW VALUE</th>
                <th className="p-3.5 min-w-[110px]">Status State</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {changes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground text-xs">
                    No pending changes recorded. Use <strong className="text-primary cursor-pointer" onClick={() => router.push('/csv-editor/single')}>Update One Field</strong> or the <strong className="text-primary cursor-pointer" onClick={() => router.push('/csv-editor/spreadsheet')}>Spreadsheet Editor</strong> to make edits.
                  </td>
                </tr>
              ) : (
                changes.map((change) => {
                  const csvHeader = FIELD_TO_CSV_HEADER[String(change.field)] || String(change.field);
                  const isWarning = change.state === 'CLEARED' || change.field === 'handle' || change.field === 'sku';

                  return (
                    <tr key={change.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-foreground font-semibold">
                        {change.productHandle}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                        {change.variantSku || 'ALL'}
                      </td>
                      <td className="p-3.5 font-semibold text-primary">
                        {csvHeader}
                      </td>
                      <td className="p-3.5 bg-rose-500/10 text-rose-800 dark:text-rose-300 font-mono break-all">
                        {change.oldValue || '(Blank)'}
                      </td>
                      <td className="p-3.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-mono font-semibold break-all">
                        {change.state === 'CLEARED' ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> (CLEARED / EMPTY)
                          </span>
                        ) : (
                          change.newValue || '(Blank)'
                        )}
                      </td>
                      <td className="p-3.5">
                        {isWarning ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold rounded-md border border-amber-500/20 text-[10px]">
                            Warning
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-md border border-emerald-500/20 text-[10px]">
                            Valid Update
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => resetField(change.productHandle, change.variantSku, String(change.field))}
                          className="px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary border border-border rounded-md cursor-pointer transition-all inline-flex items-center gap-1"
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
