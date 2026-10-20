---
status: DRAFT
last_updated: 2026-10-20
scope: Workspace layout, dependency direction, the runtime boundary, and the structural decisions behind them.
---

# Architecture

This document records how the repository is put together and why. It was written with the initial scaffold and is DRAFT until a maintainer approves it; [the scope](scope.md) is where the product requirements live.

## Layout

| Path                      | Package                    | Holds                                                                                                            | Runs on          |
| ------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- |
| `packages/core`           | `@symbolon/core`           | Domain logic, the configuration, and the ports the runtimes implement (`Store`, later mail, clock, rate limits). | any              |
| `packages/server`         | `@symbolon/server`         | The HTTP surface as one Fetch handler: OIDC endpoints, server-rendered pages, the admin API, web hygiene.        | any              |
| `packages/store`          | `@symbolon/store`          | The migrations, the memory store, and the store conformance suite (`@symbolon/store/testing`).                   | any              |
| `packages/store-sqlite`   | `@symbolon/store-sqlite`   | The SQLite adapter on `node:sqlite`.                                                                             | Node.js          |
| `packages/store-postgres` | `@symbolon/store-postgres` | The PostgreSQL adapter.                                                                                          | Node.js          |
| `packages/store-d1`       | `@symbolon/store-d1`       | The Cloudflare D1 adapter.                                                                                       | any (D1 binding) |
| `apps/node`               | `@symbolon/node`           | The Node.js entrypoint, the `node:http` bridge, and the Docker image.                                            | Node.js          |
| `apps/workers`            | `@symbolon/workers`        | The Workers entrypoint and the wrangler template.                                                                | Workers          |
| `apps/dashboard`          | `@symbolon/dashboard`      | The admin and account single-page app.                                                                           | browser          |
| `tests/e2e`               | `@symbolon/e2e`            | Playwright suites against a running instance.                                                                    | Node.js          |
| `deploy/`                 | —                          | Compose examples for operators.                                                                                  | —                |

Every workspace package is `private`. Symbolon ships as a Docker image and a Workers template, not as npm packages, so no package has a public API to version; the boundary that matters is the one between packages, which the dependency rules below govern.

## Dependency direction

```
apps/node, apps/workers
  ├──> server ─────────────────────────────────> core
  └──> store-sqlite | store-postgres | store-d1 ──> store ──> core
```

- `core` depends on no other Symbolon package. Everything depends on it.
- `server` depends on `core`, never on a store adapter: it receives a `Store`.
- The adapters depend on `core` (for the port) and `store` (for the migrations).
- Only the apps choose adapters and wire them together.
- Core packages depend only on `@codenhub/*` packages. An adapter may add the one third-party dependency it cannot avoid, such as a database driver, justified in this document.

### Ports live in core

The `Store` interface is declared in `core`, where it is used, and `store` implements against it. The scope placed the storage interfaces in `store`; that makes `core` depend on `store` for its types while `store` needs `core`'s domain types for its records, a cycle. Declaring the port in its consumer is the usual way out, and it means a new runtime implements interfaces from one package.

### `server` is separate from `core`

The scope proposed `apps/server` for the HTTP layer. It is a package instead, because both runtimes serve the same handler: `apps/node` and `apps/workers` are each a few dozen lines that build a store, call `createHandler`, and serve it. Keeping HTTP out of `core` keeps the domain testable without requests, and keeps request parsing, cookies and headers in one place, where invariants 4 and 5 are enforced.

## Runtime boundary

Invariant 9 forbids runtime-specific APIs outside the adapters. It is enforced by the compiler: the source of `core`, `server`, `store`, `store-d1` and `apps/workers` is type-checked against `tsconfig.runtime-agnostic.json`, which loads the `WebWorker` library and no `@types/node`. An import of `node:*`, or of a Node.js global such as `Buffer` or `process`, fails `pnpm typecheck`. Their tests run on Node.js and are checked against `tsconfig.node.json`, through a separate `tsconfig.test.json`.

`store-d1` takes its binding as a structural type, `D1DatabaseLike`, rather than from `@cloudflare/workers-types`, so it stays on the agnostic side and its tests run on Node.js against Miniflare's D1.

## Builds

Packages ship their TypeScript source (`"exports": { ".": "./src/index.ts" }`) and have no build step. The apps bundle: esbuild for `apps/node`, wrangler (esbuild) for `apps/workers`, Vite for `apps/dashboard`. Vitest and `tsc` read the source directly.

Rejected: a `tsdown` build per package, as codenhub has. codenhub publishes its packages, so `dist/` is what consumers get; here nothing consumes a package's `dist/`, and a per-package build would only add a build-order dependency to every test run.

`apps/node` bundles into a single `dist/main.js`, so the Docker image holds that file and Node.js, and no `node_modules`.

## HTTP

There is no HTTP framework. `server` exposes `(request: Request) => Promise<Response>`, which Workers serves as is, and `apps/node/src/serve.ts` bridges `node:http` to it. This is provisional: [the scope's open question](scope.md#6-open-questions) on a framework versus an internal router is still open, and is decided when `server` has enough routes to compare the two on real code. Either choice keeps the Fetch handler as the boundary, so it changes `server` only.

Request URLs are built on the configured issuer's origin, never on the `Host` header, which the client controls. `serve` refuses absolute-form request targets for the same reason.

## Storage

- **Migrations** are one ordered list in `@symbolon/store`, each written once per dialect (SQLite, which D1 shares, and PostgreSQL) as a list of single statements, because D1's `prepare` takes one statement. Each adapter applies pending migrations in `migrate()`, in a transaction (a batch per migration on D1), recording applied ids in `symbolon_migrations`. The Node.js app migrates on startup; the Worker migrates on the first request of each isolate, which costs one read once the schema is current. Rejected: wrangler's D1 migration files, which would be a second copy of the schema that can drift from the other dialects.
- **PostgreSQL driver:** [`postgres`](https://github.com/porsager/postgres) rather than `pg`. It has no dependencies, is ESM, and bundles into `dist/main.js`; `pg` brings `pg-pool`, `pg-types` and others, and its optional native binding complicates bundling.
- **SQLite** runs on `node:sqlite`, built into Node.js 24, so the image needs no native module. On Node.js 24.14.1 it prints an `ExperimentalWarning` at startup.

## Dashboard

The admin dashboard is a separate single-page app, following the scope's lean: login and consent pages are server-rendered by `server`, with no JavaScript required, and the dashboard talks to the admin API. This is provisional, with the same open question as HTTP. How it is served (by `server` under a path, from Workers static assets) is decided with the admin API; until then it builds on its own.

The dashboard uses `@codenhub/styles` and `@codenhub/icons`. `@codenhub/components` is not on npm yet, and `@codenhub/router` is not ready for use here. Icons are generated by the icons package's PostCSS plugin into the bundled stylesheet, for the CSP reason `apps/dashboard/AGENTS.md` records.
