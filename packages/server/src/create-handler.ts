import type { Config, Logger, Store } from "@symbolon/core";

import { issuerUrl } from "./request-url";
import { withSecurityHeaders } from "./security-headers";

/** What {@link createHandler} needs from the runtime. */
export interface HandlerOptions {
  /** The instance configuration. */
  readonly config: Config;
  /** The migrated store. */
  readonly store: Store;
  /** Where unexpected errors go. */
  readonly logger: Logger;
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
  const issuer = new URL(options.config.issuer);
  const isHttps = issuer.protocol === "https:";

  const route = async (request: Request): Promise<Response> => {
    const { pathname } = issuerUrl(request, issuer.origin);
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
    } catch (error) {
      // The error may hold a secret (invariant 2), so the client gets none of it. The log gets the path, not
      // the query, which can carry codes and tokens.
      try {
        options.logger.error("request_failed", { method: request.method, path: new URL(request.url).pathname, error });
      } catch {
        // A failing logger must not cost the client its response, or the response its security headers.
      }
      response = json({ error: "server_error" }, 500);
    }
    return withSecurityHeaders(response, isHttps);
  };
}
