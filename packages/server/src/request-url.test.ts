import { describe, expect, it } from "vitest";

import { issuerUrl } from "./request-url";

const ORIGIN = "https://id.example.com";

describe("issuerUrl", () => {
  it("shouldKeepThePathAndQueryOnTheIssuerOrigin", () => {
    const url = issuerUrl(new Request("https://evil.example/authorize?client_id=a"), ORIGIN);

    expect(url.href).toBe("https://id.example.com/authorize?client_id=a");
  });

  it("shouldNotReadADoubleSlashPathAsAnotherHost", () => {
    const url = issuerUrl(new Request("https://id.example.com//evil.example/x"), ORIGIN);

    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("//evil.example/x");
  });

  it("shouldDropTheFragment", () => {
    const url = issuerUrl(new Request("https://evil.example/x#frag"), ORIGIN);

    expect(url.href).toBe("https://id.example.com/x");
  });
});
