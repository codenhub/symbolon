import { defineConfig } from "vitest/config";

// One Vitest run covers every package and app: each is a project with its own vitest.config.ts. Browser
// suites are Playwright's, in tests/e2e, and never run here (docs/specs/tests.md).
export default defineConfig({
  test: {
    projects: ["packages/*", "apps/node", "apps/workers"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**", "apps/*/src/**"],
      exclude: ["**/*.test.ts"],
    },
  },
});
