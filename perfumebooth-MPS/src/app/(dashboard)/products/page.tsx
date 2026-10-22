'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import CatalogImportModal from '@/components/products/CatalogImportModal';
import CatalogExportModal from '@/components/products/CatalogExportModal';
import BatchImageDropzone from '@/components/products/BatchImageDropzone';
import VariantManager, { VariantItem } from '@/components/products/VariantManager';
import ShippingSection, { ShippingValues } from '@/components/products/ShippingSection';
import ResizableTextarea from '@/components/ui/ResizableTextarea';
import { apiFetch, getApiBaseUrl, formatProductImageUrl } from '@/lib/api';
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
  FileDown,
  FileSpreadsheet,
  Wand2,
  Package,
  FolderPlus
} from 'lucide-react';

interface Product {
  brand: string;
  category: string;
  productType: string;
  id: string;
  title: string;
  slug: string;
  sku: string;
  barcode?: string;
  price: string;
  compare_at_price: string | null;
  image: string | null;
  images: { url: string; altText: string }[];
  variants?: VariantItem[];
  attributes: Record<string, any>;
  product_form?: string;
  bottle_material?: string;
  collections?: string[];
  stock: number;
  is_online: boolean;
  created_by_name?: string;
  updated_by_name?: string;
}

const PRESET_TEMPLATES = [
  {
    id: 'ROYAL_OUD',
    name: '👑 Royal Oud & Golden Amber',
    topNotes: 'Precious Rose, Saffron, Spiced Nutmeg',
    middleNotes: 'Patchouli, Amberwood, Cedar',
    baseNotes: 'Cambodian Oud, White Musk, Vanilla',
    scentProfile: 'Oud',
    category: 'Perfume',
    productType: 'Extrait de Parfum',
    productForm: 'Spray',
    gender: 'Unisex'
  },
  {
    id: 'FRESH_CITRUS',
    name: '🍋 Fresh Citrus & Marine Breeze',
    topNotes: 'Calabrian Bergamot, Sicilian Lemon, Mint',
    middleNotes: 'Sea Water Accord, Green Tea, Lavender',
    baseNotes: 'Cedarwood, Oakmoss, White Musk',
    scentProfile: 'Fresh',
    category: 'Perfume',
    productType: 'Eau de Parfum',
    productForm: 'Spray',
    gender: 'Men'
  },
  {
    id: 'FLORAL_ROSE',
    name: '🌹 Floral Rose & Cashmere Musk',
    topNotes: 'Damask Rose, Pink Pepper, Peach',
    middleNotes: 'Peony, Jasmine Sambac, Violet',
    baseNotes: 'Cashmere Wood, White Musk, Amber',
    scentProfile: 'Floral',
    category: 'Perfume',
    productType: 'Eau de Parfum',
    productForm: 'Spray',
    gender: 'Women'
  },
  {
    id: 'SPICY_ORIENTAL',
    name: '🕌 Spicy Oriental & Warm Cinnamon',
    topNotes: 'Cardamom, Cinnamon Bark, Bergamot',
    middleNotes: 'Clove, Nutmeg, Incense',
    baseNotes: 'Gold Amber, Tonka Bean, Vanilla',
    scentProfile: 'Spicy',
    category: 'Attar',
    productType: 'Attar/CPO',
    productForm: 'Oil',
    gender: 'Unisex'
  },
  {
    id: 'GOURMAND_VANILLA',
    name: '🍨 Sweet Gourmand & Vanilla Bean',
    topNotes: 'Sweet Almond, Roasted Coffee, Citrus',
    middleNotes: 'Bourbon Vanilla, Cocoa, Heliotrope',
    baseNotes: 'Sandalwood, Amber, White Musk',
    scentProfile: 'Fresh',
    category: 'Body Mist',
    productType: 'Eau de Toilette',
    productForm: 'Mist',
    gender: 'Women'
  }
];

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
  const [filterForm, setFilterForm] = useState(''); // Product form filter
  const [filterCollection, setFilterCollection] = useState(''); // Collection filter

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Scroll & Highlight Position Tracking
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);
  const scrollPosRef = useRef<number>(0);
  const lastWorkedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (highlightSlug) {
      const timer = setTimeout(() => {
        setHighlightSlug(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightSlug]);

  useEffect(() => {
    if (!modalOpen && !loading && (lastWorkedSlugRef.current || scrollPosRef.current > 0)) {
      const targetSlug = lastWorkedSlugRef.current;
      const targetY = scrollPosRef.current;

      let attempts = 0;
      const maxAttempts = 6;

      let timeoutId: any;
      const tryScroll = () => {
        if (targetSlug) {
          const el = document.getElementById(`product-row-${targetSlug}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastWorkedSlugRef.current = null;
            scrollPosRef.current = 0;
            return;
          }
        }
        attempts++;
        if (attempts < maxAttempts) {
          timeoutId = setTimeout(tryScroll, 100);
        } else {
          if (targetY > 0) {
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
          lastWorkedSlugRef.current = null;
          scrollPosRef.current = 0;
        }
      };

      timeoutId = setTimeout(tryScroll, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [modalOpen, loading, products]);

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
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
  const [productForm, setProductForm] = useState('Spray');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [collectionsInput, setCollectionsInput] = useState<string[]>([]);
  const [newCollectionText, setNewCollectionText] = useState('');
  const [availableCollections, setAvailableCollections] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [variantsList, setVariantsList] = useState<VariantItem[]>([]);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('price');
  const [bulkActionOption, setBulkActionOption] = useState('percent_discount');
  const [bulkActionValue, setBulkActionValue] = useState(0);
  const [noteOptions, setNoteOptions] = useState<string[]>(NOTE_OPTIONS);

  // Shipping State
  const [shippingData, setShippingData] = useState<ShippingValues>({
    isPhysical: true,
    packageType: 'Store default • Box - 10 × 12 × 15 cm, 0.5 kg',
    length: '10.0',
    width: '12.0',
    height: '15.0',
    sizeUnit: 'cm',
    weight: '0.5',
    weightUnit: 'kg',
    countryOfOrigin: 'India',
    hsCode: '3303.00.10',
  });

  // In-line cell editing state
  const [editingCell, setEditingCell] = useState<{ slug: string; field: 'price' | 'stock' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const handleApplyPresetTemplate = (templateId: string) => {
    const template = PRESET_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setTopNotes(template.topNotes);
    setMiddleNotes(template.middleNotes);
    setBaseNotes(template.baseNotes);
    setScentProfile(template.scentProfile);
    setCategory(template.category);
    setProductType(template.productType);
    if ((template as any).productForm) {
      setProductForm((template as any).productForm);
    }
    setGender(template.gender);
  };

  const handleSaveInlineCell = async (slug: string, field: 'price' | 'stock', value: string) => {
    try {
      const payload: any = {};
      if (field === 'price') {
        payload.price = value;
      } else {
        payload.stock_level = parseInt(value, 10) || 0;
      }

      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));

      await apiFetch(`/shop/products/${slug}/`, {
        method: 'PUT',
        body: fd,
      });

      setProducts((prev) =>
        prev.map((p) => {
          if (p.slug === slug) {
            if (field === 'price') return { ...p, price: value };
            if (field === 'stock') return { ...p, stock: parseInt(value, 10) || 0 };
          }
          return p;
        })
      );
      setHighlightSlug(slug);
    } catch (err) {
      console.error('Failed to save inline cell edit:', err);
    } finally {
      setEditingCell(null);
    }
  };

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

  const fetchCollections = async () => {
    try {
      const data = await apiFetch('/shop/collections/');
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setAvailableCollections(list.map((c: any) => ({
        id: c.id,
        title: c.title,
        slug: c.slug
      })));
    } catch (err: any) {
      console.error('Error fetching collections:', err);
    }
  };

  const handleAddCollection = (val?: string) => {
    const nameToAdd = (val || newCollectionText).trim();
    if (!nameToAdd) return;
    if (!collectionsInput.some(c => c.toLowerCase() === nameToAdd.toLowerCase())) {
      setCollectionsInput(prev => [...prev, nameToAdd]);
    }
    setNewCollectionText('');
  };

  const handleRemoveCollection = (nameToRemove: string) => {
    setCollectionsInput(prev => prev.filter(c => c.toLowerCase() !== nameToRemove.toLowerCase()));
  };

  const handleBulkAddToCollection = async () => {
    const colName = prompt(`Enter collection name to add ${selectedSlugs.length} selected products to (e.g. New Launches):`);
    if (!colName || !colName.trim()) return;
    try {
      const res = await apiFetch('/shop/products/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slugs: selectedSlugs,
          add_to_collection: colName.trim()
        })
      });
      alert(res.detail || `Added ${selectedSlugs.length} products to ${colName.trim()}.`);
      setSelectedSlugs([]);
      fetchProducts();
      fetchCollections();
    } catch (err: any) {
      alert(err.message || 'Failed to add products to collection.');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchBrands();
    fetchCollections();
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
    if (typeof window !== 'undefined') {
      scrollPosRef.current = window.scrollY;
    }
    lastWorkedSlugRef.current = product.slug;
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
    setProductForm(product.attributes.product_form || (product as any).product_form || 'Spray');
    const dupCollections = Array.isArray(product.attributes?.collections)
      ? [...product.attributes.collections]
      : Array.isArray(product.collections)
        ? [...product.collections]
        : [];
    setCollectionsInput(dupCollections);
    setNewCollectionText('');
    setMetaTitle(product.attributes.meta_title || '');
    setMetaDescription(product.attributes.meta_description || '');
    setImageAltText(product.attributes.image_alt_text || '');
    
    // Duplicate Shipping Data
    const dupShip = product.attributes.shipping || {};
    const dupWeight = dupShip.weight?.value ?? product.attributes.weight ?? '0.5';
    const cleanDupWeight = typeof dupWeight === 'string' ? dupWeight.replace(/[^0-9.]/g, '') : String(dupWeight);
    setShippingData({
      isPhysical: dupShip.is_physical !== undefined ? dupShip.is_physical : true,
      packageType: dupShip.package_type || 'Store default • Box - 10 × 12 × 15 cm, 0.5 kg',
      length: String(dupShip.dimensions?.length ?? '10.0'),
      width: String(dupShip.dimensions?.width ?? '12.0'),
      height: String(dupShip.dimensions?.height ?? '15.0'),
      sizeUnit: dupShip.dimensions?.unit || 'cm',
      weight: cleanDupWeight || '0.5',
      weightUnit: dupShip.weight?.unit || 'kg',
      countryOfOrigin: dupShip.customs?.country_of_origin || product.attributes.country_of_origin || 'India',
      hsCode: dupShip.customs?.hs_code || product.attributes.hs_code || '3303.00.10',
    });

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
    if (typeof window !== 'undefined') {
      scrollPosRef.current = window.scrollY;
    }
    lastWorkedSlugRef.current = null;
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
    setProductForm('Spray');
    setCollectionsInput([]);
    setNewCollectionText('');
    setMetaTitle('');
    setMetaDescription('');
    setImageAltText('');
    setBarcode('');
    setManualTags([]);
    setVariantsList([]);
    setShippingData({
      isPhysical: true,
      packageType: 'Store default • Box - 10 × 12 × 15 cm, 0.5 kg',
      length: '10.0',
      width: '12.0',
      height: '15.0',
      sizeUnit: 'cm',
      weight: '0.5',
      weightUnit: 'kg',
      countryOfOrigin: 'India',
      hsCode: '3303.00.10',
    });
    setImageFile(null);
    setGalleryFiles(null);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    if (typeof window !== 'undefined') {
      scrollPosRef.current = window.scrollY;
    }
    lastWorkedSlugRef.current = product.slug;
    setEditingProduct(product);
    setVariantsList(product.variants || []);
    setTitle(product.title);
    setSlug(product.slug);
    setSku(product.sku);
    setBarcode(product.barcode || product.attributes?.barcode || '');
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
    setProductForm(product.attributes.product_form || (product as any).product_form || 'Spray');
    const initialCollections = Array.isArray(product.attributes?.collections)
      ? [...product.attributes.collections]
      : Array.isArray(product.collections)
        ? [...product.collections]
        : [];
    setCollectionsInput(initialCollections);
    setNewCollectionText('');
    setMetaTitle(product.attributes.meta_title || '');
    setMetaDescription(product.attributes.meta_description || '');
    setImageAltText(product.attributes.image_alt_text || '');

    // Parse Shipping Data
    const ship = product.attributes.shipping || {};
    const weightVal = ship.weight?.value ?? product.attributes.weight ?? '0.5';
    const cleanWeight = typeof weightVal === 'string' ? weightVal.replace(/[^0-9.]/g, '') : String(weightVal);
    setShippingData({
      isPhysical: ship.is_physical !== undefined ? ship.is_physical : true,
      packageType: ship.package_type || 'Store default • Box - 10 × 12 × 15 cm, 0.5 kg',
      length: String(ship.dimensions?.length ?? '10.0'),
      width: String(ship.dimensions?.width ?? '12.0'),
      height: String(ship.dimensions?.height ?? '15.0'),
      sizeUnit: ship.dimensions?.unit || 'cm',
      weight: cleanWeight || '0.5',
      weightUnit: ship.weight?.unit || 'kg',
      countryOfOrigin: ship.customs?.country_of_origin || product.attributes.country_of_origin || 'India',
      hsCode: ship.customs?.hs_code || product.attributes.hs_code || '3303.00.10',
    });

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
    formData.append('barcode', barcode);
    formData.append('price', price);
    if (comparePrice) formData.append('compare_at_price', comparePrice);
    formData.append('description', description);
    formData.append('stock_level', stockLevel.toString());
    formData.append('is_online', isOnline.toString());

    // Save attributes as JSON payload
    const attributes = {
      barcode,
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
      product_form: productForm,
      collections: collectionsInput,
      meta_title: metaTitle,
      meta_description: metaDescription,
      image_alt_text: imageAltText,
      shipping: {
        is_physical: shippingData.isPhysical,
        package_type: shippingData.packageType,
        dimensions: {
          length: shippingData.length,
          width: shippingData.width,
          height: shippingData.height,
          unit: shippingData.sizeUnit,
        },
        weight: {
          value: shippingData.weight,
          unit: shippingData.weightUnit,
        },
        customs: {
          country_of_origin: shippingData.countryOfOrigin,
          hs_code: shippingData.hsCode,
        },
      },
      weight: shippingData.weight ? `${shippingData.weight} ${shippingData.weightUnit}` : '0.5 kg',
      country_of_origin: shippingData.countryOfOrigin,
      hs_code: shippingData.hsCode
    };
    formData.append('attributes', JSON.stringify(attributes));

    formData.append('variants', JSON.stringify(variantsList || []));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    if (galleryFiles) {
      for (let i = 0; i < galleryFiles.length; i++) {
        formData.append('gallery', galleryFiles[i]);
      }
    }

    try {
      let savedProductData: any = null;
      if (editingProduct) {
        savedProductData = await apiFetch(`/shop/products/${editingProduct.slug}/`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        savedProductData = await apiFetch('/shop/products/', {
          method: 'POST',
          body: formData,
        });
      }
      const savedSlug = savedProductData?.slug || slug || editingProduct?.slug || null;
      if (savedSlug) {
        lastWorkedSlugRef.current = savedSlug;
        setHighlightSlug(savedSlug);
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

  const productList = Array.isArray(products) ? products : [];
  const filteredProducts = productList.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = !filterBrand || p.brand === filterBrand;
    const matchesStatus = !filterStatus ||
      (filterStatus === 'online' && p.is_online) ||
      (filterStatus === 'offline' && !p.is_online);
    const matchesStock = !filterStock ||
      (filterStock === 'instock' && p.stock > 0) ||
      (filterStock === 'outofstock' && p.stock === 0);
    const matchesForm = !filterForm ||
      (p.attributes?.product_form || (p as any).product_form || '').toLowerCase() === filterForm.toLowerCase();
    const matchesCollection = !filterCollection || (
      Array.isArray(p.attributes?.collections) && p.attributes.collections.some((c: string) => c.toLowerCase() === filterCollection.toLowerCase())
    ) || (
      Array.isArray((p as any).collections) && (p as any).collections.some((c: string) => c.toLowerCase() === filterCollection.toLowerCase())
    );
    return matchesSearch && matchesBrand && matchesStatus && matchesStock && matchesForm && matchesCollection;
  });

  if (modalOpen) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-3 neu-btn rounded-2xl transition duration-200 cursor-pointer text-muted-foreground hover:text-foreground"
            title="Close"
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
          <div className="p-4 rounded-2xl neu-inset bg-red-500/10 border border-red-500/20 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="bg-card neu-extruded-lg p-8 rounded-3xl border border-border/10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* 1-Click Preset Scent Template Selector */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-5 neu-inset rounded-2xl border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl neu-extruded-sm flex items-center justify-center text-primary flex-shrink-0">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">Preset Scent Templates</span>
                  <span className="text-[11px] text-muted-foreground">Select a fragrance family to auto-fill Top/Heart/Base notes, accords & gender in 1 click</span>
                </div>
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value) handleApplyPresetTemplate(e.target.value);
                }}
                className="w-full md:w-auto px-4 py-2.5 neu-input rounded-xl text-xs font-bold text-foreground cursor-pointer transition"
              >
                <option value="">-- Apply Preset Fragrance Template --</option>
                {PRESET_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
                />
              </div>

              {/* Barcode (ISBN, UPC, GTIN) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  <span>Barcode</span>
                  <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">(ISBN, UPC, GTIN)</span>
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
                />
              </div>

              {/* Liquid Volume */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Liquid Volume</label>
                <select
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const newName = prompt(`Enter new name for brand "${brand}":`, brand);
                          if (!newName || newName.trim() === '' || newName.trim() === brand) return;
                          try {
                            await apiFetch(`/shop/brands/`, {
                              method: 'PUT',
                              body: JSON.stringify({ old_brand: brand, new_brand: newName.trim() }),
                              headers: { 'Content-Type': 'application/json' }
                            });
                            alert(`Brand "${brand}" renamed to "${newName.trim()}" successfully.`);
                            setBrand(newName.trim());
                            fetchBrands();
                          } catch (err: any) {
                            alert(err.message || 'Failed to update brand.');
                          }
                        }}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer uppercase tracking-wider"
                      >
                        Edit Brand
                      </button>
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
                    </div>
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
                    className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                      className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
                >
                  <option value="Glass">Glass</option>
                  <option value="Premium Frosted Glass">Premium Frosted Glass</option>
                  <option value="Crystal">Crystal</option>
                  <option value="Metal-shielded Glass">Metal-shielded Glass</option>
                  <option value="Recycled Glass">Recycled Glass</option>
                </select>
              </div>

              {/* Product Form */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Product Form</label>
                <select
                  value={productForm}
                  onChange={(e) => setProductForm(e.target.value)}
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
                >
                  <option value="Spray">Spray</option>
                  <option value="Liquid">Liquid</option>
                  <option value="Roll-on">Roll-on</option>
                  <option value="Oil">Oil / CPO</option>
                  <option value="Solid">Solid</option>
                  <option value="Mist">Mist</option>
                  <option value="Cream">Cream</option>
                  <option value="Balm">Balm</option>
                  <option value="Stick">Stick</option>
                  <option value="Gel">Gel</option>
                  <option value="Aerosol">Aerosol</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                <select
                  value={isOnline ? 'Published' : 'Draft'}
                  onChange={(e) => setIsOnline(e.target.value === 'Published')}
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl neu-inset-sm text-xs font-semibold text-primary transition-all duration-200"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl neu-inset-sm text-xs font-semibold text-primary transition-all duration-200"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl neu-inset-sm text-xs font-semibold text-primary transition-all duration-200"
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
                  className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
                />
              </div>

              {/* Manual Collections Assignment */}
              <div className="flex flex-col gap-2.5 md:col-span-2 pt-2 border-t border-border/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <FolderPlus className="w-3.5 h-3.5 text-primary" />
                    <span>Collections (Add Manually)</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground/70">
                    e.g. New Launches, Trending Perfumes, Best Sellers
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={newCollectionText}
                      onChange={(e) => setNewCollectionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCollection();
                        }
                      }}
                      placeholder="Type collection name (e.g. New Launches) and press Add or Enter..."
                      className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60"
                    />
                  </div>

                  {availableCollections.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          handleAddCollection(val);
                        }
                      }}
                      className="w-48 sm:w-52 flex-shrink-0 px-3.5 py-2.5 neu-input rounded-2xl text-xs text-foreground cursor-pointer bg-card font-medium"
                    >
                      <option value="">+ Existing Collection</option>
                      {availableCollections.map((col) => (
                        <option key={col.id || col.slug} value={col.title}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAddCollection()}
                    className="flex-shrink-0 px-5 py-2.5 neu-btn text-primary font-bold rounded-2xl text-xs cursor-pointer hover:text-foreground transition whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Collections Badges */}
                {collectionsInput.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {collectionsInput.map((colName) => (
                      <span
                        key={colName}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl neu-inset-sm text-xs font-semibold text-emerald-800 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                      >
                        <span>📁 {colName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCollection(colName)}
                          className="hover:text-red-400 focus:outline-none cursor-pointer transition"
                          title={`Remove from ${colName}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70 italic">
                    No collections assigned yet. Type a collection name above or pick from existing collections to add this fragrance manually.
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <ResizableTextarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description..."
                rows={4}
                minHeight={80}
              />
            </div>

            {/* Product variant manager */}
            <VariantManager
              baseSku={sku}
              basePrice={price}
              baseComparePrice={comparePrice}
              baseStock={stockLevel}
              initialVariants={variantsList}
              onChange={(updated) => setVariantsList(updated)}
            />

            {/* Shipping Features Component */}
            <ShippingSection
              values={shippingData}
              onChange={(updated) => setShippingData((prev) => ({ ...prev, ...updated }))}
            />

            {/* Batch Image Dropzone Component */}
            <BatchImageDropzone
              productTitle={title}
              initialFeaturedUrl={editingProduct ? formatProductImageUrl(editingProduct.image || editingProduct.images?.[0]?.url) : null}
              initialGalleryUrls={(() => {
                if (!editingProduct) return [];
                const allUrls = (editingProduct.images || [])
                  .map((img: any) => formatProductImageUrl(img.url))
                  .filter((u): u is string => Boolean(u));
                const mainUrl = formatProductImageUrl(editingProduct.image || editingProduct.images?.[0]?.url);
                // If first image is the main image, take all remaining images as featured
                if (allUrls.length > 0 && (allUrls[0] === mainUrl || (mainUrl && allUrls[0].includes(mainUrl.split('/').pop()?.split('_')[0] || '___')))) {
                  return allUrls.slice(1);
                }
                return allUrls.filter((url) => url !== mainUrl);
              })()}
              onFeaturedFileChange={(file) => setImageFile(file)}
              onGalleryFilesChange={(files) => {
                const dt = new DataTransfer();
                files.forEach((f) => dt.items.add(f));
                setGalleryFiles(dt.files);
              }}
            />

            {/* Search Engine Listing Preview */}
            <div className="border-t border-border/40 pt-6 flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold text-foreground">Search engine listing</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add a title and description to see how this product might appear in a search engine listing.
                </p>
              </div>

              {/* Real-time Google Search Snippet Preview */}
              <div className="p-5 neu-inset rounded-2xl flex flex-col gap-1 max-w-2xl border border-border/20">
                <span className="text-[12px] text-emerald-800 dark:text-emerald-400 font-normal truncate block">
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
                    className="w-full px-4 py-2.5 neu-input rounded-2xl text-sm text-foreground"
                  />
                </div>

                {/* Meta Description */}
                <div className="flex flex-col gap-1.5">
                  <ResizableTextarea
                    label="Meta Description"
                    maxLength={320}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder={description || "e.g. Discover our premium scent crafted for longevity..."}
                    rows={3}
                    minHeight={70}
                    helpText={`${metaDescription.length} of 320 characters`}
                  />
                </div>
                
              </div>
            </div>



            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/30">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-6 py-2.5 neu-btn text-foreground font-semibold rounded-2xl cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="flex items-center gap-2 px-7 py-2.5 neu-btn-primary font-semibold rounded-2xl cursor-pointer text-sm disabled:opacity-50"
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
      const res = await fetch(`${getApiBaseUrl()}/shop/products/excel-export/`, {
        method: 'GET',
        credentials: 'include',
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Products</h1>
            <span className="text-xs font-bold text-primary neu-inset-sm px-3.5 py-1 rounded-full uppercase tracking-wider">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Manage store catalog, pricing, inventory, and media assets</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          {selectedSlugs.length > 0 && (
            <>
              <button
                onClick={() => handleBulkStatusChange(true)}
                className="flex items-center gap-2 px-4 py-2.5 neu-btn text-emerald-800 dark:text-emerald-400 font-semibold rounded-2xl cursor-pointer text-sm"
              >
                <Check className="w-4 h-4" />
                <span>Publish ({selectedSlugs.length})</span>
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                className="flex items-center gap-2 px-4 py-2.5 neu-btn text-zinc-600 dark:text-zinc-400 font-semibold rounded-2xl cursor-pointer text-sm"
              >
                <X className="w-4 h-4" />
                <span>Unpublish ({selectedSlugs.length})</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2.5 neu-btn text-red-500 font-semibold rounded-2xl cursor-pointer text-sm"
              >
                <Trash2 className="w-4 h-4" />
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
                className="flex items-center gap-2 px-4 py-2.5 neu-btn text-primary font-semibold rounded-2xl cursor-pointer text-sm"
              >
                <span>Bulk Adjust ({selectedSlugs.length})</span>
              </button>
              <button
                type="button"
                onClick={handleBulkAddToCollection}
                className="flex items-center gap-2 px-4 py-2.5 neu-btn text-emerald-500 font-semibold rounded-2xl cursor-pointer text-sm"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Add to Collection ({selectedSlugs.length})</span>
              </button>
            </>
          )}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 neu-btn font-semibold rounded-2xl cursor-pointer text-sm"
          >
            <FileDown className="w-4 h-4 text-primary" />
            <span>Import</span>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 neu-btn font-semibold rounded-2xl cursor-pointer text-sm"
          >
            <FileUp className="w-4 h-4 text-primary" />
            <span>Export</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-semibold rounded-2xl cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add product</span>
          </button>
        </div>
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
            placeholder="Search by title or SKU..."
            className="w-full pl-11 pr-4 py-2.5 neu-input rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        
        {/* Dropdown Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Brand Filter */}
          <div className="flex items-center gap-2 neu-inset-sm px-3.5 py-2 rounded-2xl border border-border/20">
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
          <div className="flex items-center gap-2 neu-inset-sm px-3.5 py-2 rounded-2xl border border-border/20">
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
          <div className="flex items-center gap-2 neu-inset-sm px-3.5 py-2 rounded-2xl border border-border/20">
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

          {/* Product Form Filter */}
          <div className="flex items-center gap-2 neu-inset-sm px-3.5 py-2 rounded-2xl border border-border/20">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Form</span>
            <select
              value={filterForm}
              onChange={(e) => setFilterForm(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="" className="bg-card text-foreground">All Forms</option>
              <option value="Spray" className="bg-card text-foreground">Spray</option>
              <option value="Liquid" className="bg-card text-foreground">Liquid</option>
              <option value="Roll-on" className="bg-card text-foreground">Roll-on</option>
              <option value="Oil" className="bg-card text-foreground">Oil</option>
              <option value="Solid" className="bg-card text-foreground">Solid</option>
              <option value="Mist" className="bg-card text-foreground">Mist</option>
              <option value="Cream" className="bg-card text-foreground">Cream</option>
              <option value="Stick" className="bg-card text-foreground">Stick</option>
              <option value="Gel" className="bg-card text-foreground">Gel</option>
            </select>
          </div>

          {/* Collection Filter */}
          <div className="flex items-center gap-2 neu-inset-sm px-3.5 py-2 rounded-2xl border border-border/20">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Collection</span>
            <select
              value={filterCollection}
              onChange={(e) => setFilterCollection(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="" className="bg-card text-foreground">All Collections</option>
              {availableCollections.map((col) => (
                <option key={col.id || col.slug} value={col.title} className="bg-card text-foreground">
                  {col.title}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(filterBrand || filterStatus || filterStock || filterForm || filterCollection) && (
            <button
              onClick={() => {
                setFilterBrand('');
                setFilterStatus('');
                setFilterStock('');
                setFilterForm('');
                setFilterCollection('');
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
        <div className="bg-card neu-extruded rounded-3xl overflow-hidden border border-border/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground font-bold text-xs uppercase tracking-wider">
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
              <tbody className="divide-y divide-border/20">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-muted-foreground font-medium">
                      No products found. Add your first item!
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isHighlighted = highlightSlug === product.slug;
                    return (
                      <tr
                        key={product.id}
                        id={`product-row-${product.slug}`}
                        className={`transition-all duration-700 ${
                          isHighlighted
                            ? 'bg-primary/15 ring-2 ring-primary ring-inset shadow-md'
                            : 'hover:bg-primary/[0.03]'
                        }`}
                      >
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
                        {(() => {
                          const displayUrl = formatProductImageUrl(product.image || product.images?.[0]?.url);
                          if (!displayUrl) {
                            return (
                              <div className="w-12 h-12 rounded-xl neu-inset-sm flex items-center justify-center text-muted-foreground border border-border/20">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            );
                          }
                          const isVideo = ['mp4', 'webm', 'mov', 'ogg', 'm4v'].some(ext => displayUrl.toLowerCase().endsWith('.' + ext));
                          return isVideo ? (
                            <video
                              src={displayUrl}
                              className="w-12 h-12 object-cover rounded-xl neu-extruded-sm border border-border/20 bg-black"
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={displayUrl}
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded-xl neu-extruded-sm border border-border/20 bg-black"
                            />
                          );
                        })()}
                      </td>
                      <td className="p-5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="font-bold text-foreground hover:text-primary transition text-left cursor-pointer hover:underline block"
                        >
                          {product.title}
                        </button>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{product.sku}</span>
                          {(product.barcode || product.attributes?.barcode) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono neu-inset-sm text-foreground/80 border border-border/30" title="Barcode">
                              {product.barcode || product.attributes?.barcode}
                            </span>
                          )}
                          {(product.attributes?.product_form || (product as any).product_form) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium neu-inset-sm text-indigo-500 border border-indigo-500/20" title="Product Form">
                              {product.attributes?.product_form || (product as any).product_form}
                            </span>
                          )}
                          {((product.attributes?.collections || (product as any).collections) as string[] | undefined)?.map((col) => (
                            <span
                              key={col}
                              className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium neu-inset-sm text-emerald-800 dark:text-emerald-400 border border-emerald-500/20"
                              title={`Collection: ${col}`}
                            >
                              📁 {col}
                            </span>
                          ))}
                          {product.attributes?.shipping?.is_physical === false ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium neu-inset-sm text-muted-foreground border border-border/30">
                              Digital
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium neu-inset-sm text-primary border border-primary/20">
                              <Package className="w-2.5 h-2.5" />
                              {product.attributes?.shipping?.weight?.value
                                ? `${product.attributes.shipping.weight.value} ${product.attributes.shipping.weight.unit || 'kg'}`
                                : (product.attributes?.weight ? (String(product.attributes.weight).includes('kg') ? product.attributes.weight : `${product.attributes.weight} kg`) : '0.5 kg')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-foreground">{product.brand}</div>
                      </td>
                      {/* Price Cell (In-Line Editable) */}
                      <td className="p-5">
                        {editingCell?.slug === product.slug && editingCell?.field === 'price' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-muted-foreground">₹</span>
                            <input
                              type="number"
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInlineCell(product.slug, 'price', editingValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => handleSaveInlineCell(product.slug, 'price', editingValue)}
                              className="w-24 px-2 py-1 neu-input rounded-xl text-xs font-bold text-foreground"
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCell({ slug: product.slug, field: 'price' });
                              setEditingValue(product.price);
                            }}
                            title="Click to quick-edit price"
                            className="cursor-pointer group flex flex-col"
                          >
                            <div className="text-foreground font-bold flex items-center gap-1 group-hover:text-primary transition">
                              <span>₹{parseFloat(product.price).toLocaleString('en-IN')}</span>
                              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-muted-foreground" />
                            </div>
                            {product.compare_at_price && (
                              <div className="text-xs text-muted-foreground line-through mt-0.5 font-medium">
                                ₹{parseFloat(product.compare_at_price).toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Stock Cell (In-Line Editable) */}
                      <td className="p-5">
                        {editingCell?.slug === product.slug && editingCell?.field === 'stock' ? (
                          <input
                            type="number"
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineCell(product.slug, 'stock', editingValue);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={() => handleSaveInlineCell(product.slug, 'stock', editingValue)}
                            className="w-20 px-2 py-1 neu-input rounded-xl text-xs font-bold text-foreground"
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCell({ slug: product.slug, field: 'stock' });
                              setEditingValue(String(product.stock));
                            }}
                            title="Click to quick-edit stock level"
                            className="cursor-pointer group inline-flex items-center gap-1"
                          >
                            {product.stock === 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-red-500 dark:text-red-300 neu-inset-sm rounded-full border border-red-500/30 bg-red-500/5">
                                Out of Stock
                              </span>
                            ) : product.stock <= 10 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-amber-500 dark:text-amber-300 neu-inset-sm rounded-full border border-amber-500/30 bg-amber-500/5">
                                Low Stock: {product.stock} units
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 neu-inset-sm rounded-full border border-emerald-500/30 bg-emerald-500/5">
                                {product.stock}
                              </span>
                            )}
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-muted-foreground ml-0.5" />
                          </div>
                        )}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold neu-inset-sm ${product.is_online
                          ? 'text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 bg-emerald-500/5'
                          : 'text-zinc-500 dark:text-zinc-400 border border-border/30'
                          }`}>
                          {product.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col text-xs gap-0.5">
                          <span className="text-foreground font-bold text-[10px]">
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
                            className="w-8 h-8 neu-btn text-muted-foreground hover:text-foreground rounded-xl flex items-center justify-center cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.slug)}
                            title="Delete Product"
                            className="w-8 h-8 neu-btn text-red-500 hover:text-red-400 rounded-xl flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card neu-extruded-lg border border-border/20 p-7 rounded-3xl w-full max-w-md shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in duration-150">
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">Bulk Edit Products ({selectedSlugs.length})</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Apply bulk updates to pricing or inventory levels.</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Action Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2 neu-inset-sm p-1.5 rounded-2xl border border-border/20">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkActionType('price');
                      setBulkActionOption('percent_discount');
                      setBulkActionValue(10);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition ${bulkActionType === 'price' ? 'neu-btn-primary' : 'text-muted-foreground hover:text-foreground'}`}
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
                    className={`py-2 text-xs font-bold rounded-xl transition ${bulkActionType === 'stock' ? 'neu-btn-primary' : 'text-muted-foreground hover:text-foreground'}`}
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
                  className="w-full px-3.5 py-2.5 neu-input rounded-2xl text-xs text-foreground font-semibold cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 neu-input rounded-2xl text-xs text-foreground font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/30 pt-4">
              <button
                type="button"
                onClick={() => setBulkEditOpen(false)}
                className="px-5 py-2.5 neu-btn text-foreground font-semibold rounded-2xl transition text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkAdjust}
                className="px-5 py-2.5 neu-btn-primary font-semibold rounded-2xl transition text-xs cursor-pointer"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog import and export modals */}
      <CatalogImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchProducts();
          fetchBrands();
        }}
      />

      <CatalogExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        products={products}
        selectedSlugs={selectedSlugs}
      />
    </div>
  );
}
