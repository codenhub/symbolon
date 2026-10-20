import type { Server } from "node:http";
import { request as httpRequest } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { serve } from "../../src/serve";

let server: Server | undefined;

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve) ?? resolve(undefined));
  server = undefined;
});

async function start(handler: (request: Request) => Promise<Response>): Promise<number> {
  const started = await serve(handler, { origin: "https://id.example.com", port: 0, host: "127.0.0.1" });
  server = started.server;
  return started.port;
}

describe("serve", () => {
  it("shouldBuildTheRequestUrlOnTheConfiguredOriginNotTheHostHeader", async () => {
    let seen = "";
    const port = await start(async (request) => {
      seen = request.url;
      return new Response("ok");
    });

    await fetch(`http://127.0.0.1:${port}/healthz?a=1`, { headers: { Host: "evil.example" } });

    expect(seen).toBe("https://id.example.com/healthz?a=1");
  });

  it("shouldPassTheBodyAndReturnTheResponse", async () => {
    const port = await start(async (request) => new Response(await request.text(), { status: 201 }));

    const response = await fetch(`http://127.0.0.1:${port}/echo`, { method: "POST", body: "hello" });

    expect(response.status).toBe(201);
    expect(await response.text()).toBe("hello");
  });

  it("shouldSendEveryCookieAsItsOwnHeader", async () => {
    const port = await start(async () => {
      const headers = new Headers();
      headers.append("Set-Cookie", "a=1");
      headers.append("Set-Cookie", "b=2");
      return new Response(null, { headers });
    });

    const response = await fetch(`http://127.0.0.1:${port}/`);

    expect(response.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
  });

  it("shouldAnswer500WhenTheHandlerThrows", async () => {
    const port = await start(async () => {
      throw new Error("secret detail");
    });

    const response = await fetch(`http://127.0.0.1:${port}/`);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });

  it("shouldRefuseAnAbsoluteFormRequestTarget", async () => {
    const port = await start(async () => new Response("reached"));

    const status = await new Promise<number | undefined>((resolve, reject) => {
      httpRequest({ host: "127.0.0.1", port, path: "http://evil.example/" }, (response) => {
        response.resume();
        resolve(response.statusCode);
      })
        .on("error", reject)
        .end();
    });

    expect(status).toBe(400);
  });
});
