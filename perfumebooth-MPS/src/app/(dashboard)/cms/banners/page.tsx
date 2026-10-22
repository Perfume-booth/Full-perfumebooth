'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { 
  Loader2, 
  Trash2, 
  PlusCircle,
  Save,
  ImageIcon,
  Layout,
  Edit,
  Folder
} from 'lucide-react';
import Image from 'next/image';

interface BannerImage {
  id: string;
  image_url: string;
  mobile_image_url: string | null;
  sort_order: number;
  link_url: string;
}

interface PageBanner {
  id: string;
  page_slug: string;
  title: string;
  is_active: boolean;
  image_count: number;
  primary_image: string | null;
  images?: BannerImage[];
}

export default function BannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [loading, setLoading] = useState(true);

  // New Banner Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageSlug, setPageSlug] = useState('');
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  interface SlideInput {
    id?: string;
    existingImageUrl?: string | null;
    existingMobileUrl?: string | null;
    imageFile: File | null;
    mobileImageFile: File | null;
    linkUrl: string;
  }
  const [slides, setSlides] = useState<SlideInput[]>([{ imageFile: null, mobileImageFile: null, linkUrl: '' }]);
  const [saving, setSaving] = useState(false);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/shop/banners/');
      setBanners(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entire banner and ALL its images?')) return;
    try {
      await apiFetch(`/shop/banners/delete/${id}/`, { method: 'DELETE' });
      setBanners(banners.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete banner');
    }
  };

  const handleDeleteImage = async (bannerId: string, imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await apiFetch(`/shop/banners/image/delete/${imageId}/`, { method: 'DELETE' });
      fetchBanners(); // Refresh to get updated images list
    } catch (err) {
      console.error(err);
      alert('Failed to delete image');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      for (const slide of slides) {
        if (!slide.imageFile && !slide.mobileImageFile && !slide.linkUrl && !slide.existingImageUrl && slides.length > 1) {
            continue; // Skip empty slides
        }

        const formData = new FormData();
        formData.append('page_slug', pageSlug);
        formData.append('title', title);
        formData.append('is_active', isActive ? 'true' : 'false');
        
        if (slide.id) formData.append('slide_id', slide.id);
        if (slide.imageFile) formData.append('image', slide.imageFile);
        if (slide.mobileImageFile) formData.append('mobile_image', slide.mobileImageFile);
        if (slide.linkUrl) formData.append('link_url', slide.linkUrl);

        await apiFetch('/shop/banners/', {
          method: 'POST',
          body: formData
        });
      }

      setIsModalOpen(false);
      setPageSlug('');
      setTitle('');
      setSlides([{ imageFile: null, mobileImageFile: null, linkUrl: '' }]);
      fetchBanners();
    } catch (err) {
      console.error(err);
      alert('Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const openAddImageModal = (banner: PageBanner) => {
    setPageSlug(banner.page_slug);
    setTitle(banner.title);
    setIsActive(banner.is_active);
    setIsModalOpen(true);
  };

  const openEditModal = (banner: PageBanner) => {
    setPageSlug(banner.page_slug);
    setTitle(banner.title || '');
    setIsActive(banner.is_active);
    if (banner.images && banner.images.length > 0) {
      setSlides(banner.images.map(img => ({
        id: img.id,
        existingImageUrl: img.image_url,
        existingMobileUrl: img.mobile_image_url,
        imageFile: null,
        mobileImageFile: null,
        linkUrl: img.link_url || ''
      })));
    } else {
      setSlides([{ imageFile: null, mobileImageFile: null, linkUrl: '' }]);
    }
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      {/* Top Navigation Sub-Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/cms')}
          className="px-5 py-2.5 font-bold text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-2xl neu-btn transition-colors cursor-pointer"
        >
          <Layout className="w-4 h-4" />
          <span>Info Pages Content Editor</span>
        </button>
        <button
          onClick={() => router.push('/cms/banners')}
          className="px-5 py-2.5 font-bold text-xs neu-inset-sm text-primary flex items-center gap-2 rounded-2xl"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Header Banners & Slideshows</span>
        </button>
        <button
          onClick={() => router.push('/cms/media')}
          className="px-5 py-2.5 font-bold text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-2xl neu-btn transition-colors cursor-pointer"
        >
          <Folder className="w-4 h-4" />
          <span>Media Library & Folders</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Header Banners & Slideshows</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold neu-inset-sm text-primary">
              Media
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Upload and manage hero slideshow graphics for homepage and product categories</p>
        </div>
        <button 
          onClick={() => {
            setPageSlug('');
            setTitle('');
            setIsActive(true);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 neu-btn-primary px-5 py-2.5 rounded-2xl font-bold transition-opacity cursor-pointer text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Banner</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-primary">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="bg-card neu-extruded border border-border/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/20 text-muted-foreground text-xs uppercase font-bold tracking-wider border-b border-border/30">
              <tr>
                <th className="px-6 py-4 font-bold">Primary Image</th>
                <th className="px-6 py-4 font-bold">Page Slug</th>
                <th className="px-6 py-4 font-bold">Title</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground font-semibold">
                    No banners found. Create one to get started.
                  </td>
                </tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-muted/10 transition">
                    <td className="px-6 py-4">
                      {banner.primary_image ? (
                        <div className="relative w-24 h-12 neu-inset-sm rounded-xl overflow-hidden p-0.5">
                          <Image 
                            src={banner.primary_image} 
                            alt={banner.title || 'Banner'} 
                            fill 
                            sizes="96px"
                            className="object-contain p-0.5 rounded-lg" 
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-12 neu-inset-sm rounded-xl flex items-center justify-center text-muted-foreground/40">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-primary text-xs">/{banner.page_slug}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-foreground text-sm">{banner.title || '-'}</span>
                      <div className="text-xs text-muted-foreground mt-0.5 font-medium">{banner.image_count} image(s)</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold neu-inset-sm ${banner.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(banner)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn text-foreground rounded-xl text-xs font-bold transition duration-200 cursor-pointer mr-2"
                        title="Edit Banner Settings"
                      >
                        <Edit size={14} />
                        <span>Edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(banner.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn text-muted-foreground hover:text-red-500 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card neu-extruded border border-border/10 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border/30 shrink-0 bg-muted/20">
              <h2 className="text-xl font-extrabold text-foreground">
                {pageSlug ? `Edit Banner (/${pageSlug})` : 'Create Page Banner'}
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form id="banner-modal-content" onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Page Slug *</label>
                <div className="flex items-center neu-input rounded-2xl overflow-hidden">
                  <span className="px-3.5 py-2.5 bg-muted/40 font-bold text-muted-foreground border-r border-border/30">/</span>
                  <input
                    type="text"
                    required
                    value={pageSlug}
                    onChange={e => setPageSlug(e.target.value)}
                    placeholder="e.g. men, al-haramain, notes/woody"
                    className="w-full bg-transparent px-3.5 py-2.5 text-foreground outline-none text-sm font-bold"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">This must match the URL slug exactly.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Alt Text</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full neu-input rounded-2xl px-4 py-2.5 text-foreground outline-none text-sm font-medium"
                />
              </div>

              <div className="space-y-6 pt-4 border-t border-border/30">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-extrabold text-foreground">Slides</h3>
                </div>
                
                {slides.map((slide, index) => (
                  <div key={index} className="p-5 neu-inset rounded-2xl space-y-4 relative">
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSlides(slides.filter((_, i) => i !== index))}
                        className="absolute top-4 right-4 neu-btn p-1.5 rounded-xl text-muted-foreground hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    
                    <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Slide {index + 1}</h4>
                    
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {slide.existingImageUrl ? 'Desktop Media (Select to replace)' : 'Desktop Media (Image/Video)'}
                      </label>
                      {slide.existingImageUrl && (
                        <div className="mb-2 p-2 neu-inset-sm rounded-xl flex items-center gap-3">
                          <div className="relative w-24 h-12 rounded-lg overflow-hidden shrink-0 bg-muted/30">
                            <Image src={slide.existingImageUrl} alt="Current Desktop" fill className="object-contain p-0.5" />
                          </div>
                          <div className="text-xs">
                            <span className="font-bold text-primary block">Active Desktop Image</span>
                            <span className="text-[10px] text-muted-foreground truncate block max-w-[220px] font-medium">{slide.existingImageUrl}</span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={e => {
                          const newSlides = [...slides];
                          newSlides[index].imageFile = e.target.files?.[0] || null;
                          setSlides(newSlides);
                        }}
                        className="w-full neu-input rounded-xl px-3 py-2 text-foreground text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {slide.existingMobileUrl ? 'Mobile Media (Select to replace)' : 'Mobile Media (Image/Video)'}
                      </label>
                      {slide.existingMobileUrl && (
                        <div className="mb-2 p-2 neu-inset-sm rounded-xl flex items-center gap-3">
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-muted/30">
                            <Image src={slide.existingMobileUrl} alt="Current Mobile" fill className="object-contain p-0.5" />
                          </div>
                          <div className="text-xs">
                            <span className="font-bold text-primary block">Active Mobile Image</span>
                            <span className="text-[10px] text-muted-foreground truncate block max-w-[220px] font-medium">{slide.existingMobileUrl}</span>
                          </div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={e => {
                          const newSlides = [...slides];
                          newSlides[index].mobileImageFile = e.target.files?.[0] || null;
                          setSlides(newSlides);
                        }}
                        className="w-full neu-input rounded-xl px-3 py-2 text-foreground text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Link URL (Optional)</label>
                      <input
                        type="text"
                        value={slide.linkUrl}
                        onChange={e => {
                          const newSlides = [...slides];
                          newSlides[index].linkUrl = e.target.value;
                          setSlides(newSlides);
                        }}
                        placeholder="e.g. /products/perfume-name"
                        className="w-full neu-input rounded-xl px-3 py-2 text-foreground outline-none text-xs font-medium"
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    setSlides([...slides, { imageFile: null, mobileImageFile: null, linkUrl: '' }]);
                    setTimeout(() => {
                      const modal = document.getElementById('banner-modal-content');
                      if (modal) {
                        modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
                      }
                    }, 50);
                  }}
                  className="w-full py-3 neu-btn text-muted-foreground hover:text-foreground rounded-2xl flex items-center justify-center gap-2 font-bold text-xs cursor-pointer"
                >
                  <PlusCircle size={16} />
                  <span>Add Another Slide</span>
                </button>
              </div>

              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="mr-2.5 w-4 h-4 rounded text-primary"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-foreground cursor-pointer">Active (Visible on site)</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 neu-btn text-muted-foreground hover:text-foreground rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 neu-btn-primary rounded-2xl font-bold text-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>Save Banner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
