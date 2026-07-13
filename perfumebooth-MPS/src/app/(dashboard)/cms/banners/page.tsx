'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  Loader2, 
  Trash2, 
  PlusCircle,
  Save,
  ImageIcon,
  Image as ImageIconSolid,
  ChevronDown,
  ChevronUp
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
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBannerId, setExpandedBannerId] = useState<string | null>(null);

  // New Banner Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageSlug, setPageSlug] = useState('');
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  interface SlideInput {
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
        if (!slide.imageFile && !slide.mobileImageFile && !slide.linkUrl && slides.length > 1) {
            continue; // Skip empty slides
        }

        const formData = new FormData();
        formData.append('page_slug', pageSlug);
        formData.append('title', title);
        formData.append('is_active', isActive ? 'true' : 'false');
        
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Page Banners</h1>
          <p className="text-gray-400 text-sm">Manage header banners and slideshows for specific page slugs</p>
        </div>
        <button 
          onClick={() => {
            setPageSlug('');
            setTitle('');
            setIsActive(true);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-semibold hover:opacity-90 transition-opacity"
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
                <th className="px-6 py-4 font-medium w-10"></th>
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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No banners found. Create one to get started.
                  </td>
                </tr>
              ) : (
                banners.map((banner) => (
                  <React.Fragment key={banner.id}>
                    <tr className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setExpandedBannerId(expandedBannerId === banner.id ? null : banner.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          {expandedBannerId === banner.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {banner.primary_image ? (
                          <div className="relative w-24 h-12 bg-white/10 rounded overflow-hidden">
                            <Image 
                              src={banner.primary_image} 
                              alt={banner.title} 
                              fill 
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
                          onClick={() => openAddImageModal(banner)}
                          className="text-primary hover:text-primary/80 p-2 mr-2"
                          title="Add Image to Banner"
                        >
                          <ImageIconSolid size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(banner.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                          title="Delete Banner"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                    {expandedBannerId === banner.id && (
                      <tr className="bg-white/5 border-t-0">
                        <td colSpan={6} className="px-12 py-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {banner.images?.map((img, index) => (
                              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-white/10 bg-[#1a1a1a]">
                                <div className="aspect-[21/9] relative">
                                  <Image 
                                    src={img.image_url} 
                                    alt={`Banner ${index + 1}`} 
                                    fill 
                                    className="object-cover"
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    onClick={() => handleDeleteImage(banner.id, img.id)}
                                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                                    title="Delete Image"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                {img.link_url && (
                                  <div className="p-2 text-xs text-gray-400 truncate">
                                    Link: {img.link_url}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div 
                              onClick={() => openAddImageModal(banner)}
                              className="aspect-[21/9] rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                            >
                              <PlusCircle size={24} className="mb-2" />
                              <span className="text-sm">Add Image</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
              <h2 className="text-xl font-bold text-white">Create Page Banner & Add Image</h2>
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
                <label className="block text-sm text-gray-400 mb-1">Internal Title</label>
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
                      <label className="block text-sm text-gray-400 mb-1">Desktop Media (Image/Video) (Optional)</label>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={e => {
                          const newSlides = [...slides];
                          newSlides[index].imageFile = e.target.files?.[0] || null;
                          setSlides(newSlides);
                        }}
                        className="w-full bg-[#121212] border border-white/10 rounded-md px-3 py-2 text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Mobile Media (Image/Video) (Optional)</label>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={e => {
                          const newSlides = [...slides];
                          newSlides[index].mobileImageFile = e.target.files?.[0] || null;
                          setSlides(newSlides);
                        }}
                        className="w-full bg-[#121212] border border-white/10 rounded-md px-3 py-2 text-white outline-none"
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
