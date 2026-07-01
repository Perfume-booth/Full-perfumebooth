import { getBlogArticles } from "@/lib/shopify";
import dynamic from "next/dynamic";

const BlogSection = dynamic(() => import("@/components/home/BlogSection"));

export default async function BlogSectionWrapper() {
    const articles = await getBlogArticles("news", 4);
    
    return <BlogSection articles={articles} />;
}
