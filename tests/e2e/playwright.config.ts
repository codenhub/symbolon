import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "specs",
  forbidOnly: process.env["CI"] !== undefined,
  retries: process.env["CI"] === undefined ? 0 : 1,
  reporter: process.env["CI"] === undefined ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: ORIGIN,
    trace: "retain-on-failure",
  },
  // Project names end in their engine, so CI can select one engine per job with --project='*<engine>'.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // The real Node.js build, on a throwaway in-memory SQLite database.
  webServer: {
    command: "pnpm --dir ../../apps/node run build && node ../../apps/node/dist/main.js",
    url: `${ORIGIN}/healthz`,
    reuseExistingServer: process.env["CI"] === undefined,
    env: {
      SYMBOLON_ISSUER: ORIGIN,
      SYMBOLON_SECRET: "e2e-only-secret-never-used-outside-tests-000",
      SYMBOLON_DEV_MODE: "true",
      SYMBOLON_DATABASE: ":memory:",
      SYMBOLON_PORT: String(PORT),
    },
  },
});
