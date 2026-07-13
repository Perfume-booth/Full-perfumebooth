import { Metadata } from "next";
import CollectionTemplate from "@/components/product/CollectionTemplate";

interface CollectionPageProps {
  params: Promise<{ handle: string | string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string | string[] }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const handleString = Array.isArray(resolvedParams.handle) ? resolvedParams.handle.join('/') : resolvedParams.handle;
  return {
    alternates: {
      canonical: `https://www.perfumebooth.com/${handleString}`
    }
  };
}

export default async function GenericCollectionPage({ params, searchParams }: CollectionPageProps) {
  const resolvedParams = await params;
  const handleString = Array.isArray(resolvedParams.handle) ? resolvedParams.handle.join('/') : resolvedParams.handle;
  const sParams = await searchParams;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.perfumebooth.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Collections",
        "item": "https://www.perfumebooth.com/collections"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": handleString.replace(/-/g, ' ').replace(/\//g, ' > ').toUpperCase(),
        "item": `https://www.perfumebooth.com/${handleString}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CollectionTemplate 
        handle={handleString} 
        searchParams={sParams}
        defaultLimit={80}
      />
    </>
  );
}
