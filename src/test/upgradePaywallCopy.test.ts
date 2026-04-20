import { describe, it, expect, vi } from "vitest";
import { resolveUpgradePaywallSubtitle } from "@/lib/upgradePaywallCopy";
import type { PublicConfig } from "@/lib/publicConfig";

const t = vi.fn((key: string, vars?: Record<string, string | number>) => {
  if (key === "upgrade.subtitleWithAmount") return `WITH:${vars?.amount}`;
  if (key === "upgrade.subtitleGeneric") return "GENERIC";
  return key;
});

describe("resolveUpgradePaywallSubtitle", () => {
  it("uses session amount after clean when enabled", () => {
    const cfg = {
      desktop: {
        upgrade_paywall: {
          use_session_clean_amount: true,
          subtitle_with_amount_id: null,
          subtitle_with_amount_en: null,
          subtitle_generic_id: null,
          subtitle_generic_en: null,
        },
      },
    } as unknown as PublicConfig;

    expect(
      resolveUpgradePaywallSubtitle(
        "id",
        cfg,
        { freedLabel: "1.2 GB", openedAfterClean: true },
        t as never
      )
    ).toBe("WITH:1.2 GB");
  });

  it("uses admin template with {amount} when set", () => {
    const cfg = {
      desktop: {
        upgrade_paywall: {
          use_session_clean_amount: true,
          subtitle_with_amount_id: "Sudah {amount} ya.",
          subtitle_with_amount_en: null,
          subtitle_generic_id: null,
          subtitle_generic_en: null,
        },
      },
    } as unknown as PublicConfig;

    expect(
      resolveUpgradePaywallSubtitle(
        "id",
        cfg,
        { freedLabel: "500 MB", openedAfterClean: true },
        t as never
      )
    ).toBe("Sudah 500 MB ya.");
  });

  it("uses generic when manual upgrade (no clean context)", () => {
    expect(
      resolveUpgradePaywallSubtitle(
        "en",
        null,
        { freedLabel: "1 GB", openedAfterClean: false },
        t as never
      )
    ).toBe("GENERIC");
  });

  it("respects admin flag to hide session amount", () => {
    const cfg = {
      desktop: {
        upgrade_paywall: {
          use_session_clean_amount: false,
          subtitle_with_amount_id: null,
          subtitle_with_amount_en: null,
          subtitle_generic_id: "Marketing ID",
          subtitle_generic_en: null,
        },
      },
    } as unknown as PublicConfig;

    expect(
      resolveUpgradePaywallSubtitle(
        "id",
        cfg,
        { freedLabel: "99 MB", openedAfterClean: true },
        t as never
      )
    ).toBe("Marketing ID");
  });
});
