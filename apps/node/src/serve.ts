import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import type { Handler } from "@symbolon/server";

/** Options for {@link serve}. */
export interface ServeOptions {
  /** The origin of the public URL, such as `https://id.example.com`. Request URLs are built on it. */
  readonly origin: string;
  /** The TCP port; 0 picks a free one. */
  readonly port: number;
  /** The interface to listen on. */
  readonly host: string;
}

function toRequest(incoming: IncomingMessage, origin: string, signal: AbortSignal): Request {
  // The URL is built on the configured origin, never on the Host header, which the client controls.
  const url = new URL(incoming.url ?? "/", origin);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      headers.append(name, item);
    }
  }
  const hasBody = incoming.method !== "GET" && incoming.method !== "HEAD";
  return new Request(url, {
    method: incoming.method ?? "GET",
    headers,
    body: hasBody ? (Readable.toWeb(incoming) as ReadableStream<Uint8Array>) : null,
    // Required by Node.js's fetch for a streamed request body.
    duplex: "half",
    signal,
  } as RequestInit);
}

async function writeResponse(response: Response, outgoing: ServerResponse, isHead: boolean): Promise<void> {
  outgoing.statusCode = response.status;
  for (const [name, value] of response.headers) {
    if (name !== "set-cookie") {
      outgoing.setHeader(name, value);
    }
  }
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) {
    outgoing.setHeader("set-cookie", cookies);
  }
  if (response.body === null || isHead) {
    outgoing.end();
    return;
  }
  await pipeline(Readable.fromWeb(response.body as NodeReadableStream), outgoing);
}

/**
 * Serves a Fetch handler over Node.js's HTTP server.
 *
 * @param handler - The handler every request goes to.
 * @param options - Where to listen, and the public origin request URLs are built on.
 * @returns The listening server and the port it bound.
 */
export async function serve(handler: Handler, options: ServeOptions): Promise<{ server: Server; port: number }> {
  const server = createServer((incoming, outgoing) => {
    // Absolute-form targets (`GET http://other/ HTTP/1.1`) would let the client pick the URL's origin.
    if (!incoming.url?.startsWith("/")) {
      outgoing.writeHead(400).end();
      return;
    }
    const abort = new AbortController();
    outgoing.on("close", () => abort.abort());
    const respond = async (): Promise<void> => {
      try {
        const response = await handler(toRequest(incoming, options.origin, abort.signal));
        await writeResponse(response, outgoing, incoming.method === "HEAD");
      } catch {
        if (!outgoing.headersSent) {
          outgoing.writeHead(500).end();
        } else {
          outgoing.destroy();
        }
      }
    };
    void respond();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => resolve());
  });
  return { server, port: (server.address() as AddressInfo).port };
}
