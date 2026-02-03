import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_SKIP_WEB_SERVER
    ? undefined
    : [
        {
          command: "bun --cwd apps/api dev",
          url: "http://localhost:3001",
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: "bun --cwd apps/web dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});

