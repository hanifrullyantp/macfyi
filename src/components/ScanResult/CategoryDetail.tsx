import type { CardBucket } from "../../lib/scanCategories";

/**
 * Per-category review uses the same engine as `ResultsView` (review stage + filters).
 * **Tinjau** on a result card opens review with the list scoped to that card; use
 * “Show all items” in the banner to return to the full list.
 */
export function getCategoryDetailCopy(bucket: CardBucket): { title: string; body: string } {
  return {
    title: bucket.def.label,
    body: bucket.def.userExplanation,
  };
}
