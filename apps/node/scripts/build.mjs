// Bundles the Node.js server into one file, dist/main.js, which is all the Docker image ships: no
// node_modules, so the image holds only the code that runs.
//
// `--dev` rebuilds on every change and restarts the server, reading apps/node/.env when it exists.
import { spawn } from "node:child_process";

import * as esbuild from "esbuild";

const isDev = process.argv.includes("--dev");

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  // Some bundled CommonJS calls `require` for Node.js built-ins, which an ES module lacks.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
};

if (!isDev) {
  await esbuild.build(options);
} else {
  const context = await esbuild.context(options);
  await context.rebuild();
  await context.watch();
  const server = spawn(
    process.execPath,
    ["--watch", "--enable-source-maps", "--env-file-if-exists=.env", "dist/main.js"],
    { stdio: "inherit" },
  );
  const stop = async () => {
    server.kill();
    await context.dispose();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
