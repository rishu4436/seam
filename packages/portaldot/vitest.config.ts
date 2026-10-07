import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@seam/core": path.resolve(__dirname, "../core/src/index.ts") } },
});
