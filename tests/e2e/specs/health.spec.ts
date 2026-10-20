import { expect, test } from "@playwright/test";

test("the health check answers with the security headers", async ({ page }) => {
  const response = await page.goto("/healthz");

  expect(response?.status()).toBe(200);
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["cache-control"]).toBe("no-store");
});
