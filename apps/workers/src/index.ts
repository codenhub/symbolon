import { loadConfig } from "@symbolon/core";
import { createHandler, type Handler } from "@symbolon/server";
import { createD1Store, type D1DatabaseLike } from "@symbolon/store-d1";

/** The Worker's bindings: wrangler.jsonc declares `DB` and the variables; `SYMBOLON_SECRET` is a secret. */
export interface Env {
  /** The D1 database. */
  readonly DB: D1DatabaseLike;
  /** Every variable and secret, read by `loadConfig`. */
  readonly [name: string]: unknown;
}

// One handler per isolate. Migrating on the first request is cheap once the schema is current: one read of
// the migrations table.
let ready: Promise<Handler> | undefined;

async function init(env: Env): Promise<Handler> {
  const config = loadConfig(env);
  const store = createD1Store(env.DB);
  await store.migrate();
  return createHandler({ config, store });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    ready ??= init(env);
    let handler: Handler;
    try {
      handler = await ready;
    } catch (error) {
      // Try again on the next request, after the operator fixes the configuration or the database.
      ready = undefined;
      // A ConfigError names variables, never values (invariant 2).
      console.error(error instanceof Error ? error.message : "Symbolon failed to start");
      return new Response(null, { status: 500 });
    }
    return handler(request);
  },
};
