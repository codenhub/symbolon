import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "store-d1",
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
