'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import { 
  Loader2, 
  Save, 
  Layout,
  ExternalLink, 
  PlusCircle, 
  Trash2, 
  Image as ImageIcon, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Layers, 
  Sparkles, 
  Folder, 
  GripVertical, 
  Film, 
  Users, 
  Compass, 
  Tag, 
  Camera, 
  Plus, 
  FileText,
  ChevronsUpDown
} from 'lucide-react';
import ImageUploadPicker from '@/components/cms/ImageUploadPicker';
import AccordionItem from '@/components/cms/AccordionItem';
import MediaLibraryModal from '@/components/cms/MediaLibraryModal';

interface CMSSection {
  id?: string;
  type: string;
  sort_order: number;
  content: Record<string, any>;
  is_visible: boolean;
}

export default function CMSBuilderPage() {
  const router = useRouter();
  
  // Homepage Sections State
  const [pageTitle, setPageTitle] = useState('Home');
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);

  // Video Media Library Modal State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoTargetIdx, setVideoTargetIdx] = useState<number | null>(null);

  // Drag and Drop States for Sections
  const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);
  const [dragOverSectionIdx, setDragOverSectionIdx] = useState<number | null>(null);

  // Accordion Expand/Collapse Map for Repeater Items (Slide, Card, Note, Clip, etc.)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    handleLoadHomepage();
  }, []);

  const handleLoadHomepage = async () => {
    setPageLoading(true);
    setActiveSectionIdx(0);
    setExpandedIndex(0);
    try {
      const data = await apiFetch('/cms/pages/home/');
      setPageTitle(data.title || 'Home');
      setSections(data.sections || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPageLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     DRAG AND DROP HANDLERS FOR SECTIONS
     ═══════════════════════════════════════════════════════════════════ */
  const handleSectionDragStart = (idx: number) => {
    setDraggedSectionIdx(idx);
  };

  const handleSectionDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedSectionIdx === null || draggedSectionIdx === idx) return;
    setDragOverSectionIdx(idx);
  };

  const handleSectionDrop = (dropIdx: number) => {
    if (draggedSectionIdx === null || draggedSectionIdx === dropIdx) {
      setDraggedSectionIdx(null);
      setDragOverSectionIdx(null);
      return;
    }

    const list = [...sections];
    const draggedItem = list[draggedSectionIdx];
    list.splice(draggedSectionIdx, 1);
    list.splice(dropIdx, 0, draggedItem);

    // Re-index sort_order
    list.forEach((s, i) => { s.sort_order = i; });
    setSections(list);
    setActiveSectionIdx(dropIdx);
    setDraggedSectionIdx(null);
    setDragOverSectionIdx(null);
  };

  /* ═══════════════════════════════════════════════════════════════════
     REPEATER REORDER & ACCORDION HELPERS
     ═══════════════════════════════════════════════════════════════════ */
  const handleRepeaterReorder = (field: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const list = [...sections];
    const items = [...(list[activeSectionIdx].content[field] || [])];
    if (toIdx >= items.length) return;

    const item = items.splice(fromIdx, 1)[0];
    items.splice(toIdx, 0, item);

    list[activeSectionIdx].content = {
      ...list[activeSectionIdx].content,
      [field]: items
    };
    setSections(list);
    setExpandedIndex(toIdx);
  };

  const handleToggleVisibility = (idx: number) => {
    const list = [...sections];
    list[idx].is_visible = !list[idx].is_visible;
    setSections(list);
  };

  const handleMoveSection = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const list = [...sections];
    const item = list.splice(idx, 1)[0];
    list.splice(newIdx, 0, item);
    list.forEach((s, i) => { s.sort_order = i; });
    setSections(list);
    setActiveSectionIdx(newIdx);
  };

  const handleDeleteSection = (idx: number) => {
    if (!confirm('Are you sure you want to remove this section?')) return;
    const list = [...sections];
    list.splice(idx, 1);
    list.forEach((s, i) => { s.sort_order = i; });
    setSections(list);
    if (activeSectionIdx >= list.length) {
      setActiveSectionIdx(Math.max(0, list.length - 1));
    }
  };

  const handleUpdateSectionContent = (idx: number, field: string, value: any) => {
    const list = [...sections];
    list[idx].content = {
      ...list[idx].content,
      [field]: value
    };
    setSections(list);
  };

  const handleSaveLayout = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      await apiFetch('/cms/pages/home/', {
        method: 'PUT',
        body: JSON.stringify({
          title: pageTitle,
          meta_title: pageTitle,
          is_published: true,
          sections: sections
        })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save homepage layout.');
    } finally {
      setSaveLoading(false);
    }
  };

  const activeSec = sections[activeSectionIdx];

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'HeroBanner': return <ImageIcon className="w-4 h-4 text-amber-500" />;
      case 'VideoSection': return <Film className="w-4 h-4 text-purple-500" />;
      case 'GenderSection': return <Users className="w-4 h-4 text-blue-500" />;
      case 'ScentGrid': return <Sparkles className="w-4 h-4 text-rose-500" />;
      case 'BrandSlider': return <Tag className="w-4 h-4 text-emerald-500" />;
      case 'InstagramFeed': return <Camera className="w-4 h-4 text-pink-500" />;
      case 'TopCategories': return <Compass className="w-4 h-4 text-indigo-500" />;
      default: return <Layers className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-130px)] max-w-7xl mx-auto w-full text-foreground">
      {/* ─────────────────────────────────────────────────────────────────────────────
         TOP NAVIGATION BAR: 3 CLEAR PRIMARY MODES
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card neu-extruded px-6 py-4 rounded-3xl border border-border/10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Home (Active on /cms) */}
          <button
            type="button"
            className="px-5 py-2.5 font-bold text-xs rounded-2xl flex items-center gap-2.5 neu-inset-sm text-primary ring-1 ring-primary/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Home</span>
          </button>

          {/* Tab 2: Pages */}
          <button
            type="button"
            onClick={() => router.push('/cms/pages')}
            className="px-5 py-2.5 font-bold text-xs rounded-2xl flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Pages</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-500">
              8
            </span>
          </button>

          {/* Tab 3: Media Library */}
          <button
            type="button"
            onClick={() => router.push('/cms/media')}
            className="px-5 py-2.5 font-bold text-xs rounded-2xl flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer"
          >
            <Folder className="w-4 h-4 text-emerald-500" />
            <span>Media Library (R2)</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3000/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 neu-btn text-foreground font-bold rounded-2xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Open live storefront homepage in a new tab"
          >
            <span>View Live</span>
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>

          <button
            type="button"
            onClick={handleSaveLayout}
            disabled={saveLoading}
            className="px-6 py-2.5 neu-btn-primary font-bold rounded-2xl text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Saved Successfully!' : 'Save Homepage'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
         HORIZONTAL SECTION SELECTOR (Quick-Select Pills + Position & Visibility)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card neu-extruded px-6 py-3 rounded-3xl border border-border/10 shrink-0">
        {/* Horizontal Quick-Select Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin scrollbar-thumb-border/40 max-w-full flex-1">
          {sections.map((sec, idx) => {
            const isSelected = activeSectionIdx === idx;
            return (
              <button
                key={sec.id || idx}
                type="button"
                onClick={() => {
                  setActiveSectionIdx(idx);
                  setExpandedIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'neu-inset text-primary ring-1 ring-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <span>{getSectionIcon(sec.type)}</span>
                <span>{sec.type}</span>
                <span className={`text-[9px] px-1 rounded-sm ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  #{idx + 1}
                </span>
                {!sec.is_visible && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Hidden" />
                )}
              </button>
            );
          })}
        </div>

        {/* Section Position & Visibility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {activeSec && (
            <>
              <button
                type="button"
                onClick={() => handleToggleVisibility(activeSectionIdx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeSec.is_visible
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-muted text-muted-foreground border border-border/30'
                }`}
                title="Toggle section visibility on storefront"
              >
                {activeSec.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{activeSec.is_visible ? 'Visible on Store' : 'Hidden from Store'}</span>
              </button>

              <button
                type="button"
                disabled={activeSectionIdx === 0}
                onClick={() => handleMoveSection(activeSectionIdx, 'up')}
                className="px-2.5 py-1.5 neu-btn rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                title="Move section higher on homepage"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Up</span>
              </button>

              <button
                type="button"
                disabled={activeSectionIdx === sections.length - 1}
                onClick={() => handleMoveSection(activeSectionIdx, 'down')}
                className="px-2.5 py-1.5 neu-btn rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                title="Move section lower on homepage"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Down</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
         FULL-WIDTH ACTIVE SECTION EDITOR
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-5 overflow-y-auto w-full min-h-0">
            {activeSec ? (
              <div className="flex flex-col gap-5">
                {/* Section Header Card */}
                <div className="flex items-center justify-between pb-3 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      {getSectionIcon(activeSec.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">
                        {activeSec.type}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        Configure visuals, headlines, links, and responsive imagery
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    activeSec.is_visible ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {activeSec.is_visible ? 'Active & Live' : 'Hidden'}
                  </span>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════
                   1. HERO BANNER SLIDES REPEATER (ACCORDIONS)
                   ═══════════════════════════════════════════════════════════════════ */}
                {activeSec.type === 'HeroBanner' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Section Headline</label>
                        <input
                          type="text"
                          value={activeSec.content.title || ''}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'title', e.target.value)}
                          placeholder="e.g. Luxury Fragrances"
                          className="px-3.5 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Section Subtitle</label>
                        <input
                          type="text"
                          value={activeSec.content.subtitle || ''}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'subtitle', e.target.value)}
                          placeholder="e.g. Architectural perfumes from world-class houses"
                          className="px-3.5 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-1">
                      <div className="flex justify-between items-center pb-1">
                        <div>
                          <label className="text-xs font-black text-primary uppercase tracking-wider">
                            Slides Carousel Images ({(activeSec.content.slides || []).length})
                          </label>
                          <p className="text-[10px] text-muted-foreground">
                            Click a slide card to expand or edit
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const slides = [...(activeSec.content.slides || [])];
                            slides.push({
                              id: Date.now(),
                              image: '',
                              mobileImage: '',
                              href: '/collections/all',
                              alt_text: `Slide #${slides.length + 1}`
                            });
                            handleUpdateSectionContent(activeSectionIdx, 'slides', slides);
                            setExpandedIndex(slides.length - 1);
                          }}
                          className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Slide</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {(activeSec.content.slides || []).map((slide: any, sIdx: number) => (
                          <AccordionItem
                            key={slide.id || sIdx}
                            index={sIdx}
                            total={(activeSec.content.slides || []).length}
                            title={slide.alt_text || `Slide #${sIdx + 1}`}
                            subtitle={slide.href || 'No link configured'}
                            thumbnail={slide.image || slide.mobileImage}
                            badge="Banner"
                            isExpanded={expandedIndex === sIdx}
                            onToggle={() => setExpandedIndex(expandedIndex === sIdx ? null : sIdx)}
                            onMoveUp={() => handleRepeaterReorder('slides', sIdx, sIdx - 1)}
                            onMoveDown={() => handleRepeaterReorder('slides', sIdx, sIdx + 1)}
                            onDelete={() => {
                              const slides = [...(activeSec.content.slides || [])];
                              slides.splice(sIdx, 1);
                              handleUpdateSectionContent(activeSectionIdx, 'slides', slides);
                            }}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <ImageUploadPicker
                                label="Desktop Banner Image (16:9)"
                                folder="banners"
                                aspectRatio="banner"
                                value={slide.image || ''}
                                onChange={(url) => {
                                  const slides = [...(activeSec.content.slides || [])];
                                  slides[sIdx].image = url;
                                  handleUpdateSectionContent(activeSectionIdx, 'slides', slides);
                                }}
                                helpText="Recommended: 1920×800 px"
                              />

                              <ImageUploadPicker
                                label="Mobile Banner Image (9:16 / 4:5)"
                                folder="banners"
                                aspectRatio="portrait"
                                value={slide.mobileImage || ''}
                                onChange={(url) => {
                                  const slides = [...(activeSec.content.slides || [])];
                                  slides[sIdx].mobileImage = url;
                                  handleUpdateSectionContent(activeSectionIdx, 'slides', slides);
                                }}
                                helpText="Recommended: 800×1000 px"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Destination Link URL</label>
                                <input
                                  type="text"
                                  value={slide.href || ''}
                                  onChange={(e) => {
                                    const slides = [...(activeSec.content.slides || [])];
                                    slides[sIdx].href = e.target.value;
                                    handleUpdateSectionContent(activeSectionIdx, 'slides', slides);
                                  }}
                                  placeholder="/collections/luxury"
                                  className="w-full px-3 py-1.5 neu-input rounded-xl text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Alt Description / Title</label>
                                <input
                                  type="text"
                                  value={slide.alt_text || ''}
                                  onChange={(e) => {
                                    const slides = [...(activeSec.content.slides || [])];
                                    slides[sIdx].alt_text = e.target.value;
                                    handleUpdateSectionContent(activeSectionIdx, 'slides', slides);
                                  }}
                                  placeholder="e.g. Signature Accords 2026"
                                  className="w-full px-3 py-1.5 neu-input rounded-xl text-xs"
                                />
                              </div>
                            </div>
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════
                   2. GENDER SHOWCASE SECTION (ACCORDIONS)
                   ═══════════════════════════════════════════════════════════════════ */}
                {activeSec.type === 'GenderSection' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Title Prefix</label>
                        <input
                          type="text"
                          value={activeSec.content.title || 'Shop By'}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'title', e.target.value)}
                          className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Italic Part</label>
                        <input
                          type="text"
                          value={activeSec.content.italicPart || 'Gender'}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'italicPart', e.target.value)}
                          className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-1">
                        <label className="text-xs font-black text-primary uppercase">Gender Showcase Cards</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cards = [...(activeSec.content.cards || [])];
                            cards.push({
                              id: `card-${Date.now()}`,
                              label: 'Unisex',
                              tagline: 'Shared accords',
                              desktopImage: '',
                              mobileImage: '',
                              href: '/collections/unisex'
                            });
                            handleUpdateSectionContent(activeSectionIdx, 'cards', cards);
                            setExpandedIndex(cards.length - 1);
                          }}
                          className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Card</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {(activeSec.content.cards || []).map((card: any, cIdx: number) => (
                          <AccordionItem
                            key={card.id || cIdx}
                            index={cIdx}
                            total={(activeSec.content.cards || []).length}
                            title={card.label || `Card #${cIdx + 1}`}
                            subtitle={card.tagline || card.href}
                            thumbnail={card.desktopImage || card.mobileImage}
                            badge="Gender"
                            isExpanded={expandedIndex === cIdx}
                            onToggle={() => setExpandedIndex(expandedIndex === cIdx ? null : cIdx)}
                            onMoveUp={() => handleRepeaterReorder('cards', cIdx, cIdx - 1)}
                            onMoveDown={() => handleRepeaterReorder('cards', cIdx, cIdx + 1)}
                            onDelete={() => {
                              const cards = [...(activeSec.content.cards || [])];
                              cards.splice(cIdx, 1);
                              handleUpdateSectionContent(activeSectionIdx, 'cards', cards);
                            }}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={card.label || ''}
                                onChange={(e) => {
                                  const cards = [...(activeSec.content.cards || [])];
                                  cards[cIdx].label = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'cards', cards);
                                }}
                                placeholder="Label (e.g. Men)"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs font-bold"
                              />
                              <input
                                type="text"
                                value={card.tagline || ''}
                                onChange={(e) => {
                                  const cards = [...(activeSec.content.cards || [])];
                                  cards[cIdx].tagline = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'cards', cards);
                                }}
                                placeholder="Tagline (e.g. Bold, magnetic formulas)"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <ImageUploadPicker
                                label="Desktop Card Image"
                                folder="gender"
                                aspectRatio="portrait"
                                value={card.desktopImage || ''}
                                onChange={(url) => {
                                  const cards = [...(activeSec.content.cards || [])];
                                  cards[cIdx].desktopImage = url;
                                  handleUpdateSectionContent(activeSectionIdx, 'cards', cards);
                                }}
                              />
                              <ImageUploadPicker
                                label="Mobile Card Image"
                                folder="gender"
                                aspectRatio="portrait"
                                value={card.mobileImage || ''}
                                onChange={(url) => {
                                  const cards = [...(activeSec.content.cards || [])];
                                  cards[cIdx].mobileImage = url;
                                  handleUpdateSectionContent(activeSectionIdx, 'cards', cards);
                                }}
                              />
                            </div>
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════
                   3. VIDEO SECTION (ACCORDIONS)
                   ═══════════════════════════════════════════════════════════════════ */}
                {activeSec.type === 'VideoSection' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={activeSec.content.title || 'The'}
                        onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'title', e.target.value)}
                        placeholder="Prefix"
                        className="px-3 py-2 neu-input rounded-xl text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={activeSec.content.italicPart || 'Cinematic'}
                        onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'italicPart', e.target.value)}
                        placeholder="Italic word"
                        className="px-3 py-2 neu-input rounded-xl text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={activeSec.content.suffix || 'Experience'}
                        onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'suffix', e.target.value)}
                        placeholder="Suffix"
                        className="px-3 py-2 neu-input rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-1">
                        <label className="text-xs font-black text-primary uppercase">
                          Video Clips ({(activeSec.content.items || []).length})
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const items = [...(activeSec.content.items || [])];
                            items.push({
                              id: `vid-${Date.now()}`,
                              label: 'Atmospheric Scent',
                              video: '',
                              poster: '',
                              href: '/products'
                            });
                            handleUpdateSectionContent(activeSectionIdx, 'items', items);
                            setExpandedIndex(items.length - 1);
                          }}
                          className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Video Clip</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {(activeSec.content.items || []).map((vItem: any, vIdx: number) => (
                          <AccordionItem
                            key={vIdx}
                            index={vIdx}
                            total={(activeSec.content.items || []).length}
                            title={vItem.label || `Clip #${vIdx + 1}`}
                            subtitle={vItem.video || 'No video link'}
                            thumbnail={vItem.poster}
                            badge="Video"
                            isExpanded={expandedIndex === vIdx}
                            onToggle={() => setExpandedIndex(expandedIndex === vIdx ? null : vIdx)}
                            onMoveUp={() => handleRepeaterReorder('items', vIdx, vIdx - 1)}
                            onMoveDown={() => handleRepeaterReorder('items', vIdx, vIdx + 1)}
                            onDelete={() => {
                              const items = [...(activeSec.content.items || [])];
                              items.splice(vIdx, 1);
                              handleUpdateSectionContent(activeSectionIdx, 'items', items);
                            }}
                          >
                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Title / Brand</label>
                                  <input
                                    type="text"
                                    value={vItem.label || ''}
                                    onChange={(e) => {
                                      const items = [...(activeSec.content.items || [])];
                                      items[vIdx].label = e.target.value;
                                      handleUpdateSectionContent(activeSectionIdx, 'items', items);
                                    }}
                                    placeholder="Title / Brand Label"
                                    className="w-full px-3 py-1.5 neu-input rounded-xl text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">MP4 Video URL</label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVideoTargetIdx(vIdx);
                                        setVideoModalOpen(true);
                                      }}
                                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Film className="w-3 h-3 text-purple-500" />
                                      <span>Choose / Upload Video (R2)</span>
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={vItem.video || ''}
                                    onChange={(e) => {
                                      const items = [...(activeSec.content.items || [])];
                                      items[vIdx].video = e.target.value;
                                      handleUpdateSectionContent(activeSectionIdx, 'items', items);
                                    }}
                                    placeholder="https://.../video.mp4"
                                    className="w-full px-3 py-1.5 neu-input rounded-xl text-xs"
                                  />
                                  {vItem.video && (
                                    <div className="mt-2 flex items-center gap-3 p-2 bg-muted/20 rounded-xl border border-border/20">
                                      <div className="relative w-16 aspect-[9/16] rounded-lg overflow-hidden bg-black border border-border/40 shadow-xs shrink-0">
                                        <video src={vItem.video} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                                      </div>
                                      <div className="text-[11px] text-muted-foreground flex flex-col gap-0.5">
                                        <span className="font-bold text-foreground">Cloudflare R2 Video Reel</span>
                                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">✓ Live & streaming</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Target Link</label>
                                <input
                                  type="text"
                                  value={vItem.href || ''}
                                  onChange={(e) => {
                                    const items = [...(activeSec.content.items || [])];
                                    items[vIdx].href = e.target.value;
                                    handleUpdateSectionContent(activeSectionIdx, 'items', items);
                                  }}
                                  placeholder="/products/fragrance-name"
                                  className="w-full px-3 py-1.5 neu-input rounded-xl text-xs"
                                />
                              </div>
                            </div>
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════
                   4. TOP CATEGORIES (ACCORDIONS)
                   ═══════════════════════════════════════════════════════════════════ */}
                {activeSec.type === 'TopCategories' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Section Title</label>
                      <input
                        type="text"
                        value={activeSec.content.title || 'Explore Categories'}
                        onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'title', e.target.value)}
                        className="w-full px-3.5 py-2 neu-input rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-1">
                        <label className="text-xs font-black text-primary uppercase">Categories List</label>
                        <button
                          type="button"
                          onClick={() => {
                            const cats = [...(activeSec.content.categories || [])];
                            cats.push({ name: 'Oud & Woods', slug: 'oud-woods', image: '', count: '45+ Scents' });
                            handleUpdateSectionContent(activeSectionIdx, 'categories', cats);
                            setExpandedIndex(cats.length - 1);
                          }}
                          className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Category</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {(activeSec.content.categories || []).map((cat: any, cIdx: number) => (
                          <AccordionItem
                            key={cIdx}
                            index={cIdx}
                            total={(activeSec.content.categories || []).length}
                            title={cat.name || `Category #${cIdx + 1}`}
                            subtitle={cat.slug || cat.count}
                            thumbnail={cat.image}
                            badge="Category"
                            isExpanded={expandedIndex === cIdx}
                            onToggle={() => setExpandedIndex(expandedIndex === cIdx ? null : cIdx)}
                            onMoveUp={() => handleRepeaterReorder('categories', cIdx, cIdx - 1)}
                            onMoveDown={() => handleRepeaterReorder('categories', cIdx, cIdx + 1)}
                            onDelete={() => {
                              const cats = [...(activeSec.content.categories || [])];
                              cats.splice(cIdx, 1);
                              handleUpdateSectionContent(activeSectionIdx, 'categories', cats);
                            }}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={cat.name || ''}
                                onChange={(e) => {
                                  const cats = [...(activeSec.content.categories || [])];
                                  cats[cIdx].name = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'categories', cats);
                                }}
                                placeholder="Category Name"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs font-bold"
                              />
                              <input
                                type="text"
                                value={cat.slug || ''}
                                onChange={(e) => {
                                  const cats = [...(activeSec.content.categories || [])];
                                  cats[cIdx].slug = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'categories', cats);
                                }}
                                placeholder="Slug / Link"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs"
                              />
                            </div>

                            <ImageUploadPicker
                              label="Category Artwork / Photo"
                              folder="categories"
                              aspectRatio="square"
                              value={cat.image || ''}
                              onChange={(url) => {
                                const cats = [...(activeSec.content.categories || [])];
                                cats[cIdx].image = url;
                                handleUpdateSectionContent(activeSectionIdx, 'categories', cats);
                              }}
                            />
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════
                   5. SCENT GRID / NOTES (ACCORDIONS)
                   ═══════════════════════════════════════════════════════════════════ */}
                {activeSec.type === 'ScentGrid' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={activeSec.content.title || 'The'}
                        onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'title', e.target.value)}
                        placeholder="Prefix"
                        className="px-3 py-2 neu-input rounded-xl text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={activeSec.content.italicPart || 'Art'}
                        onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'italicPart', e.target.value)}
                        placeholder="Italic accent"
                        className="px-3 py-2 neu-input rounded-xl text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={activeSec.content.suffix || 'of Scent Notes'}
                        onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'suffix', e.target.value)}
                        placeholder="Suffix"
                        className="px-3 py-2 neu-input rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-1">
                        <label className="text-xs font-black text-primary uppercase">Scent Families & Notes</label>
                        <button
                          type="button"
                          onClick={() => {
                            const items = [...(activeSec.content.items || [])];
                            items.push({ name: 'Citrus Zest', desc: 'Sparkling bergamot & mandarin', image: '', link: '/scents/citrus' });
                            handleUpdateSectionContent(activeSectionIdx, 'items', items);
                            setExpandedIndex(items.length - 1);
                          }}
                          className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Note</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {(activeSec.content.items || []).map((sItem: any, sIdx: number) => (
                          <AccordionItem
                            key={sIdx}
                            index={sIdx}
                            total={(activeSec.content.items || []).length}
                            title={sItem.name || `Note #${sIdx + 1}`}
                            subtitle={sItem.desc || sItem.link}
                            thumbnail={sItem.image}
                            badge="Scent"
                            isExpanded={expandedIndex === sIdx}
                            onToggle={() => setExpandedIndex(expandedIndex === sIdx ? null : sIdx)}
                            onMoveUp={() => handleRepeaterReorder('items', sIdx, sIdx - 1)}
                            onMoveDown={() => handleRepeaterReorder('items', sIdx, sIdx + 1)}
                            onDelete={() => {
                              const items = [...(activeSec.content.items || [])];
                              items.splice(sIdx, 1);
                              handleUpdateSectionContent(activeSectionIdx, 'items', items);
                            }}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={sItem.name || ''}
                                onChange={(e) => {
                                  const items = [...(activeSec.content.items || [])];
                                  items[sIdx].name = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'items', items);
                                }}
                                placeholder="Note Name (e.g. Woody & Amber)"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs font-bold"
                              />
                              <input
                                type="text"
                                value={sItem.desc || ''}
                                onChange={(e) => {
                                  const items = [...(activeSec.content.items || [])];
                                  items[sIdx].desc = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'items', items);
                                }}
                                placeholder="Description"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs"
                              />
                            </div>

                            <ImageUploadPicker
                              label="Scent Family Photo"
                              folder="scent"
                              aspectRatio="square"
                              value={sItem.image || ''}
                              onChange={(url) => {
                                const items = [...(activeSec.content.items || [])];
                                items[sIdx].image = url;
                                handleUpdateSectionContent(activeSectionIdx, 'items', items);
                              }}
                            />
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════
                   6. BRAND SLIDER (ACCORDIONS)
                   ═══════════════════════════════════════════════════════════════════ */}
                {activeSec.type === 'BrandSlider' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Title Prefix</label>
                        <input
                          type="text"
                          value={activeSec.content.title || 'Global'}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'title', e.target.value)}
                          className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Italic Part</label>
                        <input
                          type="text"
                          value={activeSec.content.italicPart || 'Brands'}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'italicPart', e.target.value)}
                          className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-1">
                        <label className="text-xs font-black text-primary uppercase">Brands Directory</label>
                        <button
                          type="button"
                          onClick={() => {
                            const brands = [...(activeSec.content.brands || [])];
                            brands.push({ name: 'Lattafa', origin: 'UAE', logo: '', link: '/brand/lattafa' });
                            handleUpdateSectionContent(activeSectionIdx, 'brands', brands);
                            setExpandedIndex(brands.length - 1);
                          }}
                          className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Brand</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {(activeSec.content.brands || []).map((brand: any, bIdx: number) => (
                          <AccordionItem
                            key={bIdx}
                            index={bIdx}
                            total={(activeSec.content.brands || []).length}
                            title={brand.name || `Brand #${bIdx + 1}`}
                            subtitle={brand.link || brand.origin}
                            thumbnail={brand.logo}
                            badge="Brand"
                            isExpanded={expandedIndex === bIdx}
                            onToggle={() => setExpandedIndex(expandedIndex === bIdx ? null : bIdx)}
                            onMoveUp={() => handleRepeaterReorder('brands', bIdx, bIdx - 1)}
                            onMoveDown={() => handleRepeaterReorder('brands', bIdx, bIdx + 1)}
                            onDelete={() => {
                              const brands = [...(activeSec.content.brands || [])];
                              brands.splice(bIdx, 1);
                              handleUpdateSectionContent(activeSectionIdx, 'brands', brands);
                            }}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={brand.name || ''}
                                onChange={(e) => {
                                  const brands = [...(activeSec.content.brands || [])];
                                  brands[bIdx].name = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'brands', brands);
                                }}
                                placeholder="Brand Name"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs font-bold"
                              />
                              <input
                                type="text"
                                value={brand.link || ''}
                                onChange={(e) => {
                                  const brands = [...(activeSec.content.brands || [])];
                                  brands[bIdx].link = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'brands', brands);
                                }}
                                placeholder="Link URL (e.g. /brand/armaf)"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs"
                              />
                            </div>

                            <ImageUploadPicker
                              label="Brand Logo Artwork"
                              folder="brands"
                              aspectRatio="square"
                              value={brand.logo || ''}
                              onChange={(url) => {
                                const brands = [...(activeSec.content.brands || [])];
                                brands[bIdx].logo = url;
                                handleUpdateSectionContent(activeSectionIdx, 'brands', brands);
                              }}
                            />
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════
                   7. INSTAGRAM FEED (ACCORDIONS)
                   ═══════════════════════════════════════════════════════════════════ */}
                {activeSec.type === 'InstagramFeed' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Title</label>
                        <input
                          type="text"
                          value={activeSec.content.title || 'Follow Us On'}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'title', e.target.value)}
                          className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Italic Part</label>
                        <input
                          type="text"
                          value={activeSec.content.italicPart || 'Instagram'}
                          onChange={(e) => handleUpdateSectionContent(activeSectionIdx, 'italicPart', e.target.value)}
                          className="w-full px-3 py-2 neu-input rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-1">
                        <label className="text-xs font-black text-primary uppercase">Instagram Photos</label>
                        <button
                          type="button"
                          onClick={() => {
                            const posts = [...(activeSec.content.posts || [])];
                            posts.push({ image: '', link: 'https://instagram.com/perfumeboothindia', handle: '@perfumeboothindia', likes: '1.2k' });
                            handleUpdateSectionContent(activeSectionIdx, 'posts', posts);
                            setExpandedIndex(posts.length - 1);
                          }}
                          className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Post</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {(activeSec.content.posts || []).map((post: any, pIdx: number) => (
                          <AccordionItem
                            key={pIdx}
                            index={pIdx}
                            total={(activeSec.content.posts || []).length}
                            title={post.likes ? `${post.likes} · Instagram Post` : `Post #${pIdx + 1}`}
                            subtitle={post.link || 'https://instagram.com'}
                            thumbnail={post.image}
                            badge="Instagram"
                            isExpanded={expandedIndex === pIdx}
                            onToggle={() => setExpandedIndex(expandedIndex === pIdx ? null : pIdx)}
                            onMoveUp={() => handleRepeaterReorder('posts', pIdx, pIdx - 1)}
                            onMoveDown={() => handleRepeaterReorder('posts', pIdx, pIdx + 1)}
                            onDelete={() => {
                              const posts = [...(activeSec.content.posts || [])];
                              posts.splice(pIdx, 1);
                              handleUpdateSectionContent(activeSectionIdx, 'posts', posts);
                            }}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={post.link || ''}
                                onChange={(e) => {
                                  const posts = [...(activeSec.content.posts || [])];
                                  posts[pIdx].link = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'posts', posts);
                                }}
                                placeholder="Instagram Post URL"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs"
                              />
                              <input
                                type="text"
                                value={post.likes || ''}
                                onChange={(e) => {
                                  const posts = [...(activeSec.content.posts || [])];
                                  posts[pIdx].likes = e.target.value;
                                  handleUpdateSectionContent(activeSectionIdx, 'posts', posts);
                                }}
                                placeholder="Likes / Tag (e.g. 1.4k likes)"
                                className="px-3 py-1.5 neu-input rounded-xl text-xs"
                              />
                            </div>

                            <ImageUploadPicker
                              label="Instagram Photo"
                              folder="instagram"
                              aspectRatio="square"
                              value={post.image || ''}
                              onChange={(url) => {
                                const posts = [...(activeSec.content.posts || [])];
                                posts[pIdx].image = url;
                                handleUpdateSectionContent(activeSectionIdx, 'posts', posts);
                              }}
                            />
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                Select a section on the left to edit its parameters
              </div>
            )}
          </div>

          {videoModalOpen && (
            <MediaLibraryModal
              isOpen={videoModalOpen}
              defaultFolder="videos"
              title="Choose or Upload Video Reel to Cloudflare R2"
              onClose={() => {
                setVideoModalOpen(false);
                setVideoTargetIdx(null);
              }}
              onSelect={(url) => {
                if (videoTargetIdx !== null && activeSec) {
                  const items = [...(activeSec.content.items || [])];
                  if (items[videoTargetIdx]) {
                    items[videoTargetIdx].video = url;
                    handleUpdateSectionContent(activeSectionIdx, 'items', items);
                  }
                }
                setVideoModalOpen(false);
                setVideoTargetIdx(null);
              }}
            />
          )}
        </div>
      );
    }
