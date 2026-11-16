import { ConfigError, loadConfig } from "@symbolon/core";
import { createHandler } from "@symbolon/server";

import { loadNodeConfig } from "./node-config";
import { openStore } from "./open-store";
import { serve } from "./serve";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const nodeConfig = loadNodeConfig(process.env);
  const store = openStore(nodeConfig.database);
  await store.migrate();

  const { server, port } = await serve(createHandler({ config, store }), {
    origin: new URL(config.issuer).origin,
    port: nodeConfig.port,
    host: nodeConfig.host,
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
