'use client';

import React, { useState } from 'react';
import { Package, Info, ChevronDown, ChevronUp, Globe, FileText, Check } from 'lucide-react';

export interface ShippingValues {
  isPhysical: boolean;
  packageType: string;
  length: string;
  width: string;
  height: string;
  sizeUnit: string;
  weight: string;
  weightUnit: string;
  countryOfOrigin: string;
  hsCode: string;
}

interface ShippingSectionProps {
  values: ShippingValues;
  onChange: (updated: Partial<ShippingValues>) => void;
}

const PACKAGE_PRESETS: Record<string, { length: string; width: string; height: string; sizeUnit: string; weight: string; weightUnit: string }> = {
  'Store default • Box - 10 × 12 × 15 cm, 0.5 kg': {
    length: '10.0',
    width: '12.0',
    height: '15.0',
    sizeUnit: 'cm',
    weight: '0.5',
    weightUnit: 'kg',
  },
  'Small Perfume Box • 8 × 8 × 12 cm, 0.3 kg': {
    length: '8.0',
    width: '8.0',
    height: '12.0',
    sizeUnit: 'cm',
    weight: '0.3',
    weightUnit: 'kg',
  },
  'Medium Luxury Box • 15 × 15 × 20 cm, 0.8 kg': {
    length: '15.0',
    width: '15.0',
    height: '20.0',
    sizeUnit: 'cm',
    weight: '0.8',
    weightUnit: 'kg',
  },
  'Large Discovery / Gift Box • 20 × 20 × 25 cm, 1.2 kg': {
    length: '20.0',
    width: '20.0',
    height: '25.0',
    sizeUnit: 'cm',
    weight: '1.2',
    weightUnit: 'kg',
  },
};

const COUNTRIES = [
  'India',
  'United Arab Emirates',
  'France',
  'Italy',
  'United States',
  'United Kingdom',
  'Spain',
  'Germany',
  'Saudi Arabia',
  'Switzerland',
  'Oman',
  'Bahrain',
  'Kuwait',
  'Qatar',
  'Turkey',
];

