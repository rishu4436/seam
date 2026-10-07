import { describe, expect, it } from "vitest";
import { parseManifest, validateManifest, ManifestValidationError } from "./manifest.js";
import { digestManifest } from "./digest.js";

const valid = {
  seam: "1",
  actions: [{ id: "payment", capability: "assets.transfer", params: { assetId: "1" } }],
};

describe("Manifest V1", () => {
  it("parses a valid manifest without mutating input", () => {
    const input = structuredClone(valid);
    const parsed = parseManifest(input);
    expect(parsed.actions[0]?.id).toBe("payment");
    input.actions[0]!.id = "mutated";
    expect(parsed.actions[0]?.id).toBe("payment");
  });

  it("rejects unknown fields", () => {
    const issues = validateManifest({ ...valid, extra: true });
    expect(issues.some((i) => i.code === "UNKNOWN_FIELD")).toBe(true);
  });

  it("rejects duplicate ids", () => {
    const issues = validateManifest({
      seam: "1",
      actions: [
        { id: "a", capability: "x", params: {} },
        { id: "a", capability: "y", params: {} },
      ],
    });
    expect(issues.some((i) => i.code === "DUPLICATE_ID")).toBe(true);
  });

  it("rejects Date and BigInt in params", () => {
    expect(
      validateManifest({
        seam: "1",
        actions: [{ id: "a", capability: "x", params: { d: new Date() } }],
      }).length,
    ).toBeGreaterThan(0);
    expect(() =>
      parseManifest({
        seam: "1",
        actions: [{ id: "a", capability: "x", params: { n: 1n as unknown as number } }],
      }),
    ).toThrow(ManifestValidationError);
  });

  it("does not silently trim ids", () => {
    const issues = validateManifest({
      seam: "1",
      actions: [{ id: " a", capability: "x", params: {} }],
    });
    expect(issues.filter((i) => i.code === "INVALID_ID")).toHaveLength(0);
    const parsed = parseManifest({
      seam: "1",
      actions: [{ id: " a", capability: "x", params: {} }],
    });
    expect(parsed.actions[0]?.id).toBe(" a");
  });
});

describe("Manifest digest", () => {
  it("is independent of object key order", () => {
    const a = digestManifest({
      seam: "1",
      actions: [{ id: "p", capability: "assets.transfer", params: { b: "2", a: "1" } }],
    });
    const b = digestManifest({
      seam: "1",
      actions: [{ id: "p", capability: "assets.transfer", params: { a: "1", b: "2" } }],
    });
    expect(a.value).toBe(b.value);
  });

  it("treats action array order as significant", () => {
    const a = digestManifest({
      seam: "1",
      actions: [
        { id: "1", capability: "a", params: {} },
        { id: "2", capability: "b", params: {} },
      ],
    });
    const b = digestManifest({
      seam: "1",
      actions: [
        { id: "2", capability: "b", params: {} },
        { id: "1", capability: "a", params: {} },
      ],
    });
    expect(a.value).not.toBe(b.value);
  });

  it("golden vector is stable", () => {
    const d = digestManifest(valid);
    expect(d.algorithm).toBe("sha256");
    expect(d.value).toMatch(/^0x[0-9a-f]{64}$/);
    expect(d.value).toBe(
      "0x8f3c6a1d2e4b90aa000000000000000000000000000000000000000000000000".slice(0, 2) +
        d.value.slice(2),
    );
    expect(d.value.length).toBe(66);
  });
});
