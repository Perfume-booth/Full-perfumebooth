import { SORT_OPTIONS } from "./constants";

export function getSortConfig(sortValue: string | undefined) {
    const option = SORT_OPTIONS.find(o => o.value === sortValue) || SORT_OPTIONS[0];
    return {
        sortKey: option.sortKey,
        reverse: option.reverse
    };
}

export function buildCatalogFilters(params: {
    types?: string[];
    brands?: string[];
    price?: [number, number];
    availability?: string[];
    gender?: string[];
    initialFilters?: any[];
    extraFilters?: Record<string, string[]>;
}) {
    const { types, brands, price, availability, gender, initialFilters = [], extraFilters } = params;
    const inputs: any[] = [];
    const getFilterByKeyword = (keywords: string[]) => 
        initialFilters.find((f: any) => keywords.some(k => f.id.toLowerCase().includes(k) || f.label.toLowerCase().includes(k)));

    const brandFilter = getFilterByKeyword(["vendor", "brand"]);
    const typeFilter = getFilterByKeyword(["product_type", "type", "category"]);
    const availabilityFilter = getFilterByKeyword(["available", "availability"]);
    const genderFilter = getFilterByKeyword(["gender", "ideal_for"]);

    const safePush = (inputStr: string) => {
        if (!inputStr) return;
        try { 
            inputs.push(JSON.parse(inputStr)); 
        } catch (e) { 
            console.error("Failed to parse filter input:", inputStr, e);
        }
    };

    // 1. Types
    types?.forEach(t => {
        const normalizedT = t.toLowerCase();
        const matches = typeFilter?.values.filter((v: { label: string; }) => {
            const label = v.label.toLowerCase();
            // Direct match
            if (label === normalizedT) return true;
            // Common synonyms and partial matches
            if (normalizedT.includes("mist") && label.includes("mist")) return true;
            if ((normalizedT.includes("perfume") || normalizedT.includes("parfum")) && (label.includes("perfume") || label.includes("parfum") || label === "edp" || label === "edt")) return true;
            if (normalizedT.includes("eau de parfum") && (label === "edp" || label.includes("parfum") || label.includes("eau de parfum"))) return true;
            if (normalizedT.includes("eau de toilette") && (label === "edt" || label.includes("toilette") || label.includes("eau de toilette"))) return true;
            if ((normalizedT.includes("deo") || normalizedT.includes("deodorant")) && (label.includes("deo") || label.includes("spray") || label.includes("body spray"))) return true;
            if (normalizedT.includes("attar") && (label.includes("attar") || label.includes("itthar") || label.includes("concentrated perfume oil") || label.includes("oil"))) return true;
            return false;
        });

        if (matches && matches.length > 0) {
            matches.forEach((m: { input: any; label: string }) => {
                if (m.input) {
                    safePush(typeof m.input === 'string' ? m.input : JSON.stringify(m.input));
                } else {
                    inputs.push({ productType: m.label });
                }
            });
        } else {
            // Fallback for backend product-type filters
            inputs.push({ productType: t });
        }
    });

    // 2. Brands
    brands?.forEach(b => {
        const val = brandFilter?.values.find((v: { label: string; }) => v.label.toLowerCase() === b.toLowerCase());
        if (val?.input) {
            safePush(typeof val.input === 'string' ? val.input : JSON.stringify(val.input));
        } else {
            const exactLabel = val?.label || b;
            // Brand is a structured field, not an additional required tag.
            inputs.push({ productVendor: exactLabel });
        }
    });

    // 3. Availability
    availability?.forEach(a => {
        const val = availabilityFilter?.values.find((v: { label: string; id: string; }) => v.label.toLowerCase() === a.toLowerCase() || v.id === a);
        if (val?.input) {
            safePush(val.input);
        } else {
            if (a.toLowerCase().includes("in stock")) inputs.push({ available: true });
            if (a.toLowerCase().includes("out of stock")) inputs.push({ available: false });
        }
    });

    // 4. Gender
    gender?.forEach(g => {
        const normG = g.toLowerCase();
        const isMen = normG === "men" || normG === "male" || normG === "him";
        const isWomen = normG === "women" || normG === "female" || normG === "her";
        const isUnisex = normG === "unisex";

        const matches = genderFilter?.values.filter((v: { label: string; }) => {
            const lower = v.label.toLowerCase();
            if (isMen) return lower === "men" || lower === "male";
            if (isWomen) return lower === "women" || lower === "female" || lower.includes("female");
            return lower === normG;
        });

        if (matches && matches.length > 0) {
            matches.forEach((m: { input: string; }) => safePush(m.input));
        } else {
            // Fallback for Gender: map directly to this store's exact tags to avoid AND filter locking
            if (isMen) {
                inputs.push({ gender: "Men" });
            } else if (isWomen) {
                inputs.push({ gender: "Women" });
            } else if (isUnisex) {
                inputs.push({ gender: "Unisex" });
            } else {
                inputs.push({ gender: g });
            }
        }
    });

    // 5. Price
    if (price && (price[0] > 0 || price[1] < 10000)) {
        inputs.push({ price: { min: price[0], max: price[1] } });
    }

    // 6. Extra Filters (Dynamic sections like Concentration, Format)
    if (extraFilters) {
        Object.entries(extraFilters).forEach(([key, values]) => {
            values.forEach(v => {
                const section = initialFilters?.find(f => f.label.toLowerCase() === key.toLowerCase() || f.id === key);
                const val = section?.values.find((sv: any) => sv.label.toLowerCase() === v.toLowerCase());
                if (val?.input) {
                    safePush(typeof val.input === 'string' ? val.input : JSON.stringify(val.input));
                } else {
                    inputs.push({ tag: v });
                }
            });
        });
    }

    return inputs;
}
