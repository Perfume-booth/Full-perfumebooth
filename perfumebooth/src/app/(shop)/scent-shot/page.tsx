import CollectionTemplate from "@/components/product/CollectionTemplate";

export const metadata = {
    title: "Scent Shots — Exclusive Miniature Perfumes | Perfume Booth",
    description: "Discover our Exclusive  collection of travel-sized premium fragrances. Try our Exclusive scents with premium Experience Boxes.",
};

export default async function ScentShotPage({ searchParams }: { searchParams: Promise<any> }) {
    const sParams = await searchParams;
    return (
        <CollectionTemplate 
            handle="scent-shot" 
            searchParams={sParams}
        />
    );
}
