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
  Edit
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
    <div className="p-6">
      {/* Top Navigation Sub-Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-2">
        <button
          onClick={() => router.push('/cms/banners')}
          className="px-5 py-2.5 font-semibold text-sm border-b-2 border-[var(--color-gold)] text-[var(--color-gold)] flex items-center gap-2 bg-white/5 rounded-t-lg"
        >
          <ImageIcon size={16} />
          <span>Header Banners & Slideshows</span>
        </button>
        <button
          onClick={() => router.push('/cms')}
          className="px-5 py-2.5 font-semibold text-sm text-gray-400 hover:text-white flex items-center gap-2 rounded-t-lg transition-colors"
        >
          <Layout size={16} />
          <span>Page Content & Layout Builder</span>
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Header Banners & Slideshows</h1>
          <p className="text-gray-400 text-sm">Upload and manage hero slideshow graphics for homepage and product categories</p>
        </div>
        <button 
          onClick={() => {
            setPageSlug('');
            setTitle('');
            setIsActive(true);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm"
        >
          <PlusCircle size={18} />
          Create Banner
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[var(--color-gold)]" size={32} />
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Primary Image</th>
                <th className="px-6 py-4 font-medium">Page Slug</th>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No banners found. Create one to get started.
                  </td>
                </tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      {banner.primary_image ? (
                        <div className="relative w-24 h-12 bg-white/10 rounded overflow-hidden">
                          <Image 
                            src={banner.primary_image} 
                            alt={banner.title || 'Banner'} 
                            fill 
                            sizes="96px"
                            className="object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-12 bg-white/10 rounded flex items-center justify-center text-gray-500">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[var(--color-gold)]">/{banner.page_slug}</td>
                    <td className="px-6 py-4">
                      {banner.title || '-'}
                      <div className="text-xs text-gray-500 mt-1">{banner.image_count} image(s)</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${banner.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(banner)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer mr-2"
                        title="Edit Banner Settings"
                      >
                        <Edit size={14} />
                        <span>Edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(banner.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">
                {pageSlug ? `Edit Banner (/${pageSlug})` : 'Create Page Banner'}
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form id="banner-modal-content" onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Page Slug *</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-white/5 border border-white/10 border-r-0 rounded-l-md text-gray-500">/</span>
                  <input
                    type="text"
                    required
                    value={pageSlug}
                    onChange={e => setPageSlug(e.target.value)}
                    placeholder="e.g. men, al-haramain, notes/woody"
                    className="w-full bg-[#121212] border border-white/10 rounded-r-md px-3 py-2 text-white outline-none focus:border-primary"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">This must match the URL slug exactly.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Alt Text</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-6 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Slides</h3>
                </div>
                
                {slides.map((slide, index) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-4 relative">
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSlides(slides.filter((_, i) => i !== index))}
                        className="absolute top-4 right-4 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    
                    <h4 className="text-sm font-medium text-gray-300">Slide {index + 1}</h4>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        {slide.existingImageUrl ? 'Desktop Media (Select to replace)' : 'Desktop Media (Image/Video)'}
                      </label>
                      {slide.existingImageUrl && (
                        <div className="mb-2 p-2 bg-black/40 rounded border border-white/10 flex items-center gap-3">
                          <div className="relative w-24 h-12 rounded overflow-hidden shrink-0 border border-white/10">
                            <Image src={slide.existingImageUrl} alt="Current Desktop" fill className="object-cover" />
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-[var(--color-gold)] block">Active Desktop Image</span>
                            <span className="text-[10px] text-gray-400 truncate block max-w-[220px]">{slide.existingImageUrl}</span>
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
                        className="w-full bg-[#121212] border border-white/10 rounded-md px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        {slide.existingMobileUrl ? 'Mobile Media (Select to replace)' : 'Mobile Media (Image/Video)'}
                      </label>
                      {slide.existingMobileUrl && (
                        <div className="mb-2 p-2 bg-black/40 rounded border border-white/10 flex items-center gap-3">
                          <div className="relative w-16 h-12 rounded overflow-hidden shrink-0 border border-white/10">
                            <Image src={slide.existingMobileUrl} alt="Current Mobile" fill className="object-cover" />
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-primary block">Active Mobile Image</span>
                            <span className="text-[10px] text-gray-400 truncate block max-w-[220px]">{slide.existingMobileUrl}</span>
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
                        className="w-full bg-[#121212] border border-white/10 rounded-md px-3 py-2 text-white text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Link URL (Optional)</label>
                      <input
                        type="text"
                        value={slide.linkUrl}
                        onChange={e => {
                          const newSlides = [...slides];
                          newSlides[index].linkUrl = e.target.value;
                          setSlides(newSlides);
                        }}
                        placeholder="e.g. /products/perfume-name"
                        className="w-full bg-[#121212] border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    setSlides([...slides, { imageFile: null, mobileImageFile: null, linkUrl: '' }]);
                    // Scroll to bottom of modal
                    setTimeout(() => {
                      const modal = document.getElementById('banner-modal-content');
                      if (modal) {
                        modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
                      }
                    }, 50);
                  }}
                  className="w-full py-3 border-2 border-dashed border-white/10 hover:border-primary/50 text-gray-400 hover:text-primary transition-colors rounded-lg flex items-center justify-center gap-2 font-medium"
                >
                  <PlusCircle size={18} />
                  Add Another Slide
                </button>
              </div>

              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">Active (Visible on site)</label>
              </div>

              <div className="flex justify-end gap-3 p-6 mt-6 border-t border-white/10 sticky bottom-0 bg-[#1a1a1a] z-10 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
