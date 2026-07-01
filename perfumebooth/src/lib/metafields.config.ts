/**
 * Centralized configuration for Shopify Metafields.
 * If metafield keys are renamed or namespaces change in Shopify,
 * update this mapping to reflect the changes across the entire app.
 */

export const METAFIELD_MAPPINGS: Record<string, { namespace: string; keys: string[] }> = {
  top_notes: { namespace: "custom", keys: ["top_notes", "topnotes"] },
  middle_notes: { namespace: "custom", keys: ["middle_notes", "middlenotes", "middlenote"] },
  base_notes: { namespace: "custom", keys: ["base_notes", "basenotes"] },
  longevity: { namespace: "custom", keys: ["longevity"] },
  sillage: { namespace: "custom", keys: ["sillage"] },
  ideal_for: { namespace: "custom", keys: ["ideal_for", "idealfor"] },
  gender: { namespace: "custom", keys: ["gender", "filter_gender"] },
  size: { namespace: "custom", keys: ["size_ml", "size"] },
  tagline: { namespace: "custom", keys: ["tagline", "short_desc", "shortdesc"] },
  ingredients: { namespace: "custom", keys: ["ingredients"] },
  concentration: { namespace: "custom", keys: ["concentration"] },
  country_of_origin: { namespace: "custom", keys: ["country_of_origin", "origin"] },
  brand: { namespace: "custom", keys: ["brand"] },
  whats_inside: { namespace: "custom", keys: ["whats_inside"] },
  judgeme_reviews: { namespace: "judgeme", keys: ["widget"] },
  rating: { namespace: "reviews", keys: ["rating", "avg_rating"] },
  rating_count: { namespace: "reviews", keys: ["rating_count", "review_count"] },
  jdgm_rating: { namespace: "jdgm", keys: ["avg_rating"] },
  jdgm_count: { namespace: "jdgm", keys: ["review_count"] },
  coupons: { namespace: "custom", keys: ["coupons", "Coupons", "offers"] },
  season: { namespace: "custom", keys: ["season"] },
  occasion: { namespace: "custom", keys: ["occasion"] },
  material: { namespace: "custom", keys: ["material"] },
  fragrance_type: { namespace: "custom", keys: ["fragrance_type", "type"] },
  category: { namespace: "custom", keys: ["category", "filter_category"] },
  fragrance: { namespace: "custom", keys: ["fragrance_name", "fragrance"] },

};

/**
 * Generates a GraphQL fragment for metafields based on the mappings.
 * This can be used in queries to ensure consistency.
 */
export function generateMetafieldFragment() {
  let fragment = "";
  Object.entries(METAFIELD_MAPPINGS).forEach(([attr, mapping]) => {
    mapping.keys.forEach((key, index) => {
      // Create a unique alias for each key to avoid collisions in the query
      const alias = index === 0 ? attr : `${attr}_fallback_${index}`;
      fragment += `  ${alias}: metafield(namespace: "${mapping.namespace}", key: "${key}") { value }\n`;
    });
  });
  return fragment;
}
