import { Article } from "./types";


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

export async function getBlog(handle: string, first: number = 20) {
  return {
    title: "News & Stories",
    articles: MOCK_ARTICLES.slice(0, first)
  };
}

export async function getBlogArticles(handle: string, first: number = 10) {
  return MOCK_ARTICLES.slice(0, first);
}

export async function getArticle(blogHandle: string, articleHandle: string) {
  return MOCK_ARTICLES.find(a => a.handle === articleHandle) || null;
}

export async function getAboutUs() {
  return {
    title: "About Us",
    body: "<p>Welcome to Perfume Booth. We are your premium destination for exquisite fragrances.</p>"
  };
}

export async function getDisclaimers() {
  return {
    title: "Disclaimers",
    body: "<p>Fragrance notes represent olfactory profiles and are meant as product guidelines only.</p>"
  };
}

export async function getFaq() {
  return {
    title: "Frequently Asked Questions",
    body: "<p>Find answers to common questions about shipping, payments, returns, and scent longevity.</p>"
  };
}

export async function getPrivacyPolicy() {
  return {
    title: "Privacy Policy",
    body: "<p>Your privacy is important to us. Read how we protect and manage your personal data.</p>"
  };
}

export async function getRefundPolicy() {
  return {
    title: "Refund Policy",
    body: "<p>We offer hassle-free refunds and exchanges within 14 days of delivery for qualifying items.</p>"
  };
}

export async function getShippingPolicy() {
  return {
    title: "Shipping Policy",
    body: "<p>Complimentary standard shipping is provided for all orders of ₹999 or above.</p>"
  };
}

export async function getTermsAndConditions() {
  return {
    title: "Terms and Conditions",
    body: "<p>Please review our terms of service, payment policies, and order cancellation guidelines.</p>"
  };
}

