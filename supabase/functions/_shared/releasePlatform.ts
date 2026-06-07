export function stagingObjectForPlatform(platform: string): string {
  if (platform === "macos-intel") return "staging/macfyi-intel.dmg";
  return "staging/macfyi-arm64.dmg";
}

export function stagingObjectFallbackForPlatform(platform: string): string | null {
  if (platform === "macos-arm64") return "staging/macfyi-latest.dmg";
  return null;
}
