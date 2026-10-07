import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("contract source exposes success and revert paths", () => {
  const src = readFileSync(new URL("../SeamSettlement.sol", import.meta.url), "utf8");
  assert.match(src, /function recordSettlement/);
  assert.match(src, /function getSettlement/);
  assert.match(src, /function revertSettlement/);
  assert.match(src, /error IntentionalRevert/);
});
