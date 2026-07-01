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
  FileImage
} from 'lucide-react';

interface Product {
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
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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
  
  // Image Files
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchProducts();
  }, []);

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
      description
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

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catalog</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage store products, stock levels, and S3 images</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by title or SKU..."
            className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
          />
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
                  <th className="p-5 w-16">Preview</th>
                  <th className="p-5">Title / SKU</th>
                  <th className="p-5">Price</th>
                  <th className="p-5">Stock Level</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No products found. Add your first item!
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-muted/10 transition duration-150">
                      <td className="p-5">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.title} 
                            className="w-12 h-12 object-cover rounded-lg border border-border bg-black"
                          />
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
                        <div className="text-foreground font-medium">₹{parseFloat(product.price).toLocaleString('en-IN')}</div>
                        {product.compare_at_price && (
                          <div className="text-xs text-muted-foreground line-through mt-0.5">
                            ₹{parseFloat(product.compare_at_price).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="p-5">
                        <span className={`font-semibold ${product.stock === 0 ? 'text-red-400' : 'text-foreground'}`}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          product.is_online 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-zinc-500/10 text-zinc-400'
                        }`}>
                          {product.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition duration-200 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.slug)}
                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-200 cursor-pointer"
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

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-border p-8 rounded-2xl shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition duration-200 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

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
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm"
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
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm"
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
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm"
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
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm"
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
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm"
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
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm"
                  />
                </div>

                {/* Scent Profile */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Scent Profile</label>
                  <select
                    value={scentProfile}
                    onChange={(e) => setScentProfile(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm text-foreground"
                  >
                    <option value="Citrus">Citrus</option>
                    <option value="Floral">Floral</option>
                    <option value="Woody">Woody</option>
                    <option value="Spicy">Spicy</option>
                    <option value="Musk">Musk</option>
                  </select>
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
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed description..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition duration-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Featured Image */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Featured Image</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-xl hover:bg-muted/80 transition duration-200 text-sm cursor-pointer text-foreground">
                      <FileImage className="w-5 h-5 text-primary" />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {imageFile ? imageFile.name : 'No file chosen'}
                    </span>
                  </div>
                </div>

                {/* Additional Gallery */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Gallery Images</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-xl hover:bg-muted/80 transition duration-200 text-sm cursor-pointer text-foreground">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      <span>Choose Files</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
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

              {/* Online Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="online_toggle"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary bg-background border-border"
                />
                <label htmlFor="online_toggle" className="text-sm font-medium text-foreground cursor-pointer">
                  Publish online immediately (Visible to customers)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition duration-200 cursor-pointer text-sm"
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
      )}
    </div>
  );
}
