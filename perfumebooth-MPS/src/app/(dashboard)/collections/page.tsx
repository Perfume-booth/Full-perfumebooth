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
import ResizableTextarea from '@/components/ui/ResizableTextarea';

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
        <div className="flex items-center justify-between border-b border-border/30 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3.5 py-2 text-xs font-bold neu-btn rounded-xl transition duration-200 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              &larr; Back to Collections
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
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
              className="px-4 py-2 neu-btn text-foreground font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 neu-btn-primary font-bold rounded-xl transition duration-200 text-xs cursor-pointer"
            >
              {editingCollection ? 'Save Changes' : 'Create Collection'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl neu-inset-sm text-sm text-red-500 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT COLUMN: Main Collection Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Title & Description Card */}
            <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground border-b border-border/30 pb-3">Collection Content</h2>
              
              {/* Title */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Summer Best Sellers"
                  className="w-full px-4 py-3 neu-input rounded-2xl transition duration-200 text-sm text-foreground font-medium"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <ResizableTextarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a descriptive collection banner text..."
                  rows={4}
                  minHeight={80}
                />
              </div>
            </div>

            {/* Products card */}
            <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Products in Collection</h2>
                <span className="text-[10px] font-extrabold text-primary neu-inset-sm px-3 py-1 rounded-full uppercase tracking-wider">
                  {selectedProductIds.length} {selectedProductIds.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {matchType !== 'manual' && (
                <div className="p-3.5 neu-inset-sm rounded-2xl text-center">
                  <p className="text-xs text-muted-foreground">
                    This collection dynamically matches products by rule: 
                    <span className="font-bold text-foreground ml-1">
                      {matchType.toUpperCase()} &middot; "{matchValue || 'Any'}"
                    </span>
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Search and Picker Input */}
                {matchType === 'manual' && (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/75" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search product inventory to add..."
                      className="w-full pl-12 pr-4 py-3 neu-input rounded-2xl transition duration-200 text-sm text-foreground"
                    />
                    
                    {/* Add Product Dropdown Picker List */}
                    {productSearch && (
                      <div className="absolute z-10 w-full mt-2 max-h-60 overflow-y-auto bg-card neu-extruded rounded-2xl border border-border/10 divide-y divide-border/20 shadow-xl">
                        {filteredProducts.filter(p => !selectedProductIds.includes(p.id)).slice(0, 10).map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProductIds([...selectedProductIds, p.id]);
                              setProductSearch('');
                            }}
                            className="flex items-center gap-3 p-3.5 hover:bg-muted/40 cursor-pointer transition"
                          >
                            <div className="w-9 h-9 rounded-xl neu-inset-sm overflow-hidden flex items-center justify-center p-0.5">
                              {p.image ? (
                                <img src={p.image} alt={p.title} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-muted-foreground/50 m-auto" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{p.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate font-medium">{p.brand} &middot; SKU: {p.sku}</p>
                            </div>
                            <span className="text-xs font-bold text-primary mr-1 hover:underline">+ Add</span>
                          </div>
                        ))}
                        {filteredProducts.filter(p => !selectedProductIds.includes(p.id)).length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground font-medium">
                            No unselected products found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Products Table Grid list */}
                <div className="neu-inset rounded-2xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/30 bg-muted/20 text-muted-foreground font-bold uppercase tracking-wider">
                          <th className="p-3.5 w-12">Thumbnail</th>
                          <th className="p-3.5">Product Name</th>
                          <th className="p-3.5">SKU</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {selectedProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/10 transition">
                            <td className="p-3.5">
                              <div className="w-10 h-10 rounded-xl neu-inset-sm overflow-hidden flex items-center justify-center p-0.5">
                                {p.image ? (
                                  <img src={p.image} alt={p.title} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <a
                                href={`/products?edit=${p.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-foreground hover:text-primary hover:underline transition"
                                title="Edit product in a new tab"
                              >
                                {p.title}
                              </a>
                            </td>
                            <td className="p-3.5 font-mono text-muted-foreground font-medium">{p.sku}</td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                  if (matchType !== 'manual') {
                                    setExcludedProductIds(prev => [...prev, p.id]);
                                  }
                                }}
                                className="p-1.5 neu-btn text-muted-foreground hover:text-red-500 rounded-xl transition cursor-pointer"
                                title="Remove from Collection"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {selectedProducts.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground font-semibold">
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
            <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground border-b border-border/30 pb-3">Search Engine Listing Preview</h2>
              
              <div className="flex flex-col gap-3 p-4 neu-inset-sm rounded-2xl">
                <span className="text-xs font-bold text-primary hover:underline truncate block">
                  https://perfumebooth.com/collections/{slug}
                </span>
                <span className="text-sm font-extrabold text-foreground block">
                  {title || "Unreleased Collection Title"}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed block truncate max-w-xl font-medium">
                  {description || "Add a description to see how this collection will look in search results."}
                </span>
              </div>

              {/* Edit URL Handle */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">URL Handle Slug</label>
                <div className="flex rounded-2xl overflow-hidden neu-input text-sm">
                  <span className="bg-muted/40 px-3.5 py-2.5 text-muted-foreground select-none font-bold border-r border-border/30">/collections/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. summer-best-sellers"
                    className="flex-1 bg-transparent px-3.5 py-2.5 focus:outline-none text-foreground font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar Configuration Settings */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Status Panel */}
            <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground border-b border-border/30 pb-3">Collection Status</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground">Status (Active)</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Show collection on shop pages.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                    isActive ? 'bg-primary' : 'neu-inset-sm'
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
            <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground border-b border-border/30 pb-3">Collection Image</h2>
              
              <div className="flex flex-col gap-4 items-center p-5 neu-inset rounded-2xl text-center">
                <div className="relative w-full h-32 neu-inset-sm rounded-xl flex items-center justify-center overflow-hidden">
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
                  <span className="text-xs font-bold text-foreground">Upload banner image</span>
                  <span className="text-[10px] text-muted-foreground">Supported: WEBP, PNG, JPG (Max 2MB)</span>
                  <label className="mt-2.5 px-4 py-2 neu-btn text-foreground font-bold rounded-xl text-xs cursor-pointer inline-block text-center transition">
                    Browse Image
                    <input type="file" onChange={handleImageChange} className="hidden" accept="image/*" />
                  </label>
                </div>
              </div>
            </div>

            {/* Matching Logic Configuration */}
            <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground border-b border-border/30 pb-3">Collection Type</h2>
              
              {/* Match Type Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Matching Logic</label>
                <select
                  value={matchType}
                  onChange={(e) => {
                    setMatchType(e.target.value as any);
                    setMatchValue('');
                  }}
                  className="w-full px-4 py-2.5 neu-input rounded-xl transition duration-200 text-xs text-foreground font-bold cursor-pointer"
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Match Target Value</label>
                {matchType === 'manual' ? (
                  <input
                    type="text"
                    disabled
                    placeholder="N/A for Manual Selection"
                    className="w-full px-4 py-2.5 neu-inset-sm rounded-xl text-xs text-muted-foreground cursor-not-allowed font-medium opacity-60"
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
                      className="w-full px-4 py-2.5 neu-input rounded-xl transition duration-200 text-xs text-foreground font-bold"
                    />
                    {showSuggestions && getSuggestions().length > 0 && (
                      <div className="absolute z-10 w-full mt-2 max-h-40 overflow-y-auto bg-card neu-extruded rounded-2xl border border-border/10 shadow-xl">
                        {getSuggestions().map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setMatchValue(s);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-muted text-xs text-foreground transition font-bold"
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sort Order Priority</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 neu-input rounded-xl transition duration-200 text-xs text-foreground font-bold"
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
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Collections</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-primary">
              Catalogs
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Group products into dynamic catalogs or manually select featured lists.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-bold rounded-2xl transition duration-200 cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add Collection</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card neu-extruded p-5 rounded-3xl border border-border/10">
        {/* Search Input Box */}
        <div className="relative w-full xl:w-96 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections by title, description or handle..."
            className="w-full pl-12 pr-4 py-2.5 neu-input rounded-2xl transition duration-200 text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        
        {/* Dropdown Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-card neu-extruded-sm border border-border/10 px-3.5 py-2 rounded-2xl">
            <span className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-wider">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-bold pr-1"
            >
              <option value="" className="bg-card text-foreground">All Statuses</option>
              <option value="active" className="bg-card text-foreground">Active</option>
              <option value="offline" className="bg-card text-foreground">Offline</option>
            </select>
          </div>

          {/* Matching Logic Filter */}
          <div className="flex items-center gap-2 bg-card neu-extruded-sm border border-border/10 px-3.5 py-2 rounded-2xl">
            <span className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-wider">Logic</span>
            <select
              value={filterMatchType}
              onChange={(e) => setFilterMatchType(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-bold pr-1"
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
              className="neu-btn px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 transition duration-150 cursor-pointer ml-1"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card neu-extruded rounded-3xl overflow-hidden border border-border/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Banner</th>
                <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Collection</th>
                <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Products</th>
                <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-sm font-semibold text-muted-foreground">Loading collections...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 opacity-50" />
                      <span className="text-sm font-bold text-foreground">No Collections Found</span>
                      <span className="text-xs max-w-xs font-medium">Try adjusting your filters or create a new collection category.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => (
                  <tr key={col.id} className="border-b border-border/20 hover:bg-muted/10 transition duration-150">
                    <td className="p-5">
                      <div className="w-16 h-10 rounded-xl neu-inset-sm overflow-hidden flex items-center justify-center p-0.5">
                        {col.image ? (
                          <img src={col.image} alt={col.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
                        )}
                      </div>
                    </td>
                    <td className="p-5 font-bold text-foreground text-sm">{col.title}</td>
                    <td className="p-5 text-sm">
                      <span className="neu-inset-sm px-3 py-1 rounded-full text-xs font-bold text-muted-foreground">
                        {col.product_count} items
                      </span>
                    </td>
                    <td className="p-5">
                      <button
                        onClick={() => handleStatusToggle(col)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-inset-sm transition cursor-pointer ${
                          col.is_active
                            ? 'text-emerald-500'
                            : 'text-zinc-500'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${col.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                        {col.is_active ? 'Active' : 'Offline'}
                      </button>
                    </td>
                    <td className="p-5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(col)}
                          className="p-2.5 neu-btn text-muted-foreground hover:text-foreground rounded-xl transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(col)}
                          className="p-2.5 neu-btn text-muted-foreground hover:text-red-500 rounded-xl transition cursor-pointer"
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
          <div className="bg-card neu-extruded max-w-md w-full p-7 rounded-3xl border border-border/10 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-foreground">Delete Collection</h3>
            <p className="text-sm text-muted-foreground font-medium">
              Are you sure you want to delete collection <span className="font-bold text-foreground">"{collectionToDelete.title}"</span>? This will only delete the collection configuration, not the products linked inside it.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-5 py-2.5 neu-btn text-foreground font-bold rounded-2xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 neu-btn text-white font-bold rounded-2xl text-xs bg-red-500 hover:bg-red-600 transition cursor-pointer"
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
