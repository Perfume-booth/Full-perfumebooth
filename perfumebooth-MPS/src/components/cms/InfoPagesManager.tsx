'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import { 
  Loader2, 
  Save, 
  ExternalLink, 
  Building2, 
  Phone, 
  HelpCircle, 
  AlertCircle, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  FileCheck, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Mail, 
  Clock, 
  MapPin, 
  ImageIcon, 
  FileText 
} from 'lucide-react';
import ImageUploadPicker from '@/components/cms/ImageUploadPicker';
import ResizableTextarea from '@/components/ui/ResizableTextarea';

const CKEditorWrapper = dynamic(() => import('@/components/cms/CKEditorWrapper'), {
  ssr: false,
  loading: () => (
    <div className="p-6 bg-muted/20 border border-border/30 rounded-2xl text-xs text-muted-foreground animate-pulse flex items-center justify-center min-h-[250px]">
      Loading rich editorial text editor...
    </div>
  )
});

interface CMSSection {
  id?: string;
  type: string;
  sort_order: number;
  content: Record<string, any>;
  is_visible: boolean;
}

const INFO_PAGES = [
  { slug: 'info/about-us', title: 'About Us', icon: Building2, desc: 'Brand heritage & craftsmanship story' },
  { slug: 'info/contact-us', title: 'Contact Us', icon: Phone, desc: 'Customer support, email, phone & office' },
  { slug: 'info/faq', title: 'FAQ', icon: HelpCircle, desc: 'Questions & answers accordion list' },
  { slug: 'info/disclaimers', title: 'Disclaimers', icon: AlertCircle, desc: 'Product notes, allergy & usage disclosures' },
  { slug: 'info/policies/privacy', title: 'Privacy Policy', icon: ShieldCheck, desc: 'User privacy, data safety & cookies' },
  { slug: 'info/policies/shipping', title: 'Shipping Policy', icon: Truck, desc: 'Dispatch times, delivery rates & carriers' },
  { slug: 'info/policies/refund', title: 'Refund Policy', icon: RotateCcw, desc: 'Returns, cancellations & refund rules' },
  { slug: 'info/policies/terms', title: 'Terms & Conditions', icon: FileCheck, desc: 'Store terms of service & user agreement' },
];

