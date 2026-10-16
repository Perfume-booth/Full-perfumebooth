'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CSVEditorNav from '@/components/csv/CSVEditorNav';
import { useCSVEditorStore } from '@/lib/csv/changeSetStore';
import { Wand2, Percent, Tag, Replace, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BulkOperationsPage() {
  const router = useRouter();
  const { products, bulkUpdateField, getStats } = useCSVEditorStore();
  const stats = getStats();

  const [selectedTab, setSelectedTab] = useState<'PRICE' | 'TAGS' | 'TEXT' | 'STATUS'>('PRICE');

  // Price State
  const [priceAction, setPriceAction] = useState<'PERCENT' | 'SET'>('PERCENT');
  const [priceValue, setPriceValue] = useState<string>('10'); // Default +10%

  // Tag State
  const [tagAction, setTagAction] = useState<'ADD' | 'REMOVE' | 'REPLACE'>('ADD');
  const [tagValue, setTagValue] = useState<string>('summer-sale');
  const [oldTagValue, setOldTagValue] = useState<string>('summer');

  // Text Find & Replace State
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [targetField, setTargetField] = useState<string>('title');

  // Status State
  const [statusValue, setStatusValue] = useState<string>('draft');

  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const handleApplyBulkOperation = () => {
    const allHandles = products.map((p) => p.handle);

    if (selectedTab === 'PRICE') {
      bulkUpdateField(allHandles, 'price', priceValue, priceAction === 'PERCENT' ? 'PERCENT_PRICE' : 'SET');
      setAppliedCount(allHandles.length);
    } else if (selectedTab === 'TAGS') {
      if (tagAction === 'ADD') {
        bulkUpdateField(allHandles, 'tags', tagValue, 'ADD_TAG');
      } else if (tagAction === 'REMOVE') {
        bulkUpdateField(allHandles, 'tags', tagValue, 'REMOVE_TAG');
      } else if (tagAction === 'REPLACE') {
        bulkUpdateField(allHandles, 'tags', `${oldTagValue}:${tagValue}`, 'REPLACE_TAG');
      }
      setAppliedCount(allHandles.length);
    } else if (selectedTab === 'TEXT') {
      products.forEach((p) => {
        const val = (p as any)[targetField] || '';
        if (val && findText && val.includes(findText)) {
          const newVal = val.replaceAll(findText, replaceText);
          useCSVEditorStore.getState().updateField(p.handle, undefined, targetField, newVal);
        }
      });
      setAppliedCount(allHandles.length);
    } else if (selectedTab === 'STATUS') {
      bulkUpdateField(allHandles, 'status', statusValue, 'SET');
      setAppliedCount(allHandles.length);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <CSVEditorNav />

      <div className="bg-card neu-extruded p-6 sm:p-8 rounded-3xl border-0 flex flex-col gap-6">
        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
          <div className="p-3 bg-card neu-inset-sm rounded-2xl text-primary">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">Smart Bulk Operations Engine</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Apply bulk edits across your loaded catalog ({products.length} products). Changes affect ONLY selected fields.
            </p>
          </div>
        </div>

        {/* Operation Tabs */}
        <div className="flex items-center gap-2 p-1.5 neu-inset-sm rounded-2xl w-fit overflow-x-auto">
          <button
            onClick={() => { setSelectedTab('PRICE'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'PRICE' ? 'neu-btn-primary shadow-none' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Percent className="w-4 h-4" /> Price Adjustments
          </button>
          <button
            onClick={() => { setSelectedTab('TAGS'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'TAGS' ? 'neu-btn-primary shadow-none' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tag className="w-4 h-4" /> Tag Management
          </button>
          <button
            onClick={() => { setSelectedTab('TEXT'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'TEXT' ? 'neu-btn-primary shadow-none' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Replace className="w-4 h-4" /> Find & Replace
          </button>
          <button
            onClick={() => { setSelectedTab('STATUS'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'STATUS' ? 'neu-btn-primary shadow-none' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Status Updates
          </button>
        </div>

        {/* Tab Panels */}
        <div className="p-6 neu-inset rounded-3xl border-0">
          {selectedTab === 'PRICE' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Bulk Price Adjustment</h3>
              <div className="flex items-center gap-6 text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priceMode"
                    checked={priceAction === 'PERCENT'}
                    onChange={() => setPriceAction('PERCENT')}
                    className="w-4 h-4 text-primary"
                  />
                  <span>Percentage Change (%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priceMode"
                    checked={priceAction === 'SET'}
                    onChange={() => setPriceAction('SET')}
                    className="w-4 h-4 text-primary"
                  />
                  <span>Set Fixed Price (₹)</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {priceAction === 'PERCENT' ? 'Percentage Adjustment (e.g. 10 for +10%, -5 for -5%)' : 'New Fixed Price'}
                </label>
                <input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  className="w-full text-xs py-3 px-4 neu-input rounded-2xl text-foreground font-semibold"
                />
              </div>
            </div>
          )}

          {selectedTab === 'TAGS' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Bulk Tag Operation</h3>
              <div className="flex items-center gap-6 text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagAction === 'ADD'}
                    onChange={() => setTagAction('ADD')}
                    className="w-4 h-4 text-primary"
                  />
                  <span>Add Tag</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagAction === 'REMOVE'}
                    onChange={() => setTagAction('REMOVE')}
                    className="w-4 h-4 text-primary"
                  />
                  <span>Remove Tag</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagAction === 'REPLACE'}
                    onChange={() => setTagAction('REPLACE')}
                    className="w-4 h-4 text-primary"
                  />
                  <span>Replace Tag</span>
                </label>
              </div>

              {tagAction === 'REPLACE' && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Target Tag to Remove</label>
                  <input
                    type="text"
                    value={oldTagValue}
                    onChange={(e) => setOldTagValue(e.target.value)}
                    className="w-full text-xs py-3 px-4 neu-input rounded-2xl text-foreground font-medium mb-2"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {tagAction === 'REMOVE' ? 'Tag to Remove' : 'Tag Value'}
                </label>
                <input
                  type="text"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  className="w-full text-xs py-3 px-4 neu-input rounded-2xl text-foreground font-medium"
                />
              </div>
            </div>
          )}

          {selectedTab === 'TEXT' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Find & Replace Text</h3>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Target Field</label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full text-xs py-3 px-4 neu-input rounded-2xl text-foreground font-semibold cursor-pointer"
                >
                  <option value="title">Product Title</option>
                  <option value="vendor">Vendor / Brand</option>
                  <option value="bodyHtml">Description HTML</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Find String</label>
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Text to find..."
                  className="w-full text-xs py-3 px-4 neu-input rounded-2xl text-foreground font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Replace With</label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replacement text..."
                  className="w-full text-xs py-3 px-4 neu-input rounded-2xl text-foreground font-medium"
                />
              </div>
            </div>
          )}

          {selectedTab === 'STATUS' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Bulk Product Status Change</h3>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Set Status To</label>
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                  className="w-full text-xs py-3 px-4 neu-input rounded-2xl text-foreground font-semibold cursor-pointer"
                >
                  <option value="active">active (Published)</option>
                  <option value="draft">draft (Draft)</option>
                  <option value="archived">archived (Archived)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Applied Alert Feedback */}
        {appliedCount !== null && (
          <div className="p-4 neu-inset-sm text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully updated field across {appliedCount} products!</span>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center border-t border-border/50 pt-4 gap-4">
          <span className="text-xs text-muted-foreground font-medium">
            Pending changes: <strong className="text-foreground font-bold">{stats.changedFieldsCount}</strong> fields
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyBulkOperation}
              className="px-6 py-3 neu-btn-primary text-xs font-bold rounded-2xl cursor-pointer transition-all"
            >
              Apply Bulk Operation
            </button>
            <button
              onClick={() => router.push('/csv-editor/review')}
              className="px-6 py-3 neu-btn text-emerald-600 hover:text-emerald-700 text-xs font-bold rounded-2xl cursor-pointer transition-all flex items-center gap-2"
            >
              Review Changes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
