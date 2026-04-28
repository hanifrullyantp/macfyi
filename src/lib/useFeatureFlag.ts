import { FEATURE_FLAGS } from "./featureFlags";

export function useFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
