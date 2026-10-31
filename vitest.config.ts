import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { include: ["tests/**/*.test.tsx"], environment: "jsdom", setupFiles: ["./tests/setup.ts"] },
});
