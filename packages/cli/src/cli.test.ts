import { describe, expect, it } from "vitest";
import { validateManifest } from "@seam/core";

describe("cli uses core validation", () => {
  it("rejects empty actions", () => {
    expect(validateManifest({ seam: "1", actions: [] }).length).toBeGreaterThan(0);
  });
});
