import { ConfigError } from "@symbolon/core";
import { describe, expect, it } from "vitest";

import { loadNodeConfig } from "./node-config";

describe("loadNodeConfig", () => {
  it("shouldFillInTheDefaults", () => {
    expect(loadNodeConfig({})).toEqual({ port: 3000, host: "127.0.0.1" });
  });

  it("shouldReadEveryVariable", () => {
    const config = loadNodeConfig({ SYMBOLON_PORT: "8080", SYMBOLON_HOST: "0.0.0.0", SYMBOLON_DATABASE: "/data/x.db" });

    expect(config).toEqual({ port: 8080, host: "0.0.0.0", database: "/data/x.db" });
  });

  it.each(["::", "localhost", "id.internal"])("shouldAcceptTheHost%s", (host) => {
    expect(loadNodeConfig({ SYMBOLON_HOST: host }).host).toBe(host);
  });

  it.each(["0", "65536", "3000.5", "abc", ""])("shouldRefuseThePort%s", (port) => {
    expect(() => loadNodeConfig({ SYMBOLON_PORT: port })).toThrow(/SYMBOLON_PORT/);
  });

  it("shouldRefuseAHostThatIsNeitherAnAddressNorAName", () => {
    expect(() => loadNodeConfig({ SYMBOLON_HOST: "not a host" })).toThrow(/SYMBOLON_HOST/);
  });

  it("shouldNeverIncludeTheValueInTheError", () => {
    const value = "postgres://u:hunter2-not-real@db/x".repeat(200);

    let error: unknown;
    try {
      loadNodeConfig({ SYMBOLON_DATABASE: value, SYMBOLON_PORT: "hunter2" });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConfigError);
    expect(String(error)).not.toContain("hunter2");
    expect((error as ConfigError).problems).toHaveLength(2);
  });
});
