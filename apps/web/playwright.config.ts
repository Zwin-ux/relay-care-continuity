import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "8000";
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? "3000";
const apiURL = `http://127.0.0.1:${apiPort}`;
const webURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  use: {
    baseURL: webURL,
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: `cd ../api && python -m uvicorn app.main:app --host 127.0.0.1 --port ${apiPort}`,
      url: `${apiURL}/api/signals`,
      reuseExistingServer: true
    },
    {
      command: `npx next dev --hostname 127.0.0.1 --port ${webPort}`,
      url: webURL,
      reuseExistingServer: true
    }
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ]
});
