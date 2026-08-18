import { getArticle, getBlogArticles } from "@/lib/shopify";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatedFacebook as Facebook } from "@/components/ui/icons/AnimatedFacebook";
import { AnimatedXSocial as X } from "@/components/ui/icons/AnimatedXSocial";
import { AnimatedMail as Mail } from "@/components/ui/icons/AnimatedMail";
import { AnimatedShare2 as Share2 } from "@/components/ui/icons/AnimatedShare2";
import { AnimatedArrowLeft as ArrowLeft } from "@/components/ui/icons/AnimatedArrowLeft";
import { AnimatedGrid3X3 as Grid3X3 } from "@/components/ui/icons/AnimatedGrid3X3";
import { AnimatedCalendarDays as CalendarDays } from "@/components/ui/icons/AnimatedCalendarDays";
import { AnimatedUser as User } from "@/components/ui/icons/AnimatedUser";
import RelatedArticlesCarousel from "@/components/blog/RelatedArticlesCarousel";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [article, allArticles] = await Promise.all([
    getArticle("news", slug),
    getBlogArticles("news", 10),
  ]);

  if (!article) notFound();

  const relatedArticles = allArticles.filter((rel: any) => rel.id !== article.id);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[var(--color-bg)]">

      {/* ── Hero Banner ── */}
      <section className="relative w-full h-[320px] md:h-[480px] overflow-hidden">
        {article.image ? (
          <Image
            src={article.image.url}
            alt={article.image.altText || article.title}
            fill
            className="object-contain"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-text-primary)] to-[var(--color-text-secondary)]" />
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/75" />

        {/* Gold top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />

        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">

          {/* Meta row */}
          <div className="flex items-center gap-5 mt-5 text-white/70 text-xs uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} animateOn="view" />
              {formattedDate}
            </span>
            {article.authorV2?.name && (
              <>
                <span className="w-1 h-1 rounded-full bg-[var(--color-gold)] inline-block" />
                <span className="flex items-center gap-1.5">
                  <User size={12} animateOn="view" />
                  {article.authorV2.name}
                </span>
              </>
            )}
          </div>

          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="h-px w-16 bg-white/25" />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
            <div className="h-px w-16 bg-white/25" />
          </div>
        </div>

        
      </section>

      {/* ── Article Body ── */}
      <article className="max-w-3xl mx-auto px-6 py-10 md:py-14 bg-[var(--color-bg)]">

        {/* Article content with rich-text styling */}
        <div
          className="rich-text"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {/* ── Divider ── */}
        <div className="my-12 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

        {/* ── Tags row ── */}
        <div className="flex items-center gap-3 mb-8 text-xs text-[var(--color-text-muted)]">
          <svg className="w-4 h-4 text-[var(--color-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <div className="flex flex-wrap gap-2 uppercase tracking-widest font-semibold">
            <Link href="#" className="hover:text-[var(--color-gold)] transition-colors">Perfumes</Link>
            <span className="text-[var(--color-border)]">·</span>
            <Link href="#" className="hover:text-[var(--color-gold)] transition-colors">Lifestyle</Link>
          </div>
        </div>

        {/* ── Share ── */}
        <div className="flex items-center gap-4 mb-10">
          <span className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] font-medium">Share</span>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg)] flex items-center justify-center hover:bg-[#3b5998] hover:text-white transition-colors" aria-label="Share on Facebook">
              <Facebook size={14} fill="currentColor" strokeWidth={0} animateOn="hover" />
            </button>
            <button className="w-8 h-8 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg)] flex items-center justify-center hover:bg-[#000000] hover:text-white transition-colors" aria-label="Share on X">
              <X size={14} fill="currentColor" strokeWidth={0} animateOn="hover" />
            </button>
            <button className="w-8 h-8 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg)] flex items-center justify-center hover:bg-[#c0392b] hover:text-white transition-colors" aria-label="Share via Email">
              <Mail size={14} strokeWidth={2} animateOn="hover" />
            </button>
            <button className="w-8 h-8 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg)] flex items-center justify-center hover:bg-[var(--color-gold)] hover:text-white transition-colors" aria-label="Copy Link">
              <Share2 size={14} strokeWidth={2} animateOn="hover" />
            </button>
          </div>
        </div>

        {/* ── Back / Grid nav ── */}
        <div className="flex items-center gap-6 text-[var(--color-gold)]">
          <Link href="/blog" className="flex items-center gap-2 text-sm hover:text-[var(--color-gold-dark)] transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" animateOn="hover" />
            Back to Blog
          </Link>
          <Link href="/blog" className="flex items-center gap-2 text-sm hover:text-[var(--color-gold-dark)] transition-colors">
            <Grid3X3 size={16} animateOn="hover" />
            All Articles
          </Link>
        </div>
      </article>

      {/* ── Related Articles ── */}
      <RelatedArticlesCarousel articles={relatedArticles} />

    </main>
  );
}