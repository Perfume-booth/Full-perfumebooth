import { Article, BlogData } from "./types";


const MOCK_ARTICLES: Article[] = [
  {
    id: "art-1",
    handle: "how-to-make-your-perfume-last-longer",
    title: "How to Make Your Perfume Last All Day",
    excerpt: "Discover the secrets of fragrance layering, pulse points application, and proper storage methods to keep your signature scent active from morning to night.",
    content: "Full guide here...",
    contentHtml: "<p>Apply perfume to your pulse points. These areas emit heat, which helps diffuse the fragrance across your skin.</p><p>Layering with scented body lotion is another great tip.</p>",
    publishedAt: new Date().toISOString(),
    authorV2: { name: "Perfume Expert" },
    image: {
      url: "/placeholder-review-img.jpg",
      altText: "How to apply perfume"
    }
  },
  {
    id: "art-2",
    handle: "guide-to-fragrance-notes-for-beginners",
    title: "The Beginner's Guide to Fragrance Notes",
    excerpt: "Understand the scent pyramid. Learn how top, middle, and base notes interact to create your favorite perfume combinations.",
    content: "Full guide here...",
    contentHtml: "<p>Fragrances are composed of three layers: top, middle (heart), and base notes.</p><p>Top notes are what you smell initially, middle notes emerge after a few minutes, and base notes linger for hours.</p>",
    publishedAt: new Date().toISOString(),
    authorV2: { name: "Master Perfumer" },
    image: {
      url: "/placeholder-review-img.jpg",
      altText: "Fragrance scent pyramid"
    }
  }
];

const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_URL || 'http://localhost:8000';

export async function getBlog(handle: string = 'news', first: number = 20): Promise<BlogData> {
  try {
    const res = await fetch(`${DJANGO_URL}/api/cms/blogs/`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Failed to fetch blog posts');
    const posts = await res.json();
    const articles: Article[] = posts.slice(0, first).map((p: any) => ({
      id: p.id,
      handle: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content_html,
      contentHtml: p.content_html,
      publishedAt: p.published_at,
      authorV2: { name: p.author },
      image: p.cover_image ? { url: p.cover_image, altText: p.title } : undefined,
      tags: p.tags || []
    }));
    return {
      title: "Fragrance Journal & Stories",
      articles
    };
  } catch (err) {
    console.error('Failed to fetch blog posts from backend:', err);
    return { title: "News & Stories", articles: [] };
  }
}

export async function getBlogArticles(handle: string = 'news', first: number = 10): Promise<Article[]> {
  const blog = await getBlog(handle, first);
  return blog.articles || [];
}

export async function getArticle(blogHandle: string, articleHandle: string): Promise<Article | null> {
  try {
    const res = await fetch(`${DJANGO_URL}/api/cms/blogs/${articleHandle}/`, { next: { revalidate: 60 } });
    if (!res.ok) {
      // Fallback: search in list
      const blog = await getBlog('news', 50);
      return blog.articles.find((a: any) => a.handle === articleHandle) || null;
    }
    const p = await res.json();
    return {
      id: p.id,
      handle: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content_html,
      contentHtml: p.content_html,
      publishedAt: p.published_at,
      authorV2: { name: p.author },
      image: p.cover_image ? { url: p.cover_image, altText: p.title } : undefined,
      tags: p.tags || []
    };
  } catch (err) {
    console.error('Failed to fetch article detail from backend:', err);
    return null;
  }
}

export async function getCMSPage(slug: string) {
  try {
    const res = await fetch(`${DJANGO_URL}/api/cms/pages/${slug}/`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`CMS Page ${slug} not found`);
    const data = await res.json();

    let bodyHtml = '';
    let contactInfo = { email: '', phone: '', hours: '', address: '' };
    let faqs: { q: string; a: string }[] = [];

    if (Array.isArray(data.sections)) {
      data.sections.forEach((sec: any) => {
        if (!sec.is_visible) return;

        if (sec.type === 'RichText' && sec.content) {
          if (sec.content.body) {
            bodyHtml += sec.content.body;
          }
        } else if (sec.type === 'ContactCard' && sec.content) {
          contactInfo = {
            email: sec.content.email || '',
            phone: sec.content.phone || '',
            hours: sec.content.hours || '',
            address: sec.content.address || ''
          };
        } else if (sec.type === 'FaqList' && sec.content) {
          if (Array.isArray(sec.content.faqs)) {
            faqs = sec.content.faqs;
          }
        }
      });
    }

    // If FaqList, format faqs into styled HTML if bodyHtml is empty
    if (faqs.length > 0 && !bodyHtml.trim()) {
      bodyHtml = faqs.map((faq: any, idx: number) => `
        <div style="margin-bottom: 24px; padding: 20px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface);">
          <h3 style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: var(--color-text-primary);">${idx + 1}. ${faq.q}</h3>
          <p style="font-size: 14px; color: var(--color-text-muted); line-height: 1.6;">${faq.a}</p>
        </div>
      `).join('');
    }

    return {
      title: data.title || '',
      body: bodyHtml,
      contactInfo,
      faqs,
      sections: data.sections || []
    };
  } catch (err) {
    console.error(`Failed to fetch CMS page ${slug}:`, err);
    return null;
  }
}

export async function getAboutUs() {
  const page = await getCMSPage('info/about-us');
  return page || {
    title: "About Us",
    body: "<p>Welcome to Perfume Booth. We are your premium destination for exquisite fragrances.</p>"
  };
}

export async function getContactUs() {
  const page = await getCMSPage('info/contact-us');
  return page || {
    title: "Contact Us",
    body: "",
    contactInfo: { email: 'admin@perfumebooth.com', phone: '+91 9266030909 / 011-46604937', hours: 'Mon to Sat, 10am to 6pm', address: '70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015' }
  };
}

export async function getDisclaimers() {
  const page = await getCMSPage('info/disclaimers');
  return page || {
    title: "Disclaimers",
    body: "<p>Fragrance notes represent olfactory profiles and are meant as product guidelines only.</p>"
  };
}

export async function getFaq() {
  const page = await getCMSPage('info/faq');
  return page || {
    title: "Frequently Asked Questions",
    body: "<p>Find answers to common questions about shipping, payments, returns, and scent longevity.</p>"
  };
}

export async function getPrivacyPolicy() {
  const page = await getCMSPage('info/policies/privacy');
  return page || {
    title: "Privacy Policy",
    body: "<p>Your privacy is important to us. Read how we protect and manage your personal data.</p>"
  };
}

export async function getRefundPolicy() {
  const page = await getCMSPage('info/policies/refund');
  return page || {
    title: "Refund Policy",
    body: "<p>We offer hassle-free refunds and exchanges within 14 days of delivery for qualifying items.</p>"
  };
}

export async function getShippingPolicy() {
  const page = await getCMSPage('info/policies/shipping');
  return page || {
    title: "Shipping Policy",
    body: "<p>Complimentary standard shipping is provided for all orders of ₹999 or above.</p>"
  };
}

export async function getTermsAndConditions() {
  const page = await getCMSPage('info/policies/terms');
  return page || {
    title: "Terms and Conditions",
    body: "<p>Please review our terms of service, payment policies, and order cancellation guidelines.</p>"
  };
}
