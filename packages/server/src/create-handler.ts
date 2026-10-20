import type { Config, Store } from "@symbolon/core";

import { withSecurityHeaders } from "./security-headers";

/** What {@link createHandler} needs from the runtime. */
export interface HandlerOptions {
  /** The instance configuration. */
  readonly config: Config;
  /** The migrated store. */
  readonly store: Store;
}

/** A Fetch-API request handler, the shape every runtime adapter serves. */
export type Handler = (request: Request) => Promise<Response>;

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * Creates the handler for every request Symbolon serves.
 *
 * @param options - The configuration and the store.
 * @returns A handler that never rejects: an unexpected error becomes a 500 response that names no detail.
 */
export function createHandler(options: HandlerOptions): Handler {
  const isHttps = new URL(options.config.issuer).protocol === "https:";

  const route = async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname === "/healthz" && (request.method === "GET" || request.method === "HEAD")) {
      await options.store.ping();
      return json({ status: "ok" }, 200);
    }
    return json({ error: "not_found" }, 404);
  };

  return async (request) => {
    let response: Response;
    try {
      response = await route(request);
    } catch {
      // The error may hold a secret or a query (invariant 2), so it is not echoed. Logging it goes through
      // the logging port once there is one.
      response = json({ error: "server_error" }, 500);
    }
    return withSecurityHeaders(response, isHttps);
  };
}
