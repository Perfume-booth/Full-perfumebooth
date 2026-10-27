import { Article, BlogData, unwrapApiData, ensureArray } from "./types";


const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_URL || 'http://localhost:8000';

export async function getBlog(_handle: string = 'news', first: number = 20): Promise<BlogData> {
  try {
    const res = await fetch(`${DJANGO_URL}/api/cms/blogs/`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Failed to fetch blog posts');
    const rawPosts = await res.json();
    const posts = ensureArray(rawPosts);
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
      tags: p.tags ? (Array.isArray(p.tags) ? p.tags : String(p.tags).split(' ')) : []
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
    const rawData = await res.json();
    const p = unwrapApiData(rawData);
    if (!p || typeof p !== 'object' || !p.id) return null;
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
      tags: p.tags ? (Array.isArray(p.tags) ? p.tags : String(p.tags).split(' ')) : []
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
    const rawData = await res.json();
    const data = unwrapApiData(rawData) || {};

    let bodyHtml = '';
    let contactInfo = { email: '', phone: '', hours: '', address: '' };
    let faqs: { q: string; a: string }[] = [];
    let hero = { title: '', subtitle: '', desktopSrc: '', mobileSrc: '', buttonText: '', buttonLink: '', slides: [] as any[] };

    if (Array.isArray(data.sections)) {
      data.sections.forEach((sec: any) => {
        if (!sec.is_visible) return;

        if (sec.type === 'HeroBanner' && sec.content) {
          hero = {
            title: sec.content.title || '',
            subtitle: sec.content.subtitle || '',
            desktopSrc: sec.content.desktopSrc || sec.content.imageUrl || sec.content.desktopImage || '',
            mobileSrc: sec.content.mobileSrc || sec.content.mobileImageUrl || sec.content.mobileImage || '',
            buttonText: sec.content.buttonText || '',
            buttonLink: sec.content.buttonLink || '',
            slides: sec.content.slides || []
          };
        } else if (sec.type === 'RichText' && sec.content) {
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
      bodyHtml = faqs.map((faq: any) => `
        <h3 style="border-left: 2px solid var(--color-gold, #b8924a); padding-left: 0.75rem; font-size: 0.95rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: var(--color-text-primary);">${faq.q}</h3>
        <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.75; margin-bottom: 1rem;">Answer: ${faq.a}</p>
      `).join('');
    }

    return {
      title: data.title || '',
      meta_title: data.meta_title || '',
      meta_description: data.meta_description || '',
      body: bodyHtml,
      contactInfo,
      faqs,
      hero,
      sections: data.sections || []
    };
  } catch (err) {
    console.error(`Failed to fetch CMS page ${slug}:`, err);
    return null;
  }
}

export interface CMSPageData {
  title: string;
  meta_title?: string;
  meta_description?: string;
  body: string;
  contactInfo?: { email: string; phone: string; hours: string; address: string };
  faqs?: { q: string; a: string }[];
  hero?: {
    title: string;
    subtitle: string;
    desktopSrc: string;
    mobileSrc: string;
    buttonText: string;
    buttonLink: string;
    slides: any[];
  };
  sections?: any[];
}

const createFallbackPage = (title: string, body: string = ''): CMSPageData => ({
  title,
  meta_title: title,
  meta_description: '',
  body,
  contactInfo: { email: 'admin@perfumebooth.com', phone: '+91 9266030909 / 011-46604937', hours: 'Mon to Sat, 10am to 6pm', address: '70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015' },
  faqs: [],
  hero: { title, subtitle: '', desktopSrc: '', mobileSrc: '', buttonText: '', buttonLink: '', slides: [] },
  sections: []
});

export async function getAboutUs(): Promise<CMSPageData> {
  const page = await getCMSPage('info/about-us');
  return page || createFallbackPage(
    "About Us",
    "<p>Welcome to Perfume Booth. We are your premium destination for exquisite fragrances.</p>"
  );
}

export async function getContactUs(): Promise<CMSPageData> {
  const page = await getCMSPage('info/contact-us');
  return page || createFallbackPage("Contact Us", "");
}

export async function getDisclaimers(): Promise<CMSPageData> {
  const page = await getCMSPage('info/disclaimers');
  return page || createFallbackPage(
    "Disclaimers",
    "<p>Fragrance notes represent olfactory profiles and are meant as product guidelines only.</p>"
  );
}

export async function getFaq(): Promise<CMSPageData> {
  const page = await getCMSPage('info/faq');
  return page || createFallbackPage(
    "Frequently Asked Questions",
    "<p>Find answers to common questions about shipping, payments, returns, and scent longevity.</p>"
  );
}

export async function getPrivacyPolicy(): Promise<CMSPageData> {
  const page = await getCMSPage('info/policies/privacy');
  return page || createFallbackPage(
    "Privacy Policy",
    "<p>Your privacy is important to us. Read how we protect and manage your personal data.</p>"
  );
}

export async function getRefundPolicy(): Promise<CMSPageData> {
  const page = await getCMSPage('info/policies/refund');
  return page || createFallbackPage(
    "Refund Policy",
    "<p>We offer hassle-free refunds and exchanges within 14 days of delivery for qualifying items.</p>"
  );
}

export async function getShippingPolicy(): Promise<CMSPageData> {
  const page = await getCMSPage('info/policies/shipping');
  return page || createFallbackPage(
    "Shipping Policy",
    "<p>Complimentary standard shipping is provided for all orders of ₹999 or above.</p>"
  );
}

export async function getTermsAndConditions(): Promise<CMSPageData> {
  const page = await getCMSPage('info/policies/terms');
  return page || createFallbackPage(
    "Terms and Conditions",
    "<p>Please review our terms of service, payment policies, and order cancellation guidelines.</p>"
  );
}
