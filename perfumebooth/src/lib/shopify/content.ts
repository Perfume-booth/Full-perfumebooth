import { getBlogQuery, getArticleByHandleQuery } from '../queries';
import { shopifyFetch, mapNodes, sanitizePolicyHtml } from './fetcher';
import { Article, BlogData, PageData } from './types';

const getPageByHandleQuery = `
  query getPage($handle: String!) {
    page(handle: $handle) {
      title
      body
    }
  }
`;

export async function fetchPage(handle: string): Promise<PageData | null> {
  const { body } = await shopifyFetch<{
    data?: { page?: PageData };
  }>({
    query: getPageByHandleQuery,
    variables: { handle },
  });

  const page = body?.data?.page;
  if (!page) return null;

  return {
    title: page.title,
    body: sanitizePolicyHtml(page.body),
  };
}

export async function getBlogArticles(handle: string = "news", count: number = 3): Promise<Article[]> {
  const { body } = await shopifyFetch<any>({
    query: getBlogQuery,
    variables: { handle, first: count },
  });

  return mapNodes(body?.data?.blog?.articles?.edges || []);
}

export async function getBlog(handle: string = "news", count: number = 20): Promise<BlogData | null> {
  const { body } = await shopifyFetch<any>({
    query: getBlogQuery,
    variables: { handle, first: count },
  });

  if (!body?.data?.blog) return null;

  return {
    title: body.data.blog.title,
    articles: mapNodes(body.data.blog.articles.edges || []),
  };
}

export async function getArticle(blogHandle: string, articleHandle: string) {
  const { body } = await shopifyFetch<any>({
    query: getArticleByHandleQuery,
    variables: { blogHandle, articleHandle },
  });

  return body?.data?.blog?.articleByHandle || null;
}

// Policies
export const getPrivacyPolicy = () => fetchPage("privacy-policy");
export const getRefundPolicy = () => fetchPage("refund-and-return-policy");
export const getShippingPolicy = () => fetchPage("shipping-policy");
export const getTermsAndConditions = () => fetchPage("terms-and-conditions");
export const getDisclaimers = () => fetchPage("disclaimers");
export const getFaq = () => fetchPage("faq");
export const getAboutUs = () => fetchPage("about-us");
