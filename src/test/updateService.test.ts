import { describe, expect, it } from "vitest";
import { evaluateUpdatePolicy, isNewerVersion, isSameMajor } from "@/lib/updateService";

describe("updateService semver", () => {
  it("detects newer patch and minor updates", () => {
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(true);
    expect(isNewerVersion("1.2.1", "1.3.0")).toBe(true);
    expect(isNewerVersion("1.3.2", "1.3.2")).toBe(false);
  });

  it("handles major transitions correctly", () => {
    expect(isNewerVersion("1.2.1", "3.2.1")).toBe(true);
    expect(isSameMajor("1.2.1", "3.2.1")).toBe(false);
    expect(isSameMajor("1.2.1", "1.9.0")).toBe(true);
  });

  it("evaluates policy: same major auto, different major manual only", () => {
    expect(evaluateUpdatePolicy("1.0.0", "1.3.2")).toEqual({
      updateAvailable: true,
      manualOnly: false,
    });
    expect(evaluateUpdatePolicy("1.2.1", "3.2.1")).toEqual({
      updateAvailable: true,
      manualOnly: true,
    });
    expect(evaluateUpdatePolicy("1.3.2", "1.3.2")).toEqual({
      updateAvailable: false,
      manualOnly: false,
    });
  });
});
