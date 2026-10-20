import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "./config";

const SECRET = "a".repeat(44);

describe("loadConfig", () => {
  it("shouldReadAnHttpsIssuer", () => {
    const config = loadConfig({ SYMBOLON_ISSUER: "https://id.example.com", SYMBOLON_SECRET: SECRET });

    expect(config).toEqual({ issuer: "https://id.example.com/", secret: SECRET, isDevMode: false });
  });

  it("shouldAcceptAPrivateHostName", () => {
    const config = loadConfig({ SYMBOLON_ISSUER: "https://sso.corp.lan", SYMBOLON_SECRET: SECRET });

    expect(config.issuer).toBe("https://sso.corp.lan/");
  });

  it("shouldRefusePlainHttpOutsideDevMode", () => {
    expect(() => loadConfig({ SYMBOLON_ISSUER: "http://localhost:3000", SYMBOLON_SECRET: SECRET })).toThrow(
      /SYMBOLON_ISSUER: .*SYMBOLON_DEV_MODE/,
    );
  });

  it("shouldAllowPlainHttpInDevMode", () => {
    const config = loadConfig({
      SYMBOLON_ISSUER: "http://localhost:3000",
      SYMBOLON_SECRET: SECRET,
      SYMBOLON_DEV_MODE: "true",
    });

    expect(config.isDevMode).toBe(true);
  });

  it("shouldRefuseAShortSecret", () => {
    expect(() => loadConfig({ SYMBOLON_ISSUER: "https://id.example.com", SYMBOLON_SECRET: "short" })).toThrow(
      /SYMBOLON_SECRET/,
    );
  });

  it("shouldNeverIncludeTheSecretInTheError", () => {
    const leaky = "tooshortsecret";

    let error: unknown;
    try {
      loadConfig({ SYMBOLON_ISSUER: "http://id.example.com", SYMBOLON_SECRET: leaky });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConfigError);
    expect(String(error)).not.toContain(leaky);
    expect((error as ConfigError).problems).toHaveLength(2);
  });
});
