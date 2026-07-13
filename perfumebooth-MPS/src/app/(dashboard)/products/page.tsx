'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Filter,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
  FileImage,
  FileUp,
  FileDown
} from 'lucide-react';

interface Product {
  brand: string;
  category: string;
  productType: string;
  id: string;
  title: string;
  slug: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  image: string | null;
  images: { url: string; altText: string }[];
  attributes: Record<string, any>;
  stock: number;
  is_online: boolean;
  created_by_name?: string;
  updated_by_name?: string;
}

const NOTE_OPTIONS = [
  'Citrus',
  'Floral',
  'Fresh',
  'Musk',
  'Oud',
  'Oriental',
  'Spicy',
  'Woody'
];

const parseNotes = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val.split(',').map((v: string) => v.trim()).filter(Boolean);
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filter States
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'online', 'offline', or ''
  const [filterStock, setFilterStock] = useState(''); // 'instock', 'outofstock', or ''

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [description, setDescription] = useState('');
  const [stockLevel, setStockLevel] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [scentProfile, setScentProfile] = useState('Citrus');
  const [volume, setVolume] = useState('100ml');

  // New Fields
  const [brand, setBrand] = useState('PerfumeBooth');
  const [topNotes, setTopNotes] = useState('');
  const [middleNotes, setMiddleNotes] = useState('');
  const [baseNotes, setBaseNotes] = useState('');
  const [occasion, setOccasion] = useState('Daily Wear');
  const [gender, setGender] = useState('Unisex');
  const [season, setSeason] = useState('All Seasons');
  const [category, setCategory] = useState('Eau de Parfum (EDP)');
  const [vendor, setVendor] = useState('');
  const [tags, setTags] = useState('');
  const [productType, setProductType] = useState('Eau de Parfum');
  const [bottleMaterial, setBottleMaterial] = useState('Glass');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('price');
  const [bulkActionOption, setBulkActionOption] = useState('percent_discount');
  const [bulkActionValue, setBulkActionValue] = useState(0);
  const [noteOptions, setNoteOptions] = useState<string[]>(NOTE_OPTIONS);

  const handleAddCustomNote = (currentNotes: string[], setNotesFn: (val: string) => void) => {
    const val = prompt('Enter a name for the new custom scent note:');
    if (!val) return;
    const cleaned = val.trim();
    if (!cleaned) return;
    // Capitalize note name nicely
    const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (!noteOptions.includes(capitalized)) {
      setNoteOptions(prev => [...prev, capitalized]);
    }
    if (!currentNotes.includes(capitalized)) {
      setNotesFn([...currentNotes, capitalized].join(', '));
    }
  };

  // Helper to extract auto-generated tags from current taxonomy inputs
  const generateTagsFromInputs = () => {
    const auto: string[] = [];
    if (gender) {
      const gl = gender.toLowerCase();
      if (gl.includes('men') && !gl.includes('women')) {
        auto.push('Perfume for Men', 'men');
      }
      if (gl.includes('women') || gl.includes('female')) {
        auto.push('Perfume for Women', 'women');
      }
      if (gl.includes('unisex')) {
        auto.push('Unisex Perfume', 'unisex');
      }
    }
    if (category) auto.push(category);
    if (brand) auto.push(brand);
    if (productType) auto.push(productType);
    if (occasion) auto.push(occasion);
    if (season) auto.push(season);

    [topNotes, middleNotes, baseNotes].forEach(notesStr => {
      if (notesStr) {
        notesStr.split(',').forEach(n => {
          const cleaned = n.trim();
          if (cleaned) auto.push(cleaned);
        });
      }
    });
    return auto;
  };

  // Sync tags dynamically when inputs change
  useEffect(() => {
    const autoTags = generateTagsFromInputs();
    const combined = [...manualTags];
    autoTags.forEach(at => {
      if (!combined.some(c => c.toLowerCase() === at.toLowerCase())) {
        combined.push(at);
      }
    });
    setTags(combined.join(', '));
  }, [brand, gender, category, productType, topNotes, middleNotes, baseNotes, occasion, season]);

  const handleTagsChange = (val: string) => {
    setTags(val);
    const parsed = val.split(',').map(t => t.trim()).filter(Boolean);
    const autoTags = generateTagsFromInputs();
    const manual = parsed.filter(t => !autoTags.some(a => a.toLowerCase() === t.toLowerCase()));
    setManualTags(manual);
  };

  // Image/Video Files
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/shop/products/');
      setProducts(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const data = await apiFetch('/shop/brands/');
      if (Array.isArray(data)) {
        setBrandsList(data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchBrands();
  }, []);

  useEffect(() => {
    if (!loading && products.length > 0 && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const editSlug = params.get('edit');
      if (editSlug) {
        const prod = products.find(p => p.slug === editSlug);
        if (prod) {
          handleOpenEdit(prod);
        }
      }
    }
  }, [loading, products]);

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedSlugs.length} products?`)) {
      try {
        await apiFetch('/shop/products/', {
          method: 'DELETE',
          body: JSON.stringify({ slugs: selectedSlugs }),
          headers: { 'Content-Type': 'application/json' }
        });
        setSelectedSlugs([]);
        fetchProducts();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Failed to delete selected products.');
      }
    }
  };

  const handleBulkStatusChange = async (publish: boolean) => {
    const actionText = publish ? 'publish' : 'unpublish';
    if (confirm(`Are you sure you want to ${actionText} ${selectedSlugs.length} products?`)) {
      try {
        await apiFetch('/shop/products/', {
          method: 'PATCH',
          body: JSON.stringify({ slugs: selectedSlugs, is_online: publish }),
          headers: { 'Content-Type': 'application/json' }
        });
        setSelectedSlugs([]);
        fetchProducts();
      } catch (err: any) {
        console.error(err);
        alert(err.message || `Failed to ${actionText} selected products.`);
      }
    }
  };

  const handleApplyBulkAdjust = async () => {
    try {
      const payload: any = { slugs: selectedSlugs };
      if (bulkActionType === 'price') {
        payload.price_adjustment = { action: bulkActionOption, value: bulkActionValue };
      } else {
        payload.stock_adjustment = { action: bulkActionOption, value: bulkActionValue };
      }
      await apiFetch('/shop/products/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setBulkEditOpen(false);
      setSelectedSlugs([]);
      fetchProducts();
      alert('Successfully updated products in bulk.');
    } catch (err: any) {
      alert(err.message || 'Failed to adjust products in bulk.');
    }
  };

  const handleDuplicate = (product: Product) => {
    setEditingProduct(null);
    setTitle(`${product.title} (Copy)`);
    
    // Generate a unique slug and SKU using a random suffix
    const suffix = Math.floor(1000 + Math.random() * 9000);
    setSku(`${product.sku}-COPY-${suffix}`);
    setSlug(`${product.slug}-copy-${suffix}`);
    
    setPrice(product.price);
    setComparePrice(product.compare_at_price || '');
    setDescription(product.attributes.description || '');
    setStockLevel(product.stock);
    setIsOnline(product.is_online);
    setScentProfile(product.attributes.scent_notes || 'Citrus');
    setVolume(product.attributes.volume_ml || '100ml');
    setBrand(product.attributes.brand || 'PerfumeBooth');
    setShowNewBrandInput(false);
    setTopNotes(product.attributes.top_notes || '');
    setMiddleNotes(product.attributes.middle_notes || '');
    setBaseNotes(product.attributes.base_notes || '');
    setOccasion(product.attributes.occasion || 'Daily Wear');
    setGender(product.attributes.gender || 'Unisex');
    setSeason(product.attributes.season || 'All Seasons');
    setCategory(product.attributes.category || 'Eau de Parfum (EDP)');
    setVendor(product.attributes.vendor || '');
    setTags(Array.isArray(product.attributes.tags) ? product.attributes.tags.join(', ') : (product.attributes.tags || ''));
    setProductType(product.attributes.productType || 'Eau de Parfum');
    setBottleMaterial(product.attributes.bottle_material || 'Glass');
    setMetaTitle(product.attributes.meta_title || '');
    setMetaDescription(product.attributes.meta_description || '');
    setImageAltText(product.attributes.image_alt_text || '');
    
    setImageFile(null);
    setGalleryFiles(null);
    setError('');
    setModalOpen(true);
  };

  // Sync slug with title on creation
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingProduct) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setTitle('');
    setSlug('');
    setSku('');
    setPrice('');
    setComparePrice('');
    setDescription('');
    setStockLevel(10);
    setIsOnline(true);
    setScentProfile('Citrus');
    setVolume('100ml');
    setBrand('PerfumeBooth');
    setShowNewBrandInput(false);
    setTopNotes('');
    setMiddleNotes('');
    setBaseNotes('');
    setOccasion('Daily Wear');
    setGender('Unisex');
    setSeason('All Seasons');
    setCategory('Eau de Parfum (EDP)');
    setVendor('');
    setTags('');
    setProductType('Eau de Parfum');
    setBottleMaterial('Glass');
    setMetaTitle('');
    setMetaDescription('');
    setImageAltText('');
    setManualTags([]);
    setImageFile(null);
    setGalleryFiles(null);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setTitle(product.title);
    setSlug(product.slug);
    setSku(product.sku);
    setPrice(product.price);
    setComparePrice(product.compare_at_price || '');
    setDescription(product.attributes.description || '');
    setStockLevel(product.stock);
    setIsOnline(product.is_online);
    setScentProfile(product.attributes.scent_notes || 'Citrus');
    setVolume(product.attributes.volume_ml || '100ml');

    // Set New Fields
    setBrand(product.attributes.brand || 'PerfumeBooth');
    setShowNewBrandInput(false);
    setTopNotes(product.attributes.top_notes || '');
    setMiddleNotes(product.attributes.middle_notes || '');
    setBaseNotes(product.attributes.base_notes || '');
    setOccasion(product.attributes.occasion || 'Daily Wear');
    setGender(product.attributes.gender || 'Unisex');
    setSeason(product.attributes.season || 'All Seasons');
    setCategory(product.attributes.category || 'Eau de Parfum (EDP)');
    setVendor(product.attributes.vendor || '');
    setTags(Array.isArray(product.attributes.tags) ? product.attributes.tags.join(', ') : (product.attributes.tags || ''));
    setProductType(product.attributes.productType || 'Eau de Parfum');
    setBottleMaterial(product.attributes.bottle_material || 'Glass');
    setMetaTitle(product.attributes.meta_title || '');
    setMetaDescription(product.attributes.meta_description || '');
    setImageAltText(product.attributes.image_alt_text || '');

    // Parse initial manual tags
    const loadedTags = Array.isArray(product.attributes.tags)
      ? product.attributes.tags
      : (product.attributes.tags ? String(product.attributes.tags).split(',').map((t: string) => t.trim()).filter(Boolean) : []);

    const b = product.attributes.brand || 'PerfumeBooth';
    const g = product.attributes.gender || 'Unisex';
    const c = product.attributes.category || 'Eau de Parfum (EDP)';
    const pt = product.attributes.productType || 'Eau de Parfum';
    const tn = product.attributes.top_notes || '';
    const mn = product.attributes.middle_notes || '';
    const bn = product.attributes.base_notes || '';
    const oc = product.attributes.occasion || 'Daily Wear';
    const sn = product.attributes.season || 'All Seasons';

    const autoTags: string[] = [];
    if (g) {
      const gl = g.toLowerCase();
      if (gl.includes('men') && !gl.includes('women')) autoTags.push('Perfume for Men', 'men');
      if (gl.includes('women') || gl.includes('female')) autoTags.push('Perfume for Women', 'women');
      if (gl.includes('unisex')) autoTags.push('Unisex Perfume', 'unisex');
    }
    if (c) autoTags.push(c);
    if (b) autoTags.push(b);
    if (pt) autoTags.push(pt);
    if (oc) autoTags.push(oc);
    if (sn) autoTags.push(sn);
    [tn, mn, bn].forEach(notesStr => {
      if (notesStr) {
        notesStr.split(',').forEach((n: string) => {
          const cleaned = n.trim();
          if (cleaned) autoTags.push(cleaned);
        });
      }
    });

    const manual = loadedTags.filter((t: string) => !autoTags.some(a => a.toLowerCase() === t.toLowerCase()));
    setManualTags(manual);

    setImageFile(null);
    setGalleryFiles(null);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('slug', slug);
    formData.append('sku', sku);
    formData.append('price', price);
    if (comparePrice) formData.append('compare_at_price', comparePrice);
    formData.append('description', description);
    formData.append('stock_level', stockLevel.toString());
    formData.append('is_online', isOnline.toString());

    // Save attributes as JSON payload
    const attributes = {
      scent_notes: scentProfile,
      volume_ml: volume,
      description,
      brand,
      top_notes: topNotes,
      middle_notes: middleNotes,
      base_notes: baseNotes,
      occasion,
      gender,
      season,
      category,
      vendor,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      productType,
      bottle_material: bottleMaterial,
      meta_title: metaTitle,
      meta_description: metaDescription,
      image_alt_text: imageAltText
    };
    formData.append('attributes', JSON.stringify(attributes));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    if (galleryFiles) {
      for (let i = 0; i < galleryFiles.length; i++) {
        formData.append('gallery', galleryFiles[i]);
      }
    }

    try {
      if (editingProduct) {
        await apiFetch(`/shop/products/${editingProduct.slug}/`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        await apiFetch('/shop/products/', {
          method: 'POST',
          body: formData,
        });
      }
      setModalOpen(false);
      fetchProducts();
      fetchBrands();
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiFetch(`/shop/products/${slug}/`, {
        method: 'DELETE',
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = !filterBrand || p.brand === filterBrand;
    const matchesStatus = !filterStatus ||
      (filterStatus === 'online' && p.is_online) ||
      (filterStatus === 'offline' && !p.is_online);
    const matchesStock = !filterStock ||
      (filterStock === 'instock' && p.stock > 0) ||
      (filterStock === 'outofstock' && p.stock === 0);
    return matchesSearch && matchesBrand && matchesStatus && matchesStock;
  });

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
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {editingProduct ? `Modify catalog details for SKU: ${sku}` : 'Fill in the fields below to create a new catalog item'}
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
                <label className="text-xs font-semibold text-muted-foreground uppercase">Product Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. MPF L'amour EDP"
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
                  placeholder="e.g. mpf-lamour-edp"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* SKU */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">SKU</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. MPF-LAMOUR-100"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Stock Level */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Stock Quantity</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={stockLevel}
                  onChange={(e) => setStockLevel(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Price */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Price (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="4999.00"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Compare Price */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Compare At Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={comparePrice}
                  onChange={(e) => setComparePrice(e.target.value)}
                  placeholder="5999.00"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Liquid Volume */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Liquid Volume</label>
                <select
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="50ml">50ml</option>
                  <option value="75ml">75ml</option>
                  <option value="100ml">100ml</option>
                  <option value="200ml">200ml</option>
                </select>
              </div>

              {/* Brand Name */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Brand Name</label>
                  {brand && brand !== 'NEW_BRAND' && !showNewBrandInput && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete the brand "${brand}"?`)) {
                          try {
                            const res = await apiFetch(`/shop/brands/`, {
                              method: 'DELETE',
                              body: JSON.stringify({ brand }),
                              headers: { 'Content-Type': 'application/json' }
                            });
                            alert(`Brand "${brand}" deleted successfully.`);
                            setBrand('');
                            fetchBrands();
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition duration-150 cursor-pointer uppercase tracking-wider"
                    >
                      Delete Brand
                    </button>
                  )}
                </div>
                {!showNewBrandInput ? (
                  <select
                    value={brand}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'NEW_BRAND') {
                        setShowNewBrandInput(true);
                        setBrand('');
                      } else {
                        setBrand(val);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                  >
                    <option value="">-- Choose Brand --</option>
                    {brandsList.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="NEW_BRAND">+ Add New Brand...</option>
                  </select>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Enter new brand name..."
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewBrandInput(false);
                          setBrand('');
                        }}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition duration-150 cursor-pointer uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>

              {/* Occasion */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Occasion</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="Daily">Daily </option>
                  <option value="Date Night">Date Night</option>
                  <option value="Office / Casual">Office / Casual</option>
                  <option value="Party / Night Out">Party / Night Out / Events</option>
                  <option value="Wedding / Special">Wedding / Special</option>
                </select>
              </div>

              {/* Season */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="All Seasons">All Seasons</option>
                  <option value="Summer">Summer</option>
                  <option value="Spring">Spring</option>
                  <option value="Winter">Winter</option>
                  <option value="Autumn">Autumn</option>
                </select>
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="Attar">Attar</option>
                  <option value="Body Mist">Body Mist</option>
                  <option value="Deodorant">Deodorant</option>
                  <option value="Gifts Sets">Gifts Sets</option>
                  <option value="Perfume">Perfume</option>
                  <option value="Scent Shot">Scent Shot</option>
                </select>
              </div>

              {/* Concentration / Product Type */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Concentration</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="Eau de Parfum">Eau de Parfum</option>
                  <option value="Eau de Toilette">Eau de Toilette</option>
                  <option value="Extrait de Parfum">Extrait de Parfum</option>
                  <option value="Cologne">Cologne</option>
                  <option value="Attar/CPO">Attar/CPO</option>
                </select>
              </div>

              {/* Bottle Material */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Bottle Material</label>
                <select
                  value={bottleMaterial}
                  onChange={(e) => setBottleMaterial(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="Glass">Glass</option>
                  <option value="Premium Frosted Glass">Premium Frosted Glass</option>
                  <option value="Crystal">Crystal</option>
                  <option value="Metal-shielded Glass">Metal-shielded Glass</option>
                  <option value="Recycled Glass">Recycled Glass</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                <select
                  value={isOnline ? 'Published' : 'Draft'}
                  onChange={(e) => setIsOnline(e.target.value === 'Published')}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="Published">Published (Visible online)</option>
                  <option value="Draft">Draft (Offline/Hidden)</option>
                </select>
              </div>

              {/* Vendor */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Vendor</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. PerfumeBooth India"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Top Notes */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Top Notes</label>
                <input
                  type="text"
                  value={topNotes}
                  onChange={(e) => setTopNotes(e.target.value)}
                  placeholder="e.g. Lemon, Calabrian Bergamot"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const currentNotes = parseNotes(topNotes);
                    if (val === 'ADD_NEW_NOTE') {
                      handleAddCustomNote(currentNotes, setTopNotes);
                    } else if (!currentNotes.includes(val)) {
                      setTopNotes([...currentNotes, val].join(', '));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="">-- Add Scent Note --</option>
                  {noteOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="ADD_NEW_NOTE" className="text-primary font-bold">+ Add Custom Scent Note...</option>
                </select>
                {parseNotes(topNotes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parseNotes(topNotes).map(note => (
                      <span
                        key={note}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary transition-all duration-200"
                      >
                        {note}
                        <button
                          type="button"
                          onClick={() => {
                            const newList = parseNotes(topNotes).filter(n => n !== note);
                            setTopNotes(newList.join(', '));
                          }}
                          className="hover:text-foreground focus:outline-none cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Middle Notes */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Middle Notes</label>
                <input
                  type="text"
                  value={middleNotes}
                  onChange={(e) => setMiddleNotes(e.target.value)}
                  placeholder="e.g. Jasmine, Rose"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const currentNotes = parseNotes(middleNotes);
                    if (val === 'ADD_NEW_NOTE') {
                      handleAddCustomNote(currentNotes, setMiddleNotes);
                    } else if (!currentNotes.includes(val)) {
                      setMiddleNotes([...currentNotes, val].join(', '));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="">-- Add Scent Note --</option>
                  {noteOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="ADD_NEW_NOTE" className="text-primary font-bold">+ Add Custom Scent Note...</option>
                </select>
                {parseNotes(middleNotes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parseNotes(middleNotes).map(note => (
                      <span
                        key={note}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary transition-all duration-200"
                      >
                        {note}
                        <button
                          type="button"
                          onClick={() => {
                            const newList = parseNotes(middleNotes).filter(n => n !== note);
                            setMiddleNotes(newList.join(', '));
                          }}
                          className="hover:text-foreground focus:outline-none cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Base Notes */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Base Notes</label>
                <input
                  type="text"
                  value={baseNotes}
                  onChange={(e) => setBaseNotes(e.target.value)}
                  placeholder="e.g. Amberwood, Cedar"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const currentNotes = parseNotes(baseNotes);
                    if (val === 'ADD_NEW_NOTE') {
                      handleAddCustomNote(currentNotes, setBaseNotes);
                    } else if (!currentNotes.includes(val)) {
                      setBaseNotes([...currentNotes, val].join(', '));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                >
                  <option value="">-- Add Scent Note --</option>
                  {noteOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="ADD_NEW_NOTE" className="text-primary font-bold">+ Add Custom Scent Note...</option>
                </select>
                {parseNotes(baseNotes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parseNotes(baseNotes).map(note => (
                      <span
                        key={note}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary transition-all duration-200"
                      >
                        {note}
                        <button
                          type="button"
                          onClick={() => {
                            const newList = parseNotes(baseNotes).filter(n => n !== note);
                            setBaseNotes(newList.join(', '));
                          }}
                          className="hover:text-foreground focus:outline-none cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="e.g. fresh, luxury, sweet, office"
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
                placeholder="Enter detailed description..."
                rows={4}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Featured File (Image/Video) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Featured Image/Video</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition duration-200 text-sm cursor-pointer text-foreground">
                    <FileImage className="w-5 h-5 text-primary" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {imageFile ? imageFile.name : 'No file chosen'}
                  </span>
                </div>
              </div>

              {/* Image Alt Text */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Image Alt Text</label>
                <input
                  type="text"
                  value={imageAltText}
                  onChange={(e) => setImageAltText(e.target.value)}
                  placeholder="e.g. Lomani Code Perfume Bottle"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                />
              </div>

              {/* Additional Gallery (Images/Videos) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Gallery Files (Images/Videos)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition duration-200 text-sm cursor-pointer text-foreground">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <span>Choose Files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => setGalleryFiles(e.target.files)}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {galleryFiles ? `${galleryFiles.length} files selected` : 'No files chosen'}
                  </span>
                </div>
              </div>
            </div>

            {/* Search Engine Listing Preview */}
            <div className="border-t border-border pt-6 flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold text-foreground">Search engine listing</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add a title and description to see how this product might appear in a search engine listing.
                </p>
              </div>

              {/* Real-time Google Search Snippet Preview */}
              <div className="p-4 bg-secondary/30 border border-border rounded-xl flex flex-col gap-1 max-w-2xl">
                <span className="text-[12px] text-emerald-600 dark:text-emerald-500 font-normal truncate block">
                  https://perfumebooth.com/products/{slug || 'product-handle'}
                </span>
                <span className="text-[18px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer truncate block">
                  {metaTitle || title || 'Product Title'}
                </span>
                <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                  {metaDescription || description || 'No description provided. Add a description to help customers find this product.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {/* Meta Title */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Page Title</label>
                    <span className="text-xs text-muted-foreground">{metaTitle.length} of 70 characters</span>
                  </div>
                  <input
                    type="text"
                    maxLength={70}
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title || "e.g. Premium EDP Perfume | PerfumeBooth"}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                  />
                </div>

                {/* Meta Description */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Meta Description</label>
                    <span className="text-xs text-muted-foreground">{metaDescription.length} of 320 characters</span>
                  </div>
                  <textarea
                    maxLength={320}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder={description || "e.g. Discover our premium scent crafted for longevity..."}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                  />
                </div>
                
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 border border-border text-foreground font-semibold rounded-xl hover:bg-secondary transition duration-200 cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm disabled:opacity-50"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Product</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleExportExcel = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/shop/products/excel-export/', {
        method: 'GET',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'perfumebooth_products.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel.');
    }
  };

  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,.XLSX,.XLS,.CSV,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await apiFetch('/shop/products/excel-import/', {
          method: 'POST',
          body: formData,
        });
        alert(response.detail || 'Successfully imported products.');
        fetchProducts();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Failed to import Excel file.');
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Catalog</h1>
            <span className="text-xs font-bold text-muted-foreground bg-secondary/80 border border-border px-2.5 py-1 rounded-xl uppercase tracking-wider">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Manage store products, stock levels, and R2 images</p>
        </div>
        <div className='flex justify-center items-center gap-3'>
          {selectedSlugs.length > 0 && (
            <>
              <button
                onClick={() => handleBulkStatusChange(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
              >
                <Check className="w-5 h-5" />
                <span>Publish ({selectedSlugs.length})</span>
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-600 hover:bg-zinc-700 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-zinc-500/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
              >
                <X className="w-5 h-5" />
                <span>Unpublish ({selectedSlugs.length})</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete ({selectedSlugs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkActionType('price');
                  setBulkActionOption('percent_discount');
                  setBulkActionValue(10);
                  setBulkEditOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
              >
                <span>Bulk Edit ({selectedSlugs.length})</span>
              </button>
            </>
          )}
          <button
            onClick={handleImportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
          >
            <FileDown className="w-5 h-5" />
            <span>Import Excel</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
          >
            <FileUp className="w-5 h-5" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </button>
        </div>
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
            placeholder="Search by title or SKU..."
            className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition duration-200 text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        
        {/* Dropdown Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Brand Filter */}
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl transition hover:border-border-hover">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Brand</span>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="" className="bg-card text-foreground">All Brands</option>
              {brandsList.map(b => (
                <option key={b} value={b} className="bg-card text-foreground">{b}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl transition hover:border-border-hover">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="" className="bg-card text-foreground">All Statuses</option>
              <option value="online" className="bg-card text-foreground">Online</option>
              <option value="offline" className="bg-card text-foreground">Offline</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-xl transition hover:border-border-hover">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Stock</span>
            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="" className="bg-card text-foreground">All Stock Levels</option>
              <option value="instock" className="bg-card text-foreground">In Stock</option>
              <option value="outofstock" className="bg-card text-foreground">Out of Stock</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(filterBrand || filterStatus || filterStock) && (
            <button
              onClick={() => {
                setFilterBrand('');
                setFilterStatus('');
                setFilterStock('');
              }}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition duration-150 cursor-pointer ml-1"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Catalog Table */}
      {loading ? (
        <div className="h-60 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="p-5 w-10">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedSlugs.length === filteredProducts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSlugs(filteredProducts.map(p => p.slug));
                        } else {
                          setSelectedSlugs([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background cursor-pointer"
                    />
                  </th>
                  <th className="p-5 w-16">Preview</th>
                  <th className="p-5">Title / SKU</th>
                  <th className="p-5">Brand Name</th>
                  <th className="p-5">Price</th>
                  <th className="p-5">Stock Level</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Editor</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-muted-foreground">
                      No products found. Add your first item!
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                      <td className="p-5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedSlugs.includes(product.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSlugs([...selectedSlugs, product.slug]);
                            } else {
                              setSelectedSlugs(selectedSlugs.filter(s => s !== product.slug));
                            }
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background cursor-pointer"
                        />
                      </td>
                      <td className="p-5">
                        {product.image ? (
                          ['mp4', 'webm', 'mov', 'ogg', 'm4v'].some(ext => product.image?.toLowerCase().endsWith('.' + ext)) ? (
                            <video
                              src={product.image}
                              className="w-12 h-12 object-cover rounded-lg border border-border bg-black"
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded-lg border border-border bg-black"
                            />
                          )
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-5">
                        <div className="font-semibold text-foreground">{product.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{product.sku}</div>
                      </td>
                      <td className="p-5">
                        <div className="font-semibold text-foreground">{product.brand}</div>
                      </td>
                      <td className="p-5">
                        <div className="text-foreground font-medium">₹{parseFloat(product.price).toLocaleString('en-IN')}</div>
                        {product.compare_at_price && (
                          <div className="text-xs text-muted-foreground line-through mt-0.5">
                            ₹{parseFloat(product.compare_at_price).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="p-5">
                        {product.stock === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1  text-[11px] font-semibold bg-red-500/10 text-red-400 ">
                            Out of Stock
                          </span>
                        ) : product.stock <= 10 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1  text-[11px] font-semibold bg-amber-500/10 text-amber-400 ">
                            Low Stock: {product.stock} units
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1  text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 ">
                            {product.stock} in stock
                          </span>
                        )}
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${product.is_online
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-zinc-500/10 text-zinc-400'
                          }`}>
                          {product.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col text-xs gap-0.5">
                          <span className="text-foreground font-semibold text-[10px]">
                            L: {product.created_by_name || 'System'}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            U: {product.updated_by_name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="inline-flex gap-2 justify-end">
                          <button
                            onClick={() => handleDuplicate(product)}
                            title="Duplicate Product"
                            className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border bg-card transition cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            title="Edit Product"
                            className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border bg-card transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.slug)}
                            title="Delete Product"
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
      )}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md shadow-xl flex flex-col gap-5 animate-in fade-in zoom-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-foreground">Bulk Edit Products ({selectedSlugs.length})</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Apply bulk updates to pricing or inventory levels.</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Action Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2 bg-secondary/30 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkActionType('price');
                      setBulkActionOption('percent_discount');
                      setBulkActionValue(10);
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-md transition ${bulkActionType === 'price' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Adjust Price
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkActionType('stock');
                      setBulkActionOption('add');
                      setBulkActionValue(10);
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-md transition ${bulkActionType === 'stock' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Adjust Stock
                  </button>
                </div>
              </div>

              {/* Action Options */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Adjustment Rule</label>
                <select
                  value={bulkActionOption}
                  onChange={(e) => setBulkActionOption(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs text-foreground font-semibold"
                >
                  {bulkActionType === 'price' ? (
                    <>
                      <option value="percent_discount">Apply Percentage Discount (%)</option>
                      <option value="fixed_discount">Apply Fixed Discount (₹)</option>
                      <option value="set_compare">Set Compare-at Price (₹)</option>
                    </>
                  ) : (
                    <>
                      <option value="add">Add to Stock (+ units)</option>
                      <option value="set">Set Stock Level (fixed units)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Value Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Value</label>
                <input
                  type="number"
                  value={bulkActionValue}
                  onChange={(e) => setBulkActionValue(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs text-foreground font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setBulkEditOpen(false)}
                className="px-4 py-2 border border-border text-foreground font-semibold rounded-xl hover:bg-secondary transition text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkAdjust}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition text-xs cursor-pointer"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
