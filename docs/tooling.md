---
status: IMPLEMENTED
last_updated: 2026-10-20
scope: Root scripts, narrowing a run, local development, and adding a package.
---

# Tooling

Every script runs from the repository root. There is no workspace CLI: the scripts call pnpm, Vitest, `tsc`, oxlint, oxfmt and Prettier directly, which is enough for a workspace of this size. codenhub's `hub` is private to that repository.

## Root scripts

| Script               | Runs                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------- |
| `pnpm dev`           | The Node.js server, rebuilt and restarted on every change. Reads `apps/node/.env`.      |
| `pnpm build`         | Every package's `build` script: the Node.js bundle, the Worker dry run, the dashboard.  |
| `pnpm typecheck`     | `tsc -b` over the solution in `tsconfig.json`.                                          |
| `pnpm test`          | Unit and integration tests of every package and app, in one Vitest run. No browser.     |
| `pnpm test:watch`    | The same, in watch mode.                                                                |
| `pnpm test:coverage` | The same, with a V8 coverage report in `coverage/`.                                     |
| `pnpm test:e2e`      | The Playwright suites in `tests/e2e`, against a freshly built Node.js server.           |
| `pnpm lint:check`    | oxlint over the repository. `pnpm lint:fix` applies the safe fixes.                     |
| `pnpm format:check`  | oxfmt for code and JSON, Prettier for Markdown. `pnpm format:fix` rewrites.             |
| `pnpm verify`        | Format, lint, typecheck, test and build, stopping at the first failure. Not `test:e2e`. |

`pnpm verify` is what CI runs, plus the PostgreSQL tests, the browser suites and the Docker image ([CI](ci.md)).

## Narrowing a run

Vitest names each package's project after its directory, so one package runs on its own, and a path runs one file:

```sh
pnpm test --project core
pnpm test --project store-sqlite --project store-d1
pnpm test packages/core/src/config.test.ts
pnpm test:watch --project server
```

Playwright takes its own filters, through `exec` so that pnpm passes them on unchanged:

```sh
pnpm --filter @symbolon/e2e exec playwright test --project=chromium
pnpm --filter @symbolon/e2e exec playwright test --ui
```

The first run of the browser suites needs the browsers: `pnpm --filter @symbolon/e2e run browsers`.

## Local development

```sh
cp apps/node/.env.example apps/node/.env   # then fill in SYMBOLON_SECRET
pnpm dev
```

The server listens on `http://localhost:3000` with a SQLite database in `apps/node/data/`, which is git-ignored. To run it on PostgreSQL instead, set `SYMBOLON_DATABASE` to a `postgres://` URL.

The Worker runs locally under wrangler, with a local D1:

```sh
cp apps/workers/.dev.vars.example apps/workers/.dev.vars   # then fill in SYMBOLON_SECRET
pnpm --filter @symbolon/workers run dev
```

The dashboard runs under Vite's dev server: `pnpm --filter @symbolon/dashboard run dev`.

### PostgreSQL tests

The PostgreSQL adapter's tests run only when `SYMBOLON_TEST_POSTGRES_URL` is set, and are skipped otherwise. To run them locally:

```sh
docker run --rm -d --name symbolon-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17-alpine
SYMBOLON_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm test --project store-postgres
```

Each test creates a schema of its own and drops it afterwards, so the database can be shared.

## Adding a package

1. Create it under `packages/` (or `apps/`), with a `package.json` named `@symbolon/<directory>`, `"private": true`, and its dependencies as `catalog:` or `workspace:*`. A new third-party version goes in the catalog in `pnpm-workspace.yaml`.
2. Give it a `tsconfig.json`. A package that must run on every runtime copies `packages/core`'s three files, so its source is checked against `tsconfig.runtime-agnostic.json`; a Node.js-only package copies `packages/store-sqlite`'s one.
3. Add the `tsconfig.json` to the references in the root `tsconfig.json`.
4. Give it a `vitest.config.ts` naming its project. `packages/*` is already in the root Vitest projects; an app is added to the list in the root `vitest.config.ts`.
5. Add it to the layout table in [the architecture](architecture.md), and a `pkg:` label to `.github/labels.json`.
