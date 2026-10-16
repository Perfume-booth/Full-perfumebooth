'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Search,
  Package,
  Save,
  Loader2,
  Plus,
  Minus,
  AlertTriangle,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  sku: string;
  stock: number;
  slug: string;
  is_online: boolean;
  image?: string;
  brand?: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  
  // Filter States
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out'
  const [stockChanges, setStockChanges] = useState<{ [id: string]: number }>({});
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search term to avoid hitting the database on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1); // Reset page on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = `/shop/products/?paginate=true&page=${page}&page_size=${pageSize}&search=${search}&stock_status=${stockFilter}`;
      const data = await apiFetch(url);
      setProducts(data.results || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, stockFilter]);

  const handleStockChange = (productId: string, currentStock: number, newValue: number) => {
    const val = Math.max(newValue, 0);
    setStockChanges(prev => ({
      ...prev,
      [productId]: val
    }));
  };

  const handleSaveItem = async (product: Product) => {
    const newStock = stockChanges[product.id] !== undefined ? stockChanges[product.id] : product.stock;
    if (newStock === product.stock) return;

    try {
      setSaving(product.id);
      
      // Perform PATCH request to adjust stock level
      await apiFetch('/shop/products/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slugs: [product.slug],
          stock_adjustment: {
            action: 'set',
            value: newStock
          }
        })
      });

      // Update local state
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
      setStockChanges(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
      
    } catch (err: any) {
      alert(err.message || 'Failed to update stock.');
    } finally {
      setSaving(null);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setStockFilter(newFilter);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Inventory Control</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage catalog stock levels and warning thresholds</p>
        </div>
        <button
          onClick={fetchProducts}
          className="p-3 neu-btn text-foreground rounded-2xl transition cursor-pointer"
          title="Refresh Catalog Data"
        >
          <RefreshCw className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card neu-extruded p-5 rounded-3xl border border-border/10">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by title or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 neu-input rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              stockFilter === 'all'
                ? 'neu-btn-primary'
                : 'neu-btn text-muted-foreground hover:text-foreground'
            }`}
          >
            All Stock
          </button>
          <button
            onClick={() => handleFilterChange('low')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              stockFilter === 'low'
                ? 'neu-inset-sm text-amber-500 border border-amber-500/30'
                : 'neu-btn text-muted-foreground hover:text-foreground'
            }`}
          >
            Low Stock (1-10)
          </button>
          <button
            onClick={() => handleFilterChange('out')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              stockFilter === 'out'
                ? 'neu-inset-sm text-red-500 border border-red-500/30'
                : 'neu-btn text-muted-foreground hover:text-foreground'
            }`}
          >
            Out of Stock (0)
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="h-60 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-card neu-extruded rounded-3xl overflow-hidden border border-border/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    <th className="p-5 w-16">Preview</th>
                    <th className="p-5">Product Details</th>
                    <th className="p-5">SKU</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 w-52">Current Stock</th>
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground font-semibold">
                        No matching products found.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const currentVal = stockChanges[p.id] !== undefined ? stockChanges[p.id] : p.stock;
                      const hasChanged = currentVal !== p.stock;

                      return (
                        <tr key={p.id} className="border-b border-border/20 hover:bg-muted/10 transition duration-150">
                          <td className="p-5">
                            <div className="w-12 h-12 rounded-xl neu-inset-sm overflow-hidden flex items-center justify-center p-1">
                              {p.image ? (
                                <img src={p.image} alt={p.title} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground/30" />
                              )}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="font-semibold text-foreground text-sm">{p.title}</div>
                            {p.brand && <div className="text-xs text-muted-foreground mt-0.5">{p.brand}</div>}
                          </td>
                          <td className="p-5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                          <td className="p-5">
                            {p.stock === 0 ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-red-500">
                                Out of Stock
                              </span>
                            ) : p.stock <= 10 ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-amber-500">
                                Low Stock ({p.stock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-emerald-500">
                                Healthy ({p.stock})
                              </span>
                            )}
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStockChange(p.id, p.stock, currentVal - 1)}
                                className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center transition text-foreground cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                value={currentVal}
                                onChange={(e) => handleStockChange(p.id, p.stock, parseInt(e.target.value) || 0)}
                                className={`w-16 px-2 py-1 text-center font-bold neu-input rounded-xl text-sm text-foreground ${
                                  hasChanged ? 'border-primary ring-2 ring-primary/20' : ''
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleStockChange(p.id, p.stock, currentVal + 1)}
                                className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center transition text-foreground cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            {hasChanged && (
                              <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStockChanges(prev => {
                                      const copy = { ...prev };
                                      delete copy[p.id];
                                      return copy;
                                    });
                                  }}
                                  className="px-3 py-1.5 neu-btn text-foreground text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  disabled={saving === p.id}
                                  onClick={() => handleSaveItem(p)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 neu-btn-primary text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
                                >
                                  {saving === p.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  <span>Save</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-card neu-extruded px-6 py-4 rounded-3xl border border-border/10">
              <span className="text-xs text-muted-foreground font-medium">
                Showing page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong> ({totalCount} total items)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-xl neu-btn flex items-center justify-center text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="w-9 h-9 rounded-xl neu-btn flex items-center justify-center text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
