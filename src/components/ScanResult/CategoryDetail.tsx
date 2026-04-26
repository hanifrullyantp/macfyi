import type { CardBucket } from "../../lib/scanCategories";

/**
 * Per-category review uses the same engine as `ResultsView` (review stage + filters).
 * Card **Tinjau** navigates to that screen; a dedicated sub-route is not required for V1.
 */
export function getCategoryDetailCopy(bucket: CardBucket): { title: string; body: string } {
  return {
    title: bucket.def.label,
    body: bucket.def.userExplanation,
  };
}
