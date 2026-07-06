'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
  FileImage,
  FolderOpen
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  sku: string;
  image: string | null;
  brand: string;
}

interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string | null;
  match_type: 'manual' | 'gender' | 'brand' | 'category' | 'product_type' | 'tag';
  match_value: string;
  is_active: boolean;
  sort_order: number;
  product_count: number;
  products: string[];
}

interface FacetItem {
  value: string;
  count: number;
}

interface Facets {
  genders: FacetItem[];
  brands: FacetItem[];
  categories: FacetItem[];
  productTypes: FacetItem[];
  tags: string[];
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [matchType, setMatchType] = useState<Collection['match_type']>('manual');
  const [matchValue, setMatchValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/shop/collections/');
      setCollections(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiFetch('/shop/products/');
      setProducts(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchFacets = async () => {
    try {
      const data = await apiFetch('/shop/facets/');
      setFacets(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCollections();
    fetchProducts();
    fetchFacets();
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingCollection) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleOpenCreate = () => {
    setEditingCollection(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setMatchType('manual');
    setMatchValue('');
    setIsActive(true);
    setSortOrder(0);
    setImageFile(null);
    setImagePreview(null);
    setSelectedProductIds([]);
    setProductSearch('');
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = async (col: Collection) => {
    setEditingCollection(col);
    setTitle(col.title);
    setSlug(col.slug);
    setDescription(col.description);
    setMatchType(col.match_type);
    setMatchValue(col.match_value);
    setIsActive(col.is_active);
    setSortOrder(col.sort_order);
    setImageFile(null);
    setImagePreview(col.image);
    setSelectedProductIds(col.products || []);
    setProductSearch('');
    setError(null);
    setModalOpen(true);
  };

  const handleStatusToggle = async (col: Collection) => {
    try {
      const formData = new FormData();
      formData.append('is_active', String(!col.is_active));

      await apiFetch(`/shop/collections/${col.slug}/`, {
        method: 'PUT',
        body: formData,
      });

      setCollections(prev =>
        prev.map(c => (c.id === col.id ? { ...c, is_active: !c.is_active } : c))
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('slug', slug);
    formData.append('description', description);
    formData.append('match_type', matchType);
    formData.append('match_value', matchValue);
    formData.append('is_active', String(isActive));
    formData.append('sort_order', String(sortOrder));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    if (matchType === 'manual') {
      formData.append('products', JSON.stringify(selectedProductIds));
    }

    try {
      if (editingCollection) {
        await apiFetch(`/shop/collections/${editingCollection.slug}/`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        await apiFetch('/shop/collections/', {
          method: 'POST',
          body: formData,
        });
      }
      setModalOpen(false);
      fetchCollections();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving the collection.');
    }
  };

  const handleDeleteClick = (col: Collection) => {
    setCollectionToDelete(col);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!collectionToDelete) return;
    try {
      await apiFetch(`/shop/collections/${collectionToDelete.slug}/`, {
        method: 'DELETE',
      });
      setDeleteConfirmOpen(false);
      setCollectionToDelete(null);
      fetchCollections();
    } catch (err: any) {
      console.error(err);
      setError('Failed to delete collection.');
    }
  };

  // Filter products for the picker
  const filteredProducts = products.filter(
    p =>
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Suggestions for Match Value
  const getSuggestions = (): string[] => {
    if (!facets) return [];
    switch (matchType) {
      case 'gender':
        return facets.genders.map(g => g.value);
      case 'brand':
        return facets.brands.map(b => b.value);
      case 'category':
        return facets.categories.map(c => c.value);
      case 'product_type':
        return facets.productTypes.map(t => t.value);
      case 'tag':
        return facets.tags;
      default:
        return [];
    }
  };

  if (modalOpen) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="p-2.5 hover:bg-secondary border border-border rounded-xl transition duration-200 cursor-pointer text-muted-foreground hover:text-foreground bg-card"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {editingCollection ? 'Edit Collection' : 'Create Collection'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure collection layout, banner, and matching logic.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="bg-card border border-border p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Collection Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Summer Best Sellers"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Slug */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">URL Slug</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. summer-best-sellers"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A description for this collection banner..."
                rows={3}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Match Type */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Matching Logic</label>
                <select
                  value={matchType}
                  onChange={(e) => {
                    setMatchType(e.target.value as any);
                    setMatchValue('');
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="manual">Manual Selection</option>
                  <option value="gender">Filter by Gender</option>
                  <option value="brand">Filter by Brand</option>
                  <option value="category">Filter by Category</option>
                  <option value="product_type">Filter by Product Type</option>
                  <option value="tag">Filter by Tag</option>
                </select>
              </div>

              {/* Match Value */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Match Target Value</label>
                {matchType === 'manual' ? (
                  <input
                    type="text"
                    disabled
                    placeholder="N/A for Manual Selection"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={matchValue}
                      onChange={(e) => setMatchValue(e.target.value)}
                      placeholder="Select or type a value"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                    />
                    {getSuggestions().length > 0 && (
                      <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
                        {getSuggestions().map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setMatchValue(s)}
                            className="w-full text-left px-4 py-2 hover:bg-muted text-sm text-foreground transition"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sort Order */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Sort Order Priority</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>
            </div>

            {/* Banner Image */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Collection Banner Image</label>
              <div className="flex items-center gap-6 p-5 border border-dashed border-border rounded-2xl bg-muted/20">
                <div className="relative w-32 h-20 bg-background border border-border rounded-xl flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-foreground">Upload banner image</span>
                  <span className="text-xs text-muted-foreground">Supported format: WEBP, PNG, JPG (Max 2MB)</span>
                  <label className="mt-1 px-4 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-lg text-xs cursor-pointer inline-block text-center transition">
                    Browse File
                    <input type="file" onChange={handleImageChange} className="hidden" accept="image/*" />
                  </label>
                </div>
              </div>
            </div>

            {/* Product Picker (Manual Match Only) */}
            {matchType === 'manual' && (
              <div className="flex flex-col gap-3 border border-border p-5 rounded-2xl bg-muted/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <label className="text-sm font-semibold text-foreground">Select Products ({selectedProductIds.length} selected)</label>
                    <p className="text-xs text-muted-foreground">Choose products manually linked to this collection</p>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-2 mt-2">
                  {filteredProducts.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleProductToggle(p.id)}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${
                          isChecked
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Swallowed: handled by div click
                          className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-lg border border-border overflow-hidden bg-background">
                          {p.image ? (
                            <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-[10px]">No image</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.brand} &middot; SKU: {p.sku}</p>
                        </div>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-sm text-muted-foreground">
                      No matching products found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-2xl bg-muted/20">
              <div>
                <span className="text-sm font-semibold text-foreground">Collection Status</span>
                <p className="text-xs text-muted-foreground">Determine if this collection is publicly visible in the shop.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  isActive ? 'bg-primary' : 'bg-muted border border-border'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg transition duration-200 text-sm cursor-pointer"
              >
                {editingCollection ? 'Save Changes' : 'Create Collection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Collections</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Group products into dynamic catalogs or manually select featured lists.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg transition duration-200 cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add Collection</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="glass-panel border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banner</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collection</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL Handle</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matching Logic</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Products</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading collections...</span>
                    </div>
                  </td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 opacity-50" />
                      <span className="text-sm font-semibold">No Collections Found</span>
                      <span className="text-xs max-w-xs">Create custom catalogs to dynamically structure your products storefront.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                collections.map((col) => (
                  <tr key={col.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                    <td className="p-5">
                      <div className="w-16 h-10 rounded-lg border border-border bg-black overflow-hidden flex items-center justify-center">
                        {col.image ? (
                          <img src={col.image} alt={col.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
                        )}
                      </div>
                    </td>
                    <td className="p-5 font-semibold text-foreground text-sm">{col.title}</td>
                    <td className="p-5 text-muted-foreground text-xs font-mono">/{col.slug}</td>
                    <td className="p-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground capitalize">
                          {col.match_type.replace('_', ' ')}
                        </span>
                        {col.match_value && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full inline-block w-fit font-semibold border border-border">
                            {col.match_value}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-sm text-muted-foreground font-semibold">{col.product_count} items</td>
                    <td className="p-5">
                      <button
                        onClick={() => handleStatusToggle(col)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition border ${
                          col.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${col.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                        {col.is_active ? 'Active' : 'Offline'}
                      </button>
                    </td>
                    <td className="p-5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(col)}
                          className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border bg-card transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(col)}
                          className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg border border-border hover:border-red-500/20 bg-card transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border max-w-md w-full p-6 rounded-2xl shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">Delete Collection</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete collection <span className="font-semibold text-foreground">"{collectionToDelete.title}"</span>? This will only delete the collection configuration, not the products linked inside it.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition text-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
