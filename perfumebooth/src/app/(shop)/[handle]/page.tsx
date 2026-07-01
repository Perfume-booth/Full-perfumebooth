import { Metadata } from "next";
import CollectionTemplate from "@/components/product/CollectionTemplate";

interface CollectionPageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return {
    alternates: {
      canonical: `https://www.perfumebooth.com/${handle}`
    }
  };
}

export default async function GenericCollectionPage({ params, searchParams }: CollectionPageProps) {
  const { handle } = await params;
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
        "name": handle.replace(/-/g, ' ').toUpperCase(),
        "item": `https://www.perfumebooth.com/${handle}`
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
        handle={handle} 
        searchParams={sParams}
        defaultLimit={80}
      />
    </>
  );
}
