import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", workers: 1,
  use: { baseURL: "http://127.0.0.1:3200", channel: "msedge" },
  webServer: { command: "npm run dev -- --port 3200", env: { NEXT_OUTPUT_DIR: ".next-e2e" }, url: "http://127.0.0.1:3200", reuseExistingServer: false },
});
