'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  Loader2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Settings, 
  Save, 
  PlusCircle,
  Layout
} from 'lucide-react';

interface CMSSection {
  id: string;
  type: 'HeroBanner' | 'ProductGrid' | 'Testimonials' | 'FaqList';
  sort_order: number;
  content: Record<string, any>;
  is_visible: boolean;
}

interface CMSPageSummary {
  id: string;
  slug: string;
  title: string;
  meta_title: string;
  is_published: boolean;
}

export default function CMSBuilderPage() {
  const [pages, setPages] = useState<CMSPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  
  // Page Edit States
  const [pageTitle, setPageTitle] = useState('');
  const [pageMetaTitle, setPageMetaTitle] = useState('');
  const [pageMetaDesc, setPageMetaDesc] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [sections, setSections] = useState<CMSSection[]>([]);
  
  // Customizer state
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // New Page creation state
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/cms/pages/');
      setPages(data);
      if (data.length > 0 && !selectedSlug) {
        handleLoadPage(data[0].slug);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleLoadPage = async (slug: string) => {
    setSelectedSlug(slug);
    setPageLoading(true);
    setSelectedSectionIdx(null);
    try {
      const data = await apiFetch(`/cms/pages/${slug}/`);
      setPageTitle(data.title);
      setPageMetaTitle(data.meta_title);
      setPageMetaDesc(data.meta_description || '');
      setIsPublished(data.is_published);
      setSections(data.sections || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPageLoading(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/cms/pages/', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug
        })
      });
      setNewPageOpen(false);
      setNewTitle('');
      setNewSlug('');
      fetchPages();
    } catch (err: any) {
      alert(err.message || 'Failed to create page.');
    }
  };

  const handleAddSection = (type: 'HeroBanner' | 'ProductGrid' | 'Testimonials') => {
    let defaultContent = {};
    if (type === 'HeroBanner') {
      defaultContent = {
        title: 'New Scent Revolution',
        subtitle: 'Explore our premium catalog collections',
        buttonText: 'Shop Catalog',
        buttonLink: '/products',
        backgroundImage: ''
      };
    } else if (type === 'ProductGrid') {
      defaultContent = {
        title: 'Featured Fragrances',
        limit: 4,
        categoryTag: 'Citrus'
      };
    } else if (type === 'Testimonials') {
      defaultContent = {
        title: 'Customer Stories',
        reviews: [
          { name: 'Kunal Sen', quote: 'Absolutely rich scent that stays all day.', rating: 5 }
        ]
      };
    }

    const newSec: CMSSection = {
      id: `temp-${Date.now()}`,
      type,
      sort_order: sections.length,
      content: defaultContent,
      is_visible: true
    };

    setSections([...sections, newSec]);
    setSelectedSectionIdx(sections.length);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const list = [...sections];
    
    // Swap
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setSections(list);
    if (selectedSectionIdx === index) {
      setSelectedSectionIdx(targetIdx);
    } else if (selectedSectionIdx === targetIdx) {
      setSelectedSectionIdx(index);
    }
  };

  const handleToggleVisible = (index: number) => {
    const list = [...sections];
    list[index].is_visible = !list[index].is_visible;
    setSections(list);
  };

  const handleDeleteSection = (index: number) => {
    const list = sections.filter((_, idx) => idx !== index);
    setSections(list);
    setSelectedSectionIdx(null);
  };

  const handleUpdateContent = (field: string, value: any) => {
    if (selectedSectionIdx === null) return;
    const list = [...sections];
    list[selectedSectionIdx].content = {
      ...list[selectedSectionIdx].content,
      [field]: value
    };
    setSections(list);
  };

  const handleSaveLayout = async () => {
    if (!selectedSlug) return;
    setSaveLoading(true);
    try {
      await apiFetch(`/cms/pages/${selectedSlug}/`, {
        method: 'PUT',
        body: JSON.stringify({
          title: pageTitle,
          meta_title: pageMetaTitle,
          meta_description: pageMetaDesc,
          is_published: isPublished,
          sections: sections
        })
      });
      alert('CMS Page Layout saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save page layout.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 h-[calc(100vh-140px)]">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Theme Customizer</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure layout sections and content delivery</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={selectedSlug || ''} 
            onChange={(e) => handleLoadPage(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-semibold text-foreground cursor-pointer"
          >
            {pages.map(p => (
              <option key={p.id} value={p.slug}>
                {p.title} ({p.slug})
              </option>
            ))}
          </select>
          <button
            onClick={() => setNewPageOpen(true)}
            className="px-4 py-2.5 bg-muted text-foreground border border-border font-semibold rounded-xl hover:bg-muted/80 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
          >
            New Page
          </button>
          <button
            onClick={handleSaveLayout}
            disabled={saveLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm disabled:opacity-50"
          >
            {saveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Layout</span>
          </button>
        </div>
      </div>

      {pageLoading ? (
        <div className="flex-1 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
          
          {/* Left panel: Section Reordering & Details */}
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-6 overflow-y-auto">
            <div>
              <h3 className="font-bold text-foreground mb-4">Page Settings</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Page Title</label>
                  <input
                    type="text"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Meta Title</label>
                  <input
                    type="text"
                    value={pageMetaTitle}
                    onChange={(e) => setPageMetaTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="published_toggle"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-primary bg-background border-border"
                  />
                  <label htmlFor="published_toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                    Publish page online
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-6 flex-1 flex flex-col gap-4 min-h-0">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-foreground">Page Sections</h3>
                <span className="text-xs text-muted-foreground">{sections.length} active</span>
              </div>

              {/* Sections List */}
              <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
                {sections.map((section, idx) => (
                  <div 
                    key={section.id}
                    onClick={() => setSelectedSectionIdx(idx)}
                    className={`p-3 bg-muted/50 border rounded-xl flex items-center justify-between cursor-pointer group hover:border-primary/30 transition duration-150 ${
                      selectedSectionIdx === idx ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Layout className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">{section.type}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Section #{idx + 1}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, 'up'); }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleMoveSection(idx, 'down'); }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleVisible(idx); }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        {section.is_visible ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(idx); }}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Section Buttons */}
              <div className="border-t border-border/50 pt-4 flex flex-col gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Add Components</span>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleAddSection('HeroBanner')}
                    className="py-2 bg-background border border-border text-[10px] font-bold rounded-lg hover:border-primary hover:text-primary transition duration-150 cursor-pointer"
                  >
                    Hero Banner
                  </button>
                  <button 
                    onClick={() => handleAddSection('ProductGrid')}
                    className="py-2 bg-background border border-border text-[10px] font-bold rounded-lg hover:border-primary hover:text-primary transition duration-150 cursor-pointer"
                  >
                    Product Grid
                  </button>
                  <button 
                    onClick={() => handleAddSection('Testimonials')}
                    className="py-2 bg-background border border-border text-[10px] font-bold rounded-lg hover:border-primary hover:text-primary transition duration-150 cursor-pointer"
                  >
                    Reviews List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Live Editor (Customize fields) */}
          <div className="glass-card p-6 rounded-2xl lg:col-span-2 flex flex-col gap-6 overflow-y-auto">
            <h3 className="font-bold text-foreground border-b border-border/50 pb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary animate-spin" style={{ animationDuration: '6s' }} /> Section Customizer
            </h3>

            {selectedSectionIdx === null ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-muted-foreground">
                <p className="text-sm">Select a page section from the left panel to edit its settings and text copies</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex justify-between items-center bg-muted/30 p-3.5 rounded-xl border border-border">
                  <div>
                    <span className="text-[10px] font-semibold text-primary uppercase">Active Element</span>
                    <h4 className="font-bold text-foreground text-sm">{sections[selectedSectionIdx].type}</h4>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {/* HERO BANNER EDITOR */}
                  {sections[selectedSectionIdx].type === 'HeroBanner' && (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Heading Title</label>
                        <input
                          type="text"
                          value={sections[selectedSectionIdx].content.title || ''}
                          onChange={(e) => handleUpdateContent('title', e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Subtitle Copy</label>
                        <input
                          type="text"
                          value={sections[selectedSectionIdx].content.subtitle || ''}
                          onChange={(e) => handleUpdateContent('subtitle', e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Button Text</label>
                          <input
                            type="text"
                            value={sections[selectedSectionIdx].content.buttonText || ''}
                            onChange={(e) => handleUpdateContent('buttonText', e.target.value)}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Button Link</label>
                          <input
                            type="text"
                            value={sections[selectedSectionIdx].content.buttonLink || ''}
                            onChange={(e) => handleUpdateContent('buttonLink', e.target.value)}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* PRODUCT GRID EDITOR */}
                  {sections[selectedSectionIdx].type === 'ProductGrid' && (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Section Title</label>
                        <input
                          type="text"
                          value={sections[selectedSectionIdx].content.title || ''}
                          onChange={(e) => handleUpdateContent('title', e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Products Limit</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={sections[selectedSectionIdx].content.limit || 4}
                            onChange={(e) => handleUpdateContent('limit', parseInt(e.target.value))}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Filter Scent Tag</label>
                          <select
                            value={sections[selectedSectionIdx].content.categoryTag || ''}
                            onChange={(e) => handleUpdateContent('categoryTag', e.target.value)}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm text-foreground"
                          >
                            <option value="Citrus">Citrus</option>
                            <option value="Floral">Floral</option>
                            <option value="Woody">Woody</option>
                            <option value="Spicy">Spicy</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* REVIEWS LIST EDITOR */}
                  {sections[selectedSectionIdx].type === 'Testimonials' && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Headline</label>
                        <input
                          type="text"
                          value={sections[selectedSectionIdx].content.title || ''}
                          onChange={(e) => handleUpdateContent('title', e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Testimonials Feed</label>
                        <div className="flex flex-col gap-3">
                          {(sections[selectedSectionIdx].content.reviews || []).map((rev: any, rIdx: number) => (
                            <div key={rIdx} className="p-4 bg-muted/40 border border-border rounded-xl flex flex-col gap-3">
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  type="text"
                                  placeholder="Customer Name"
                                  value={rev.name}
                                  onChange={(e) => {
                                    const list = [...(sections[selectedSectionIdx as number].content.reviews || [])];
                                    list[rIdx].name = e.target.value;
                                    handleUpdateContent('reviews', list);
                                  }}
                                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                                />
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  placeholder="Rating (1-5)"
                                  value={rev.rating}
                                  onChange={(e) => {
                                    const list = [...(sections[selectedSectionIdx as number].content.reviews || [])];
                                    list[rIdx].rating = parseInt(e.target.value);
                                    handleUpdateContent('reviews', list);
                                  }}
                                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                                />
                              </div>
                              <textarea
                                placeholder="Customer Review Statement"
                                value={rev.quote}
                                onChange={(e) => {
                                  const list = [...(sections[selectedSectionIdx as number].content.reviews || [])];
                                  list[rIdx].quote = e.target.value;
                                  handleUpdateContent('reviews', list);
                                }}
                                rows={2}
                                className="px-3 py-2 bg-background border border-border rounded-lg text-xs"
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const list = [...(sections[selectedSectionIdx as number].content.reviews || [])];
                              list.push({ name: 'User Profile', quote: 'Fabulous aromatic collections!', rating: 5 });
                              handleUpdateContent('reviews', list);
                            }}
                            className="flex items-center justify-center gap-2 py-2 border border-dashed border-border hover:border-primary text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground transition duration-150 cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4 text-primary" />
                            <span>Add Review Row</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Page Creation Overlay */}
      {newPageOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-2xl flex flex-col gap-6">
            <h2 className="text-xl font-bold text-foreground">Create Custom CMS Page</h2>
            <form onSubmit={handleCreatePage} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Page title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                  }}
                  placeholder="e.g. Anniversary Landing Page"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Page Slug</label>
                <input
                  type="text"
                  required
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="e.g. anniversary-sale"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setNewPageOpen(false)}
                  className="px-4 py-2.5 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition duration-200 cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-sm"
                >
                  Create Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
