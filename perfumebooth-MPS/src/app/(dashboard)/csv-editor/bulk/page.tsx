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

      <div className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Smart Bulk Operations Engine</h2>
            <p className="text-xs text-muted-foreground">
              Apply bulk edits across your loaded catalog ({products.length} products). Changes affect ONLY selected fields.
            </p>
          </div>
        </div>

        {/* Operation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => { setSelectedTab('PRICE'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'PRICE' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Percent className="w-4 h-4" /> Price Adjustments
          </button>
          <button
            onClick={() => { setSelectedTab('TAGS'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'TAGS' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Tag className="w-4 h-4" /> Tag Management
          </button>
          <button
            onClick={() => { setSelectedTab('TEXT'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'TEXT' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Replace className="w-4 h-4" /> Find & Replace
          </button>
          <button
            onClick={() => { setSelectedTab('STATUS'); setAppliedCount(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'STATUS' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            Status Updates
          </button>
        </div>

        {/* Tab Panels */}
        <div className="p-4 bg-secondary/20 rounded-xl border border-border">
          {selectedTab === 'PRICE' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-bold text-foreground">Bulk Price Adjustment</h3>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="priceMode"
                    checked={priceAction === 'PERCENT'}
                    onChange={() => setPriceAction('PERCENT')}
                  />
                  <span>Percentage Change (%)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="priceMode"
                    checked={priceAction === 'SET'}
                    onChange={() => setPriceAction('SET')}
                  />
                  <span>Set Fixed Price (₹)</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  {priceAction === 'PERCENT' ? 'Percentage Adjustment (e.g. 10 for +10%, -5 for -5%)' : 'New Fixed Price'}
                </label>
                <input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>
            </div>
          )}

          {selectedTab === 'TAGS' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-bold text-foreground">Bulk Tag Operation</h3>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagAction === 'ADD'}
                    onChange={() => setTagAction('ADD')}
                  />
                  <span>Add Tag</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagAction === 'REMOVE'}
                    onChange={() => setTagAction('REMOVE')}
                  />
                  <span>Remove Tag</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagAction === 'REPLACE'}
                    onChange={() => setTagAction('REPLACE')}
                  />
                  <span>Replace Tag</span>
                </label>
              </div>

              {tagAction === 'REPLACE' && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Target Tag to Remove</label>
                  <input
                    type="text"
                    value={oldTagValue}
                    onChange={(e) => setOldTagValue(e.target.value)}
                    className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground outline-hidden mb-2"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  {tagAction === 'REMOVE' ? 'Tag to Remove' : 'Tag Value'}
                </label>
                <input
                  type="text"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground outline-hidden"
                />
              </div>
            </div>
          )}

          {selectedTab === 'TEXT' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-bold text-foreground">Find & Replace Text</h3>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Target Field</label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground outline-hidden"
                >
                  <option value="title">Product Title</option>
                  <option value="vendor">Vendor / Brand</option>
                  <option value="bodyHtml">Description HTML</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Find String</label>
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Text to find..."
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Replace With</label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replacement text..."
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground outline-hidden"
                />
              </div>
            </div>
          )}

          {selectedTab === 'STATUS' && (
            <div className="flex flex-col gap-4 max-w-md">
              <h3 className="text-xs font-bold text-foreground">Bulk Product Status Change</h3>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Set Status To</label>
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground outline-hidden"
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
          <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Successfully updated field across {appliedCount} products!</span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-border pt-4">
          <span className="text-xs text-muted-foreground font-medium">
            Pending changes: <strong className="text-foreground">{stats.changedFieldsCount}</strong> fields
          </span>
          <div className="flex gap-3">
            <button
              onClick={handleApplyBulkOperation}
              className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 cursor-pointer transition-all shadow-xs"
            >
              Apply Bulk Operation
            </button>
            <button
              onClick={() => router.push('/csv-editor/review')}
              className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
            >
              Review Changes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
