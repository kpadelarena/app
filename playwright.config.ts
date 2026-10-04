import { defineConfig, devices } from "@playwright/test";

/* End-to-end tests run against the local Supabase stack with seed data:
   run `pnpm db:start` (or `pnpm db:reset` for a clean slate) first. */
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
