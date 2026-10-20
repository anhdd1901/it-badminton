import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env")) process.loadEnvFile(".env");

const PORT = 3100;
const e2eUrl = process.env.DATABASE_URL_E2E;
if (!e2eUrl) throw new Error("DATABASE_URL_E2E is not set");

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    {
      name: "chromium",
      testIgnore: /.*\.desktop\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop",
      testMatch: /.*\.desktop\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/dang-nhap`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DATABASE_URL: e2eUrl,
      ALLOW_FAKE_CLOCK: "1",
      APP_FAKE_NOW: "2026-10-17T09:00:00+07:00",
    },
  },
});
