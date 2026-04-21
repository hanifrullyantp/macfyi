import { describe, it, expect } from "vitest";
import { redactPaths, redactPathsDeep } from "../redaction";

describe("redactPaths", () => {
  it("replaces /Users/... segments", () => {
    expect(redactPaths("file at /Users/jane/Library/Caches/x")).toBe("file at [path omitted]");
    expect(redactPaths("/Users/a/b")).toBe("[path omitted]");
  });

  it("replaces ~/... segments", () => {
    expect(redactPaths("see ~/Documents/secret.txt")).toBe("see [path omitted]");
  });

  it("leaves strings without local paths unchanged", () => {
    expect(redactPaths("cache folder")).toBe("cache folder");
    expect(redactPaths("https://example.com/user/foo")).toBe("https://example.com/user/foo");
  });
});

describe("redactPathsDeep", () => {
  it("redacts nested strings in objects and arrays", () => {
    const input = {
      a: "/Users/x/y",
      b: [{ p: "~/z" }, "plain"],
    };
    const out = redactPathsDeep(input);
    expect(out).toEqual({
      a: "[path omitted]",
      b: [{ p: "[path omitted]" }, "plain"],
    });
  });

  it("passes through numbers and null", () => {
    expect(redactPathsDeep({ n: 1, x: null })).toEqual({ n: 1, x: null });
  });
});
