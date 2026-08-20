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
  Image as ImageIcon
} from 'lucide-react';

const CKEditorWrapper = dynamic(() => import('@/components/cms/CKEditorWrapper'), {
  ssr: false,
  loading: () => <div className="p-4 bg-muted border border-border rounded-xl text-xs text-muted-foreground animate-pulse">Loading CKEditor...</div>
});

interface CMSSection {
  id: string;
  type: 'HeroBanner' | 'ProductGrid' | 'Testimonials' | 'RichText' | 'FaqList' | 'ContactCard';
  sort_order: number;
  content: Record<string, any>;
  is_visible: boolean;
}

export default function CMSBuilderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string>('info/about-us');
  
  // Page Edit States
  const [pageTitle, setPageTitle] = useState('');
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    handleLoadPage('info/about-us');
  }, []);

  const handleLoadPage = async (slug: string) => {
    setSelectedSlug(slug);
    setPageLoading(true);
    try {
      const data = await apiFetch(`/cms/pages/${slug}/`);
      setPageTitle(data.title);
      
      let loadedSecs: CMSSection[] = data.sections || [];
      // Ensure page has appropriate editor section if empty
      if (loadedSecs.length === 0) {
        if (slug === 'info/faq') {
          loadedSecs = [{
            id: `temp-${Date.now()}`,
            type: 'FaqList',
            sort_order: 0,
            content: { title: 'Frequently Asked Questions', faqs: [] },
            is_visible: true
          }];
        } else if (slug === 'info/contact-us') {
          loadedSecs = [{
            id: `temp-${Date.now()}`,
            type: 'ContactCard',
            sort_order: 0,
            content: { email: '', phone: '', hours: '', address: '' },
            is_visible: true
          }];
        } else {
          loadedSecs = [{
            id: `temp-${Date.now()}`,
            type: 'RichText',
            sort_order: 0,
            content: { title: data.title, body: '' },
            is_visible: true
          }];
        }
      }
      setSections(loadedSecs);
    } catch (err) {
      console.error(err);
    } finally {
      setPageLoading(false);
      setLoading(false);
    }
  };

  const getMainSectionIndex = (): number => {
    if (sections.length === 0) return -1;
    if (selectedSlug === 'info/faq') {
      const idx = sections.findIndex(s => s.type === 'FaqList');
      return idx >= 0 ? idx : 0;
    }
    if (selectedSlug === 'info/contact-us') {
      const idx = sections.findIndex(s => s.type === 'ContactCard');
      return idx >= 0 ? idx : 0;
    }
    const idx = sections.findIndex(s => s.type === 'RichText');
    return idx >= 0 ? idx : 0;
  };

  const handleUpdateContent = (field: string, value: any) => {
    const mainIdx = getMainSectionIndex();
    if (mainIdx < 0) return;
    const list = [...sections];
    list[mainIdx].content = {
      ...list[mainIdx].content,
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
          meta_title: pageTitle,
          is_published: true,
          sections: sections
        })
      });
      alert('Page text content saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save page content.');
    } finally {
      setSaveLoading(false);
    }
  };

  const mainIdx = getMainSectionIndex();
  const mainSec = mainIdx >= 0 ? sections[mainIdx] : null;

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] max-w-7xl mx-auto w-full">
      {/* Top Navigation Sub-Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => router.push('/cms')}
          className="px-5 py-2.5 font-semibold text-sm border-b-2 border-primary text-primary flex items-center gap-2 bg-muted/40 rounded-t-xl"
        >
          <Layout className="w-4 h-4" />
          <span>Info Pages Content Editor</span>
        </button>
        <button
          onClick={() => router.push('/cms/banners')}
          className="px-5 py-2.5 font-semibold text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-t-xl transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Header Banners & Slideshows</span>
        </button>
      </div>

      {/* Top Header Bar Controls */}
      <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground">Page Text Editor</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Select any info page to edit its text, policy paragraphs, and details directly</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Select Page to Edit</span>
            <select 
              value={selectedSlug} 
              onChange={(e) => handleLoadPage(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-xs font-semibold text-foreground cursor-pointer min-w-[280px]"
            >
              <optgroup label="Information & Pages">
                <option value="info/about-us">About Us (/info/about-us)</option>
                <option value="info/contact-us">Contact Us (/info/contact-us)</option>
                <option value="info/disclaimers">Disclaimers (/info/disclaimers)</option>
                <option value="info/faq">FAQ (/info/faq)</option>
              </optgroup>
              <optgroup label="Legal Policies">
                <option value="info/policies/privacy">Privacy Policy (/info/policies/privacy)</option>
                <option value="info/policies/shipping">Shipping Policy (/info/policies/shipping)</option>
                <option value="info/policies/refund">Refund and Return Policy (/info/policies/refund)</option>
                <option value="info/policies/terms">Terms and Conditions (/info/policies/terms)</option>
              </optgroup>
            </select>
          </div>

          <a
            href={`http://localhost:3000/${selectedSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 hover:bg-muted text-foreground border border-border font-semibold rounded-xl text-xs transition duration-200 mt-4 cursor-pointer"
            title="Open live storefront page in a new tab"
          >
            <span>View Live</span>
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>

          <button
            onClick={handleSaveLayout}
            disabled={saveLoading}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-xs disabled:opacity-50 mt-4"
          >
            {saveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Text Changes</span>
          </button>
        </div>
      </div>

      {pageLoading ? (
        <div className="flex-1 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 glass-card p-6 rounded-2xl border border-border overflow-y-auto flex flex-col gap-6">
          {mainSec && (
            <>
              {/* ARTICLE / POLICY / BLOG EDITOR */}
              {selectedSlug !== 'info/faq' && selectedSlug !== 'info/contact-us' && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Page Headline / Article Title</label>
                    <input
                      type="text"
                      value={mainSec.content.title || pageTitle || ''}
                      onChange={(e) => {
                        setPageTitle(e.target.value);
                        handleUpdateContent('title', e.target.value);
                      }}
                      placeholder="e.g. Privacy Policy & Terms of Use"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-semibold text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Rich Text Editor (CKEditor)</label>
                    <CKEditorWrapper
                      value={mainSec.content.body || ''}
                      onChange={(data) => handleUpdateContent('body', data)}
                      placeholder="Write policy details, paragraphs, lists, or story content..."
                    />
                  </div>
                </div>
              )}

              {/* CONTACT US EDITOR */}
              {selectedSlug === 'info/contact-us' && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Support Email Address</label>
                      <input
                        type="text"
                        value={mainSec.content.email || ''}
                        onChange={(e) => handleUpdateContent('email', e.target.value)}
                        placeholder="e.g. admin@perfumebooth.com"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Contact Phone Numbers</label>
                      <input
                        type="text"
                        value={mainSec.content.phone || ''}
                        onChange={(e) => handleUpdateContent('phone', e.target.value)}
                        placeholder="e.g. +91 9266030909 / 011-46604937"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Support Business Hours</label>
                      <input
                        type="text"
                        value={mainSec.content.hours || ''}
                        onChange={(e) => handleUpdateContent('hours', e.target.value)}
                        placeholder="e.g. Mon to Sat, 10am to 6pm"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Head Office Postal Address</label>
                      <input
                        type="text"
                        value={mainSec.content.address || ''}
                        onChange={(e) => handleUpdateContent('address', e.target.value)}
                        placeholder="e.g. 70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FAQ EDITOR */}
              {selectedSlug === 'info/faq' && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">FAQ Section Headline</label>
                    <input
                      type="text"
                      value={mainSec.content.title || 'Frequently Asked Questions'}
                      onChange={(e) => handleUpdateContent('title', e.target.value)}
                      placeholder="e.g. Frequently Asked Questions"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-3 mt-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Questions & Answers Dataset</label>
                    <div className="flex flex-col gap-4">
                      {(mainSec.content.faqs || []).map((faqItem: any, fIdx: number) => (
                        <div key={fIdx} className="p-4 bg-muted/30 border border-border rounded-xl flex flex-col gap-3 relative group">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-primary uppercase">Question #{fIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...(mainSec.content.faqs || [])];
                                list.splice(fIdx, 1);
                                handleUpdateContent('faqs', list);
                              }}
                              className="text-red-400 hover:text-red-300 text-xs p-1"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Enter question text..."
                            value={faqItem.q}
                            onChange={(e) => {
                              const list = [...(mainSec.content.faqs || [])];
                              list[fIdx].q = e.target.value;
                              handleUpdateContent('faqs', list);
                            }}
                            className="px-3.5 py-2 bg-background border border-border rounded-lg text-xs font-semibold"
                          />
                          <textarea
                            placeholder="Enter detailed answer..."
                            value={faqItem.a}
                            onChange={(e) => {
                              const list = [...(mainSec.content.faqs || [])];
                              list[fIdx].a = e.target.value;
                              handleUpdateContent('faqs', list);
                            }}
                            rows={3}
                            className="px-3.5 py-2 bg-background border border-border rounded-lg text-xs"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...(mainSec.content.faqs || [])];
                          list.push({ q: 'New Question?', a: 'Detailed answer response here.' });
                          handleUpdateContent('faqs', list);
                        }}
                        className="flex items-center justify-center gap-2 py-3 border border-dashed border-border hover:border-primary text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground transition duration-150 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 text-primary" />
                        <span>Add New Question & Answer</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
