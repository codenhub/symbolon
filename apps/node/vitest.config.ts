import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "node",
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