export default function ShippingSection({ values, onChange }: ShippingSectionProps) {
  const [customsOpen, setCustomsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handlePackageTypeChange = (presetName: string) => {
    if (presetName === 'Custom package') {
      onChange({ packageType: presetName });
    } else if (PACKAGE_PRESETS[presetName]) {
      const preset = PACKAGE_PRESETS[presetName];
      onChange({
        packageType: presetName,
        length: preset.length,
        width: preset.width,
        height: preset.height,
        sizeUnit: preset.sizeUnit,
        weight: preset.weight,
        weightUnit: preset.weightUnit,
      });
    }
  };

  return (
    <div className="bg-card neu-extruded border border-border/10 rounded-3xl p-6 sm:p-7 flex flex-col gap-6 transition-all duration-200">
      {/* Header with Title and Physical Product Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl neu-inset-sm flex items-center justify-center text-primary flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground tracking-tight">Shipping & Logistics</h3>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Configure package dimensions, carrier weight, and customs information
            </p>
          </div>
        </div>

        {/* Physical product Toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
            Physical product
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={values.isPhysical}
            onClick={() => onChange({ isPhysical: !values.isPhysical })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              values.isPhysical ? 'bg-primary neu-btn-primary' : 'bg-muted neu-inset-sm'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                values.isPhysical ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {!values.isPhysical ? (
        /* Digital Product Notice */
        <div className="p-5 rounded-2xl neu-inset border border-border/20 text-xs text-muted-foreground leading-relaxed flex items-center gap-3">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            This is a digital product or service. Customers won't be prompted to enter shipping addresses or pay shipping rates at checkout.
          </span>
        </div>
      ) : (
        /* Physical Shipping Fields */
        <div className="flex flex-col gap-5">
          {/* Package when shipped alone */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 sm:w-1/3">
              Package when shipped alone
            </label>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                <Package className="w-4 h-4" />
              </div>
              <select
                value={values.packageType}
                onChange={(e) => handlePackageTypeChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 neu-input rounded-2xl text-sm text-foreground appearance-none cursor-pointer font-medium"
              >
                <option value="Store default • Box - 10 × 12 × 15 cm, 0.5 kg">
                  Store default • Box - 10 × 12 × 15 cm, 0.5 kg
                </option>
                <option value="Small Perfume Box • 8 × 8 × 12 cm, 0.3 kg">
                  Small Perfume Box • 8 × 8 × 12 cm, 0.3 kg
                </option>
                <option value="Medium Luxury Box • 15 × 15 × 20 cm, 0.8 kg">
                  Medium Luxury Box • 15 × 15 × 20 cm, 0.8 kg
                </option>
                <option value="Large Discovery / Gift Box • 20 × 20 × 25 cm, 1.2 kg">
                  Large Discovery / Gift Box • 20 × 20 × 25 cm, 1.2 kg
                </option>
                <option value="Custom package">Custom package...</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Packed product size */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 sm:w-1/3 relative">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Packed product size
              </label>
              <div
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                onMouseEnter={() => setShowTooltip('size')}
                onMouseLeave={() => setShowTooltip(null)}
                onClick={() => setShowTooltip(showTooltip === 'size' ? null : 'size')}
              >
                <Info className="w-3.5 h-3.5" />
              </div>
              {showTooltip === 'size' && (
                <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-card neu-extruded-sm border border-border/20 text-foreground text-[11px] rounded-2xl shadow-xl z-50">
                  Outer dimensions of the packaging used for calculating courier volumetric weight.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1">
              {/* Length */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  L
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={values.length}
                  onChange={(e) => {
                    onChange({ length: e.target.value, packageType: 'Custom package' });
                  }}
                  placeholder="0.0"
                  className="w-full pl-8 pr-3 py-2 neu-input rounded-xl text-sm text-foreground text-right font-medium"
                />
              </div>

              <span className="text-muted-foreground text-xs font-bold">×</span>

              {/* Width */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  W
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={values.width}
                  onChange={(e) => {
                    onChange({ width: e.target.value, packageType: 'Custom package' });
                  }}
                  placeholder="0.0"
                  className="w-full pl-8 pr-3 py-2 neu-input rounded-xl text-sm text-foreground text-right font-medium"
                />
              </div>

              <span className="text-muted-foreground text-xs font-bold">×</span>

              {/* Height */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  H
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={values.height}
                  onChange={(e) => {
                    onChange({ height: e.target.value, packageType: 'Custom package' });
                  }}
                  placeholder="0.0"
                  className="w-full pl-8 pr-3 py-2 neu-input rounded-xl text-sm text-foreground text-right font-medium"
                />
              </div>

              {/* Dimension Unit */}
              <div className="relative w-20 shrink-0">
                <select
                  value={values.sizeUnit}
                  onChange={(e) => onChange({ sizeUnit: e.target.value })}
                  className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold text-foreground appearance-none cursor-pointer text-center"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="mm">mm</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-muted-foreground">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Weight */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 sm:w-1/3 relative">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Weight
              </label>
              <div
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                onMouseEnter={() => setShowTooltip('weight')}
                onMouseLeave={() => setShowTooltip(null)}
                onClick={() => setShowTooltip(showTooltip === 'weight' ? null : 'weight')}
              >
                <Info className="w-3.5 h-3.5" />
              </div>
              {showTooltip === 'weight' && (
                <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-card neu-extruded-sm border border-border/20 text-foreground text-[11px] rounded-2xl shadow-xl z-50">
                  Used by shipping carriers (e.g. Shiprocket, BlueDart, Delhivery) to compute live freight costs.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={values.weight}
                onChange={(e) => {
                  onChange({ weight: e.target.value, packageType: 'Custom package' });
                }}
                placeholder="0.0"
                className="w-full px-4 py-2 neu-input rounded-xl text-sm text-foreground font-medium"
              />

              {/* Weight Unit */}
              <div className="relative w-20 shrink-0">
                <select
                  value={values.weightUnit}
                  onChange={(e) => onChange({ weightUnit: e.target.value })}
                  className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold text-foreground appearance-none cursor-pointer text-center"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-muted-foreground">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Customs Information Pill Dropdown / Accordion */}
          <div className="pt-3 border-t border-border/30">
            <button
              type="button"
              onClick={() => setCustomsOpen(!customsOpen)}
              className="w-full flex items-center justify-between py-2 text-left neu-btn rounded-2xl px-4 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl neu-inset-sm text-xs font-semibold text-foreground">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  {values.countryOfOrigin ? `Origin: ${values.countryOfOrigin}` : 'Country of origin'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl neu-inset-sm text-xs font-semibold text-foreground">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  {values.hsCode ? `HS: ${values.hsCode}` : 'HS Code'}
                </span>
              </div>
              <div className="text-muted-foreground group-hover:text-foreground transition-colors p-1">
                {customsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {customsOpen && (
              <div className="mt-3 p-5 neu-inset rounded-2xl border border-border/20 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in-50 duration-200">
                {/* Country of Origin */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Country/Region of origin
                  </label>
                  <select
                    value={values.countryOfOrigin}
                    onChange={(e) => onChange({ countryOfOrigin: e.target.value })}
                    className="w-full px-3.5 py-2 neu-input rounded-2xl text-sm text-foreground cursor-pointer font-medium"
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-muted-foreground">
                    In most cases, where the fragrance was manufactured or blended.
                  </span>
                </div>

                {/* HS Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    HS (Harmonized System) code
                  </label>
                  <input
                    type="text"
                    value={values.hsCode}
                    onChange={(e) => onChange({ hsCode: e.target.value })}
                    placeholder="e.g. 3303.00.10"
                    className="w-full px-3.5 py-2 neu-input rounded-2xl text-sm text-foreground font-medium"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    HS tariff code used by customs (3303.00 is standard for Perfumes & Toilet Waters).
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
