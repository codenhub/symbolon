import { ConfigError, loadConfig } from "@symbolon/core";
import { createHandler } from "@symbolon/server";

import { openStore } from "./open-store";
import { serve } from "./serve";

const DEFAULT_PORT = 3000;
// Loopback unless told otherwise: a dev instance is not reachable from the network by accident. The Docker
// image sets SYMBOLON_HOST=0.0.0.0.
const DEFAULT_HOST = "127.0.0.1";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const store = openStore(process.env["SYMBOLON_DATABASE"]);
  await store.migrate();

  const { server, port } = await serve(createHandler({ config, store }), {
    origin: new URL(config.issuer).origin,
    port: Number(process.env["SYMBOLON_PORT"] ?? DEFAULT_PORT),
    host: process.env["SYMBOLON_HOST"] ?? DEFAULT_HOST,
  });
  console.log(`Symbolon is listening on port ${port} for ${config.issuer}${config.isDevMode ? " (dev mode)" : ""}`);

  const shutdown = (): void => {
    server.close(() => {
      void store.close();
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

try {
  await main();
} catch (error) {
  // A ConfigError names variables, never values, so it is safe to print whole. Anything else is printed as
  // its name and message only, without its properties, which for a driver error can include the connection
  // options and their password.
  console.error(error instanceof ConfigError ? error.message : `Symbolon failed to start: ${String(error)}`);
  process.exit(1);
}
