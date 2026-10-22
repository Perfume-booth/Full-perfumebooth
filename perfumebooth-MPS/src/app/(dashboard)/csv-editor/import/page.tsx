'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CSVEditorNav from '@/components/csv/CSVEditorNav';
import { useCSVEditorStore } from '@/lib/csv/changeSetStore';
import { parseCatalogCsv } from '@/lib/csv/csvParser';
import { FileUp, FileSpreadsheet, Sparkles, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';

const SAMPLE_CATALOG_CSV = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Image Src,Status
noir-oud-100ml,Noir Oud Eau de Parfum,"Luxurious Oud fragrance with notes of saffron and amber.",PerfumeBooth,Eau de Parfum,"Attar, Oud, Luxury, Men",true,Size,100ml,NOIR-OUD-100,2499.00,2999.00,45,https://images.unsplash.com/photo-1541643600914-78b084683601,active
royal-jasmine-50ml,Royal Jasmine Extrait,"Exquisite night-blooming white floral perfume.",PerfumeBooth,Extrait de Parfum,"Floral, Women, Gift",true,Size,50ml,ROYAL-JAS-50,1899.00,2299.00,30,https://images.unsplash.com/photo-1594035910387-fea47794261f,active
al-haramain-attar,Al Haramain Classic Attar,"Concentrated pure perfume oil without alcohol.",Al Haramain,Attar Oil,"Attar, Unisex, Concentrated",true,Size,12ml,HARAMAIN-ATT-12,1299.00,1499.00,80,https://images.unsplash.com/photo-1592945403244-b3fbafd7f539,active
velvet-rose-100ml,Velvet Rose & Patchouli,"Decadent damask rose infused with dark patchouli.",PerfumeBooth,Eau de Parfum,"Rose, Floral, Luxury",true,Size,100ml,VELVET-ROSE-100,2799.00,3499.00,15,https://images.unsplash.com/photo-1523293182086-7651a899d37f,active`;

export default function CSVImportPage() {
  const router = useRouter();
  const { setImportedData, products, getStats } = useCSVEditorStore();
  const stats = getStats();
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);

  const handleFileUpload = (file: File) => {
    setIsParsing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const { products: parsedProducts, rawHeaders } = parseCatalogCsv(text);
        setImportedData(parsedProducts, rawHeaders);
      }
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setIsParsing(true);
    setFileName('sample_perfume_catalog.csv');
    const { products: parsedProducts, rawHeaders } = parseCatalogCsv(SAMPLE_CATALOG_CSV);
    setImportedData(parsedProducts, rawHeaders);
    setIsParsing(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <CSVEditorNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="md:col-span-2 bg-card neu-extruded p-6 sm:p-8 rounded-3xl border-0 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">Import Product CSV</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Select or drop your product catalog file (`.csv`).
            </p>
          </div>

          {/* Dropzone */}
          <label className="flex flex-col items-center justify-center neu-inset p-10 rounded-2xl cursor-pointer transition-all text-center hover:opacity-90">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <div className="p-4 bg-card neu-extruded-sm rounded-2xl text-primary mb-3">
              <FileUp className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-foreground">
              Click to browse or drag & drop CSV file here
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Supports the standard PerfumeBooth product CSV columns
            </p>
          </label>

          {/* Load Sample Button */}
          <div className="flex flex-wrap items-center justify-between border-t border-border/50 pt-4 gap-3">
            <span className="text-xs text-muted-foreground font-medium">
              Want to try without uploading your file?
            </span>
            <button
              onClick={handleLoadSample}
              className="px-4 py-2.5 neu-btn text-foreground text-xs font-bold rounded-2xl hover:text-primary flex items-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Load Sample Perfume Catalog
            </button>
          </div>
        </div>

        {/* Status / Overview Panel */}
        <div className="bg-card neu-extruded p-6 sm:p-8 rounded-3xl border-0 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2 tracking-tight">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Imported File Status
            </h3>

            {products.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold neu-inset-sm p-3 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Loaded {fileName || 'Catalog File'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="neu-inset-sm p-3.5 rounded-2xl">
                    <span className="text-muted-foreground font-medium block">Products</span>
                    <strong className="text-xl text-foreground font-extrabold tracking-tight">{stats.totalProducts}</strong>
                  </div>
                  <div className="neu-inset-sm p-3.5 rounded-2xl">
                    <span className="text-muted-foreground font-medium block">Variants</span>
                    <strong className="text-xl text-foreground font-extrabold tracking-tight">{stats.totalVariants}</strong>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 neu-inset-sm p-4 rounded-2xl font-medium leading-relaxed">
                  <p className="font-bold text-foreground">Next Available Actions:</p>
                  <p>• Edit a single field without touching others</p>
                  <p>• Spreadsheet grid view with live highlights</p>
                  <p>• Smart bulk operations & price increases</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground space-y-2 py-4 font-medium">
                <p>No CSV file currently loaded into memory.</p>
                <div className="p-3.5 neu-inset-sm text-amber-600 rounded-2xl flex gap-2 font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Upload your file or click <strong>Load Sample Catalog</strong> to start editing.
                  </span>
                </div>
              </div>
            )}
          </div>

          {products.length > 0 && (
            <div className="flex flex-col gap-2 pt-4">
              <button
                onClick={() => router.push('/csv-editor/single')}
                className="w-full py-3 neu-btn-primary text-xs font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                Update One Field <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
