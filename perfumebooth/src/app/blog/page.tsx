import { getBlog } from "@/lib/catalog";

export const metadata = {
  title: "The Journal | Exclusive Perfume Booth",
  description: "Read our latest stories and news.",
};

import BlogCard from "@/components/blog/BlogCard";

export default async function BlogArchivePage() {
  const blogData = await getBlog("news", 20);
  const articles = blogData?.articles || [];

  return (
    <main className="min-h-screen bg-[var(--color-surface)]">
      {/* Exclusive Header */}
      <section className="pt-32 pb-16 text-center px-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-black mb-4">
          The Journal
        </h1>
        <p className="text-sm md:text-base text-[var(--color-text-muted)] uppercase tracking-[0.2em]">
          {blogData?.title || "News & Stories"}
        </p>
      </section>

      {/* Grid Container */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        {articles.length === 0 ? (
          <div className="text-center text-[var(--color-text-muted)] py-20 font-serif text-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] max-w-2xl mx-auto">
            No stories found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <BlogCard 
                key={article.id} 
                article={article} 
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