function InfoPagesContent() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');
  const [selectedSlug, setSelectedSlug] = useState(pageParam || 'info/about-us');
  const [pageTitle, setPageTitle] = useState('');
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (pageParam && pageParam !== selectedSlug) {
      setSelectedSlug(pageParam);
    }
  }, [pageParam]);

  useEffect(() => {
    loadPage(selectedSlug);
  }, [selectedSlug]);

  const loadPage = async (slug: string) => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const data = await apiFetch(`/cms/pages/${slug}/`);
      setPageTitle(data.title || '');
      let loadedSecs: CMSSection[] = data.sections || [];

      if (loadedSecs.length === 0) {
        if (slug === 'info/faq') {
          loadedSecs = [
            { id: `temp-${Date.now()}`, type: 'HeroBanner', sort_order: 0, content: { title: data.title, desktopSrc: '', mobileSrc: '' }, is_visible: true },
            { id: `temp-${Date.now() + 1}`, type: 'FaqList', sort_order: 1, content: { title: 'Frequently Asked Questions', faqs: [] }, is_visible: true }
          ];
        } else if (slug === 'info/contact-us') {
          loadedSecs = [
            { id: `temp-${Date.now()}`, type: 'HeroBanner', sort_order: 0, content: { title: data.title, desktopSrc: '', mobileSrc: '' }, is_visible: true },
            { id: `temp-${Date.now() + 1}`, type: 'ContactCard', sort_order: 1, content: { email: '', phone: '', hours: '', address: '' }, is_visible: true }
          ];
        } else {
          loadedSecs = [
            { id: `temp-${Date.now()}`, type: 'HeroBanner', sort_order: 0, content: { title: data.title, desktopSrc: '', mobileSrc: '' }, is_visible: true },
            { id: `temp-${Date.now() + 1}`, type: 'RichText', sort_order: 1, content: { title: data.title, body: '' }, is_visible: true }
          ];
        }
      }
      setSections(loadedSecs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await apiFetch(`/cms/pages/${selectedSlug}/`, {
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
      alert(err.message || 'Failed to save page layout.');
    } finally {
      setSaving(false);
    }
  };

  // Section references
  const heroSec = sections.find(s => s.type === 'HeroBanner') || {
    type: 'HeroBanner',
    sort_order: 0,
    content: { title: pageTitle, desktopSrc: '', mobileSrc: '' },
    is_visible: true
  };
  const contactSec = sections.find(s => s.type === 'ContactCard');
  const faqSec = sections.find(s => s.type === 'FaqList');
  const richSec = sections.find(s => s.type === 'RichText');

  const updateHero = (field: string, val: any) => {
    const list = [...sections];
    let idx = list.findIndex(s => s.type === 'HeroBanner');
    if (idx < 0) {
      list.unshift({
        id: `temp-${Date.now()}`,
        type: 'HeroBanner',
        sort_order: 0,
        content: { title: pageTitle, desktopSrc: '', mobileSrc: '', [field]: val },
        is_visible: true
      });
    } else {
      list[idx].content = { ...list[idx].content, [field]: val };
    }
    setSections(list);
  };

  const currentPageMeta = INFO_PAGES.find(p => p.slug === selectedSlug) || INFO_PAGES[0];
  const PageIcon = currentPageMeta.icon;
  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────────────────────
         HORIZONTAL PAGE SELECTOR (Quick-Select Pills + Actions)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card neu-extruded px-6 py-3 rounded-3xl border border-border/10 shrink-0">
        {/* Horizontal Quick-Select Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin scrollbar-thumb-border/40 max-w-full flex-1">
          {INFO_PAGES.map((page, idx) => {
            const Icon = page.icon;
            const isSelected = selectedSlug === page.slug;
            return (
              <button
                key={page.slug}
                type="button"
                onClick={() => setSelectedSlug(page.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'neu-inset text-primary ring-1 ring-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{page.title}</span>
                <span className={`text-[9px] px-1 rounded-sm ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  #{idx + 1}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Preview & Save */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href={`http://localhost:3000/${selectedSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 neu-btn rounded-xl text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer"
            title="View this page live on storefront"
          >
            <span>Preview Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 neu-btn-primary rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Saved Successfully!' : 'Save Page'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
         FULL-WIDTH ACTIVE PAGE EDITOR
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-5 overflow-y-auto w-full min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Header Title Banner */}
            <div className="flex items-center justify-between pb-4 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <PageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <span>{currentPageMeta.title}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                      Live on Storefront
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {currentPageMeta.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 1: Header Banner (Desktop & Mobile) */}
            <div className="p-5 bg-card neu-extruded-sm rounded-2xl border border-border/20 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Header Banner Media
                  </h4>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Displays on top of the page with title overlay
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUploadPicker
                  label="Desktop Header Banner (16:9 or Ultrawide)"
                  folder="banners"
                  aspectRatio="banner"
                  value={heroSec.content?.desktopSrc || ''}
                  onChange={(url) => updateHero('desktopSrc', url)}
                  helpText="Recommended: 1920×450 px"
                />

                <ImageUploadPicker
                  label="Mobile Header Banner"
                  folder="banners"
                  aspectRatio="portrait"
                  value={heroSec.content?.mobileSrc || ''}
                  onChange={(url) => updateHero('mobileSrc', url)}
                  helpText="Recommended: 800×400 px"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Header Display Title
                </label>
                <input
                  type="text"
                  value={heroSec.content?.title || pageTitle}
                  onChange={(e) => {
                    setPageTitle(e.target.value);
                    updateHero('title', e.target.value);
                  }}
                  className="px-3.5 py-2 neu-input rounded-xl text-xs font-bold"
                  placeholder="Page Header Title"
                />
              </div>
            </div>

            {/* CARD 2: Contact Us Specific Fields */}
            {selectedSlug === 'info/contact-us' && (
              <div className="p-5 bg-card neu-extruded-sm rounded-2xl border border-border/20 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Customer Care & Contact Channels
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span>Support Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={contactSec?.content?.email || ''}
                      onChange={(e) => {
                        const list = [...sections];
                        let cIdx = list.findIndex(s => s.type === 'ContactCard');
                        if (cIdx < 0) {
                          list.push({
                            id: `temp-${Date.now()}`,
                            type: 'ContactCard',
                            sort_order: 1,
                            content: { email: e.target.value, phone: '', hours: '', address: '' },
                            is_visible: true
                          });
                        } else {
                          list[cIdx].content = { ...list[cIdx].content, email: e.target.value };
                        }
                        setSections(list);
                      }}
                      placeholder="support@perfumebooth.com"
                      className="px-3.5 py-2 neu-input rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>Phone Hotline Number(s)</span>
                    </label>
                    <input
                      type="text"
                      value={contactSec?.content?.phone || ''}
                      onChange={(e) => {
                        const list = [...sections];
                        let cIdx = list.findIndex(s => s.type === 'ContactCard');
                        if (cIdx < 0) {
                          list.push({
                            id: `temp-${Date.now()}`,
                            type: 'ContactCard',
                            sort_order: 1,
                            content: { email: '', phone: e.target.value, hours: '', address: '' },
                            is_visible: true
                          });
                        } else {
                          list[cIdx].content = { ...list[cIdx].content, phone: e.target.value };
                        }
                        setSections(list);
                      }}
                      placeholder="+91 9266030909 / 011-46604937"
                      className="px-3.5 py-2 neu-input rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Operating Hours</span>
                    </label>
                    <input
                      type="text"
                      value={contactSec?.content?.hours || ''}
                      onChange={(e) => {
                        const list = [...sections];
                        let cIdx = list.findIndex(s => s.type === 'ContactCard');
                        if (cIdx < 0) {
                          list.push({
                            id: `temp-${Date.now()}`,
                            type: 'ContactCard',
                            sort_order: 1,
                            content: { email: '', phone: '', hours: e.target.value, address: '' },
                            is_visible: true
                          });
                        } else {
                          list[cIdx].content = { ...list[cIdx].content, hours: e.target.value };
                        }
                        setSections(list);
                      }}
                      placeholder="Monday to Saturday, 10:00 AM – 6:00 PM IST"
                      className="px-3.5 py-2 neu-input rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <ResizableTextarea
                      label="Warehouse / Registered Office"
                      value={contactSec?.content?.address || ''}
                      onChange={(e) => {
                        const list = [...sections];
                        let cIdx = list.findIndex(s => s.type === 'ContactCard');
                        if (cIdx < 0) {
                          list.push({
                            id: `temp-${Date.now()}`,
                            type: 'ContactCard',
                            sort_order: 1,
                            content: { email: '', phone: '', hours: '', address: e.target.value },
                            is_visible: true
                          });
                        } else {
                          list[cIdx].content = { ...list[cIdx].content, address: e.target.value };
                        }
                        setSections(list);
                      }}
                      placeholder="70B/35A, Rama Road Industrial Area, New Delhi – 110015"
                      rows={2}
                      minHeight={60}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CARD 2: FAQ Specific Accordion Builder */}
            {selectedSlug === 'info/faq' && (
              <div className="p-5 bg-card neu-extruded-sm rounded-2xl border border-border/20 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                      Frequently Asked Questions ({(faqSec?.content?.faqs || []).length})
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const list = [...sections];
                      let fIdx = list.findIndex(s => s.type === 'FaqList');
                      const newFaq = { q: 'New question?', a: 'Answer description...' };
                      if (fIdx < 0) {
                        list.push({
                          id: `temp-${Date.now()}`,
                          type: 'FaqList',
                          sort_order: 1,
                          content: { title: 'Frequently Asked Questions', faqs: [newFaq] },
                          is_visible: true
                        });
                      } else {
                        const faqs = [...(list[fIdx].content.faqs || []), newFaq];
                        list[fIdx].content = { ...list[fIdx].content, faqs };
                      }
                      setSections(list);
                    }}
                    className="px-3 py-1.5 neu-btn text-xs font-bold text-primary flex items-center gap-1 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {(faqSec?.content?.faqs || []).map((faq: any, fIdx: number) => (
                    <div key={fIdx} className="p-4 bg-muted/20 border border-border/30 rounded-2xl flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-primary">
                          Question #{fIdx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={fIdx === 0}
                            onClick={() => {
                              const list = [...sections];
                              const fIdxPos = list.findIndex(s => s.type === 'FaqList');
                              if (fIdxPos >= 0) {
                                const faqs = [...(list[fIdxPos].content.faqs || [])];
                                const temp = faqs[fIdx];
                                faqs[fIdx] = faqs[fIdx - 1];
                                faqs[fIdx - 1] = temp;
                                list[fIdxPos].content = { ...list[fIdxPos].content, faqs };
                                setSections(list);
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={fIdx === (faqSec?.content?.faqs || []).length - 1}
                            onClick={() => {
                              const list = [...sections];
                              const fIdxPos = list.findIndex(s => s.type === 'FaqList');
                              if (fIdxPos >= 0) {
                                const faqs = [...(list[fIdxPos].content.faqs || [])];
                                const temp = faqs[fIdx];
                                faqs[fIdx] = faqs[fIdx + 1];
                                faqs[fIdx + 1] = temp;
                                list[fIdxPos].content = { ...list[fIdxPos].content, faqs };
                                setSections(list);
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = [...sections];
                              const fIdxPos = list.findIndex(s => s.type === 'FaqList');
                              if (fIdxPos >= 0) {
                                const faqs = [...(list[fIdxPos].content.faqs || [])];
                                faqs.splice(fIdx, 1);
                                list[fIdxPos].content = { ...list[fIdxPos].content, faqs };
                                setSections(list);
                              }
                            }}
                            className="text-muted-foreground hover:text-rose-500 p-1 ml-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={faq.q || ''}
                        onChange={(e) => {
                          const list = [...sections];
                          const fIdxPos = list.findIndex(s => s.type === 'FaqList');
                          if (fIdxPos >= 0) {
                            const faqs = [...(list[fIdxPos].content.faqs || [])];
                            faqs[fIdx].q = e.target.value;
                            list[fIdxPos].content = { ...list[fIdxPos].content, faqs };
                            setSections(list);
                          }
                        }}
                        placeholder="e.g. How long does standard shipping take?"
                        className="px-3.5 py-2 neu-input rounded-xl text-xs font-bold"
                      />

                      <ResizableTextarea
                        value={faq.a || ''}
                        onChange={(e) => {
                          const list = [...sections];
                          const fIdxPos = list.findIndex(s => s.type === 'FaqList');
                          if (fIdxPos >= 0) {
                            const faqs = [...(list[fIdxPos].content.faqs || [])];
                            faqs[fIdx].a = e.target.value;
                            list[fIdxPos].content = { ...list[fIdxPos].content, faqs };
                            setSections(list);
                          }
                        }}
                        rows={2}
                        minHeight={65}
                        placeholder="Answer details..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CARD 3: Editorial WYSIWYG Content (All Policies + About Us + notes) */}
            <div className="p-5 bg-card neu-extruded-sm rounded-2xl border border-border/20 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>
                    {selectedSlug === 'info/contact-us' 
                      ? 'Introductory Care Note' 
                      : selectedSlug === 'info/faq'
                      ? 'Supplementary Help Guidelines'
                      : 'Editorial & Legal Policy Body'}
                  </span>
                </h4>
                <span className="text-[10px] text-muted-foreground">Full WYSIWYG Formatted Content</span>
              </div>

              <div className="neu-inset rounded-2xl p-2 bg-card">
                <CKEditorWrapper
                  value={richSec?.content?.body || ''}
                  onChange={(val) => {
                    const list = [...sections];
                    let richIdx = list.findIndex(s => s.type === 'RichText');
                    if (richIdx < 0) {
                      list.push({
                        id: `temp-${Date.now()}`,
                        type: 'RichText',
                        sort_order: 2,
                        content: { title: pageTitle, body: val },
                        is_visible: true
                      });
                    } else {
                      list[richIdx].content = { ...list[richIdx].content, body: val };
                    }
                    setSections(list);
                  }}
                  placeholder="Write page content here..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InfoPagesManager() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-border/20 text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading Page Content...</p>
        </div>
      }
    >
      <InfoPagesContent />
    </Suspense>
  );
}
