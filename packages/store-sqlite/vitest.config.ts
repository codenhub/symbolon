import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "store-sqlite",
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
