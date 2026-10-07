import { describe, expect, it } from "vitest";
import { digest, parse } from "./index.js";

describe("sdk orchestration", () => {
  it("parses and digests without network", () => {
    const m = parse({
      seam: "1",
      actions: [{ id: "a", capability: "assets.transfer", params: { x: "1" } }],
    });
    expect(digest(m).value.startsWith("0x")).toBe(true);
  });
});
