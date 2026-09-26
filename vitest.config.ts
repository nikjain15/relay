import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// `@/` resolves to the repo root, mirroring tsconfig paths.
export default defineConfig({
  // JSX for scripts that render pages outside Next (scripts/stress.tsx).
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
