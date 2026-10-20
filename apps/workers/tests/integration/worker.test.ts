import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

/*
 * Runs the Worker in workerd, Cloudflare's runtime, against a real D1 database, through Miniflare. The
 * Worker is bundled here with esbuild rather than read from a wrangler build, so the test needs no build
 * step first; wrangler bundles with esbuild too.
 */

const ENTRY = fileURLToPath(new URL("../../src/index.ts", import.meta.url));
const SECRET = "s".repeat(44);

let script = "";
let worker: Miniflare | undefined;

beforeAll(async () => {
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2024",
    conditions: ["workerd", "worker", "browser"],
    write: false,
  });
  script = result.outputFiles[0]?.text ?? "";
});

afterEach(async () => {
  await worker?.dispose();
  worker = undefined;
});

function start(bindings: Record<string, string>): Miniflare {
  worker = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script,
      compatibilityDate: "2026-07-01",
      d1Databases: ["DB"],
      bindings,
    }),
  );
  return worker;
}

describe("the Worker", () => {
  it("shouldMigrateD1AndAnswerTheHealthCheck", async () => {
    const mf = start({ SYMBOLON_ISSUER: "https://id.example.com", SYMBOLON_SECRET: SECRET });

    const response = await mf.dispatchFetch("https://id.example.com/healthz");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("shouldRefuseToServeWithAnInvalidConfiguration", async () => {
    const mf = start({ SYMBOLON_ISSUER: "http://id.example.com", SYMBOLON_SECRET: SECRET });

    const response = await mf.dispatchFetch("http://id.example.com/healthz");

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });
});
