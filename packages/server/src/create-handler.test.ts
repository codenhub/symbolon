import type { Config, Store } from "@symbolon/core";
import { createMemoryStore } from "@symbolon/store/testing";
import { describe, expect, it } from "vitest";

import { createHandler } from "./create-handler";

const CONFIG: Config = { issuer: "https://id.example.com/", secret: "s".repeat(44), isDevMode: false };

function handlerWith(store: Store = createMemoryStore()) {
  return createHandler({ config: CONFIG, store });
}

describe("createHandler", () => {
  it("shouldAnswerTheHealthCheck", async () => {
    const response = await handlerWith()(new Request("https://id.example.com/healthz"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("shouldAnswerUnknownPathsWith404", async () => {
    const response = await handlerWith()(new Request("https://id.example.com/nope"));

    expect(response.status).toBe(404);
  });

  it("shouldFailTheHealthCheckWhenTheStoreIsDown", async () => {
    const store = createMemoryStore();
    await store.close();

    const response = await handlerWith(store)(new Request("https://id.example.com/healthz"));

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("closed");
  });

  it.each(["/healthz", "/nope"])("shouldSendSecurityHeadersOn%s", async (path) => {
    const response = await handlerWith()(new Request(`https://id.example.com${path}`));

    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("shouldOmitHstsOnPlainHttp", async () => {
    const handler = createHandler({
      config: { ...CONFIG, issuer: "http://localhost:3000/", isDevMode: true },
      store: createMemoryStore(),
    });

    const response = await handler(new Request("http://localhost:3000/healthz"));

    expect(response.headers.has("Strict-Transport-Security")).toBe(false);
  });
});
