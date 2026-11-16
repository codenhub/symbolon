import { describe, expect, it } from "vitest";

import { createLogger } from "./logger";

function capture(): { lines: unknown[]; logger: ReturnType<typeof createLogger> } {
  const lines: unknown[] = [];
  return { lines, logger: createLogger((line) => lines.push(JSON.parse(line))) };
}

describe("createLogger", () => {
  it("shouldWriteOneJsonObjectPerEvent", () => {
    const { lines, logger } = capture();

    logger.error("request_failed", { method: "GET", path: "/healthz" });

    expect(lines).toEqual([{ level: "error", event: "request_failed", method: "GET", path: "/healthz" }]);
  });

  it.each([
    "secret",
    "clientSecret",
    "password",
    "refresh_token",
    "Authorization",
    "set-cookie",
    "code",
    "privateKey",
    "private_key",
    "apiKey",
  ])("shouldRedactAFieldNamed%s", (name) => {
    const { lines, logger } = capture();

    logger.error("failed", { [name]: "value-under-test", nested: { [name]: "value-under-test" } });

    expect(JSON.stringify(lines)).not.toContain("value-under-test");
  });

  it("shouldRedactCredentialsInAUrl", () => {
    const { lines, logger } = capture();

    logger.error("failed", { error: new Error("connect to postgres://app:pw-under-test@db:5432/x failed") });

    expect(JSON.stringify(lines)).not.toContain("pw-under-test");
    expect(JSON.stringify(lines)).toContain("postgres://[redacted]@db:5432/x");
  });

  it("shouldRedactAUserNameWithoutAPasswordInAUrl", () => {
    const { lines, logger } = capture();

    logger.error("failed", { url: "https://user-under-test@example.invalid/resource" });

    expect(JSON.stringify(lines)).not.toContain("user-under-test");
  });

  it("shouldNotRunAToJsonMethodItWasGiven", () => {
    const { lines, logger } = capture();

    logger.error("failed", { details: { toJSON: () => ({ token: "hook-under-test" }) } });

    expect(JSON.stringify(lines)).not.toContain("hook-under-test");
  });

  it("shouldWriteABigintAsText", () => {
    const { lines, logger } = capture();

    logger.error("failed", { attempt: 1n });

    expect(lines).toEqual([{ level: "error", event: "failed", attempt: "1" }]);
  });

  it("shouldReduceAnErrorToItsNameAndMessage", () => {
    const { lines, logger } = capture();
    const error = Object.assign(new TypeError("boom"), { options: { host: "db", pass: "opt-under-test" } });

    logger.error("failed", { error });

    expect(lines).toEqual([{ level: "error", event: "failed", error: { name: "TypeError", message: "boom" } }]);
  });

  it("shouldStopAtADepthLimit", () => {
    const { lines, logger } = capture();
    const deep = { a: { b: { c: { d: { e: "too deep" } } } } };

    logger.error("failed", deep);

    expect(JSON.stringify(lines)).not.toContain("too deep");
  });
});
