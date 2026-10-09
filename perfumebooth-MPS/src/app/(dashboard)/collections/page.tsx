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
  slug: any;
  id: string;
  title: string;
  sku: string;
  image: string | null;
  brand: string;
}

interface Collection {
  excluded_products: never[];
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

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'active', 'offline', or ''
  const [filterMatchType, setFilterMatchType] = useState(''); // 'manual', 'brand', etc.

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
  const [excludedProductIds, setExcludedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/shop/collections/');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setCollections(list);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch collections');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiFetch('/shop/products/');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setProducts(list);
    } catch (err: any) {
      console.error(err);
      setProducts([]);
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
    setExcludedProductIds([]);
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
    setExcludedProductIds(col.excluded_products || []);
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

    if (matchType === 'manual' && selectedProductIds.length === 0) {
      setError('A manual collection must contain at least 1 product.');
      return;
    }

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
    formData.append('excluded_products', JSON.stringify(excludedProductIds));

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
  const productList = Array.isArray(products) ? products : [];
  const filteredProducts = productList.filter(
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
    const selectedProducts = productList.filter(p => selectedProductIds.includes(p.id));

    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
        {/* Editor Top Bar Header */}
        <div className="flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 text-xs font-semibold hover:bg-secondary border border-border rounded-xl transition duration-200 cursor-pointer text-muted-foreground bg-card"
            >
              &larr; Back to Collections
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {editingCollection ? `Edit Collection: ${editingCollection.title}` : 'Create Collection'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure banner, manual products list, matching criteria, and SEO settings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg transition duration-200 text-xs cursor-pointer"
            >
              {editingCollection ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT COLUMN: Main Collection Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Title & Description Card */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Collection Content</h2>
              
              {/* Title */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Summer Best Sellers"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a descriptive collection banner text..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground resize-none"
                />
              </div>
            </div>

            {/* Products card */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h2 className="text-sm font-bold text-foreground">Products in Collection</h2>
                <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedProductIds.length} {selectedProductIds.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {matchType !== 'manual' && (
                <div className="p-3 bg-muted/10 border border-border rounded-xl text-center">
                  <p className="text-[11px] text-muted-foreground">
                    This collection dynamically matches products by rule: 
                    <span className="font-semibold text-foreground ml-1">
                      {matchType.toUpperCase()} &middot; "{matchValue || 'Any'}"
                    </span>
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Search and Picker Input */}
                {matchType === 'manual' && (
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/75" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search product inventory to add..."
                      className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                    />
                    
                    {/* Add Product Dropdown Picker List */}
                    {productSearch && (
                      <div className="absolute z-10 w-full mt-1.5 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-lg divide-y divide-border/60">
                        {filteredProducts.filter(p => !selectedProductIds.includes(p.id)).slice(0, 10).map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProductIds([...selectedProductIds, p.id]);
                              setProductSearch('');
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer transition"
                          >
                            <div className="w-8 h-8 rounded-lg border border-border overflow-hidden bg-background">
                              {p.image ? (
                                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-muted-foreground/50 m-auto" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{p.brand} &middot; SKU: {p.sku}</p>
                            </div>
                            <span className="text-[10px] font-bold text-primary mr-1 hover:underline">+ Add</span>
                          </div>
                        ))}
                        {filteredProducts.filter(p => !selectedProductIds.includes(p.id)).length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            No unselected products found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Products Table Grid list */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
                          <th className="p-3 w-12">Thumbnail</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProducts.map((p) => (
                          <tr key={p.id} className="border-b border-border/40 hover:bg-muted/10 transition">
                            <td className="p-3">
                              <div className="w-10 h-10 rounded-lg border border-border bg-background overflow-hidden flex items-center justify-center">
                                {p.image ? (
                                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <a
                                href={`/products?edit=${p.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-foreground hover:text-primary hover:underline transition"
                                title="Edit product in a new tab"
                              >
                                {p.title}
                              </a>
                            </td>
                            <td className="p-3 font-mono text-muted-foreground">{p.sku}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                  if (matchType !== 'manual') {
                                    setExcludedProductIds(prev => [...prev, p.id]);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-lg transition cursor-pointer"
                                title="Remove from Collection"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {selectedProducts.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">
                              {matchType === 'manual' 
                                ? "No products selected. Use the search bar above to add products manually."
                                : "No products are currently matched by this collection's automatic logic rule."
                              }
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card: Search Engine SEO Listing Preview */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Search Engine Listing Preview</h2>
              
              <div className="flex flex-col gap-3 p-4 bg-muted/20 border border-border rounded-xl">
                <span className="text-xs font-semibold text-blue-400 hover:underline truncate block">
                  https://perfumebooth.com/collections/{slug}
                </span>
                <span className="text-xs font-bold text-foreground block">
                  {title || "Unreleased Collection Title"}
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed block truncate max-w-xl">
                  {description || "Add a description to see how this collection will look in search results."}
                </span>
              </div>

              {/* Edit URL Handle */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">URL Handle Slug</label>
                <div className="flex rounded-xl overflow-hidden border border-border focus-within:border-primary transition duration-200 bg-background text-sm">
                  <span className="bg-muted px-3.5 py-2.5 text-muted-foreground select-none font-semibold border-r border-border">/collections/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. summer-best-sellers"
                    className="flex-1 bg-transparent px-3 py-2.5 focus:outline-none text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar Configuration Settings */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Status Panel */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Collection Status</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground">Status (Active)</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Show collection on shop pages.</p>
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
            </div>

            {/* Collection Image Upload */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Collection Image</h2>
              
              <div className="flex flex-col gap-4 items-center p-5 border border-dashed border-border rounded-xl bg-muted/20 text-center">
                <div className="relative w-full h-32 bg-background border border-border rounded-xl flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Collection Banner Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground">Upload banner image</span>
                  <span className="text-[10px] text-muted-foreground">Supported format: WEBP, PNG, JPG (Max 2MB)</span>
                  <label className="mt-2.5 px-4 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-lg text-xs cursor-pointer inline-block text-center transition">
                    Browse Image
                    <input type="file" onChange={handleImageChange} className="hidden" accept="image/*" />
                  </label>
                </div>
              </div>
            </div>

            {/* Matching Logic Configuration */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-bold text-foreground border-b border-border pb-2.5">Collection Type</h2>
              
              {/* Match Type Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Matching Logic</label>
                <select
                  value={matchType}
                  onChange={(e) => {
                    setMatchType(e.target.value as any);
                    setMatchValue('');
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-xs text-foreground font-medium"
                >
                  <option value="manual">Manual Selection</option>
                  <option value="gender">Filter by Gender</option>
                  <option value="brand">Filter by Brand</option>
                  <option value="category">Filter by Category</option>
                  <option value="product_type">Filter by Product Type</option>
                  <option value="tag">Filter by Tag</option>
                </select>
              </div>

              {/* Match Target Value */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Match Target Value</label>
                {matchType === 'manual' ? (
                  <input
                    type="text"
                    disabled
                    placeholder="N/A for Manual Selection"
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={matchValue}
                      onChange={(e) => setMatchValue(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Select or type a value..."
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-xs text-foreground font-medium"
                    />
                    {showSuggestions && getSuggestions().length > 0 && (
                      <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
                        {getSuggestions().map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setMatchValue(s);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-muted text-xs text-foreground transition font-medium"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sort Order Priority */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Sort Order Priority</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-xs text-foreground font-medium"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  const filteredCollections = collections.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !filterStatus ||
      (filterStatus === 'active' && c.is_active) ||
      (filterStatus === 'offline' && !c.is_active);
    const matchesMatchType = !filterMatchType || c.match_type === filterMatchType;
    return matchesSearch && matchesStatus && matchesMatchType;
  });

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

      {/* Search & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        {/* Search Input Box */}
        <div className="relative w-full xl:w-96 flex-shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections by title, description or handle..."
            className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-200 text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        
        {/* Dropdown Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl transition hover:border-border-hover">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="" className="bg-card text-foreground">All Statuses</option>
              <option value="active" className="bg-card text-foreground">Active</option>
              <option value="offline" className="bg-card text-foreground">Offline</option>
            </select>
          </div>

          {/* Matching Logic Filter */}
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl transition hover:border-border-hover">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Logic</span>
            <select
              value={filterMatchType}
              onChange={(e) => setFilterMatchType(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="" className="bg-card text-foreground">All Logic Types</option>
              <option value="manual" className="bg-card text-foreground">Manual Selection</option>
              <option value="gender" className="bg-card text-foreground">Gender Auto</option>
              <option value="brand" className="bg-card text-foreground">Brand Auto</option>
              <option value="category" className="bg-card text-foreground">Category Auto</option>
              <option value="product_type" className="bg-card text-foreground">Product Type Auto</option>
              <option value="tag" className="bg-card text-foreground">Tag Auto</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(filterStatus || filterMatchType || search) && (
            <button
              onClick={() => {
                setSearch('');
                setFilterStatus('');
                setFilterMatchType('');
              }}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition duration-150 cursor-pointer ml-1"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banner</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collection</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Products</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading collections...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 opacity-50" />
                      <span className="text-sm font-semibold">No Collections Found</span>
                      <span className="text-xs max-w-xs">Try adjusting your filters or create a new collection category.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => (
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
