import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      "@seam/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
});
