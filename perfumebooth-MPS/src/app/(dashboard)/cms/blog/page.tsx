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
  Edit,
  Eye,
  EyeOff,
  Search,
  BookOpen,
  Image as ImageIcon,
  Clock,
  User,
  X
} from 'lucide-react';

const CKEditorWrapper = dynamic(() => import('@/components/cms/CKEditorWrapper'), {
  ssr: false,
  loading: () => <div className="p-4 bg-muted border border-border rounded-xl text-xs text-muted-foreground animate-pulse">Loading CKEditor...</div>
});

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  cover_image: string;
  excerpt: string;
  content_html: string;
  tags: string[];
  read_time: string;
  is_published: boolean;
  published_at: string;
  updated_at: string;
}

export default function CMSBlogManagerPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [author, setAuthor] = useState('PerfumeBooth Editorial');
  const [coverImage, setCoverImage] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [tagsInput, setTagsInput] = useState('Perfumes, Fragrance');
  const [readTime, setReadTime] = useState('5 min read');
  const [isPublished, setIsPublished] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/cms/blogs/?merchant=true');
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPostId(null);
    setTitle('');
    setSlug('');
    setAuthor('PerfumeBooth Editorial');
    setCoverImage('https://cdn.shopify.com/s/files/1/0718/5786/4996/files/drifter-white-bg_f9e6aa82-fe9d-4c5c-9b7a-3aa35f1f02f5.jpg?v=1756122933');
    setExcerpt('');
    setContentHtml('<h3>Scent Notes & Insights</h3><p>Write your blog post article content here...</p>');
    setTagsInput('Perfumes, Lifestyle');
    setReadTime('5 min read');
    setIsPublished(true);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (post: BlogPost) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setAuthor(post.author || 'PerfumeBooth Editorial');
    setCoverImage(post.cover_image || '');
    setExcerpt(post.excerpt || '');
    setContentHtml(post.content_html || '');
    setTagsInput((post.tags || []).join(', '));
    setReadTime(post.read_time || '5 min read');
    setIsPublished(post.is_published);
    setIsEditorOpen(true);
  };

  const handleSavePost = async () => {
    if (!title.trim()) {
      alert('Please enter an article title.');
      return;
    }

    setSaveLoading(true);
    const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      author,
      cover_image: coverImage,
      excerpt,
      content_html: contentHtml,
      tags: tagsArray,
      read_time: readTime,
      is_published: isPublished
    };

    try {
      if (editingPostId) {
        await apiFetch(`/cms/blogs/${editingPostId}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/cms/blogs/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsEditorOpen(false);
      fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to save blog post.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      await apiFetch(`/cms/blogs/${post.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: !post.is_published })
      });
      fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to update publish status.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog article?')) return;
    try {
      await apiFetch(`/cms/blogs/${postId}/`, { method: 'DELETE' });
      fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete blog article.');
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] max-w-7xl mx-auto w-full">
      {/* Top Navigation Sub-Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => router.push('/cms')}
          className="px-5 py-2.5 font-semibold text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-t-xl transition-colors cursor-pointer"
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
        <button
          onClick={() => router.push('/cms/blog')}
          className="px-5 py-2.5 font-semibold text-sm border-b-2 border-primary text-primary flex items-center gap-2 bg-muted/40 rounded-t-xl"
        >
          <BookOpen className="w-4 h-4" />
          <span>Blog Articles & Journal</span>
        </button>
      </div>

      {/* Header & Controls Bar */}
      <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span>Blog & Fragrance Journal Manager</span>
            <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-mono font-bold">
              {posts.length} Articles
            </span>
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">Publish articles, scent note guides, and news for your storefront journal</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search blog articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary w-[220px]"
            />
          </div>

          <a
            href="http://localhost:3000/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-muted/60 hover:bg-muted text-foreground border border-border font-semibold rounded-xl text-xs transition duration-200 cursor-pointer"
          >
            <span>View Journal</span>
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition duration-200 cursor-pointer text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Article</span>
          </button>
        </div>
      </div>

      {/* Blog Articles Grid / List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex-1 glass-card p-10 rounded-2xl border border-border flex flex-col items-center justify-center text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-semibold">No blog articles found</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Create New Article" above to publish your first journal story.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
          {filteredPosts.map((post, index) => (
            <div 
              key={post.id} 
              className="glass-card p-4 rounded-2xl border border-border flex items-center justify-between gap-4 group hover:border-border/80 hover:bg-muted/20 transition duration-200"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Number Badge */}
                <div className="w-9 h-9 rounded-xl bg-muted/80 border border-border text-foreground font-mono font-semibold text-xs flex items-center justify-center shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </div>

                {/* Thumbnail */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted/40 border border-border shrink-0">
                  {post.cover_image ? (
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-6 h-6 opacity-40" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm truncate">{post.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium tracking-wider uppercase shrink-0 ${
                      post.is_published ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}>
                      {post.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{post.excerpt || 'No excerpt summary.'}</p>

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-1.5 font-medium">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="w-3 h-3 text-muted-foreground" />
                      {post.author}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {post.read_time}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-muted-foreground">/blog/{post.slug}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0 pl-3 border-l border-border/50">
                <a
                  href={`http://localhost:3000/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-muted/60 hover:bg-muted text-foreground border border-border font-medium rounded-xl text-xs transition duration-150 cursor-pointer"
                  title="Preview article on storefront"
                >
                  <span>Preview</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePublish(post)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition duration-150"
                    title={post.is_published ? 'Unpublish to Draft' : 'Publish Live'}
                  >
                    {post.is_published ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-zinc-500" />}
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(post)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition duration-150"
                    title="Edit Article"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </button>

                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition duration-150"
                    title="Delete Article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span>{editingPostId ? 'Edit Blog Article' : 'Create New Blog Article'}</span>
              </h2>
              <button 
                onClick={() => setIsEditorOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Article Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!editingPostId) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    placeholder="e.g. Guide to Fragrance Notes"
                    className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">URL Slug (/blog/[slug])</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. guide-to-fragrance-notes"
                    className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Author Name</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Read Time</label>
                  <input
                    type="text"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    placeholder="e.g. 5 min read"
                    className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Perfumes, Oud, Notes"
                    className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Cover Image URL</label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Short Excerpt / Card Summary</label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Write a 1-2 sentence preview for article cards..."
                  className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Full Article Content (CKEditor)</label>
                <CKEditorWrapper
                  value={contentHtml}
                  onChange={(data) => setContentHtml(data)}
                  placeholder="Write story content, headings, lists, or reviews..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pub_check"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-primary bg-background border-border"
                />
                <label htmlFor="pub_check" className="text-xs font-semibold text-foreground cursor-pointer">
                  Publish article live on storefront journal
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="px-5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                disabled={saveLoading}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow-lg hover:shadow-primary/20 cursor-pointer disabled:opacity-50"
              >
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Article</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
