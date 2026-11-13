---
status: IMPLEMENTED
last_updated: 2026-11-12
scope: Setup, how the root scripts are implemented, the TypeScript and Vitest configuration, narrowing a run, local development, and adding a package.
---

# Tooling

[Workspace](workspace.md) names the root scripts and what each one guarantees. This document is how this project implements them.

Every script runs from the repository root. There is no workspace CLI: the scripts call pnpm, Vitest, `tsc`, oxlint, oxfmt and Prettier directly, so each one is a command a contributor can read in `package.json` and run on its own. A workspace that outgrows plain scripts adds a CLI as a package of its own; until then a wrapper would be one more thing to learn and to keep in step. codenhub's `hub` is private to that repository.

Markdown is formatted by Prettier with `proseWrap: "never"`, set in `.prettierrc.json`, and the files it leaves alone are listed in `.prettierignore`; [Workspace](workspace.md#two-formatters) says why Prettier, not oxfmt, owns Markdown.

## Setup

```sh
nvm install
pnpm install
```

Setup needs pnpm on the `PATH`, installed apart from Node.js, with the standalone script in [pnpm's installation guide](https://pnpm.io/installation): a pnpm installed through `npm` belongs to the Node.js version it was installed under, and `nvm install` switching versions takes it off the `PATH`. Any such version switches itself to the one the `packageManager` field in `package.json` pins before it runs, unless its `manage-package-manager-versions` setting has been turned off; with it off, install the pinned version itself. Node.js does not bring pnpm with it: Node.js 24 ships Corepack switched off, and later versions do not ship it at all.

`.nvmrc` pins Node.js. `nvm install` reads it, downloads that version when it is missing, and switches to it; with another version manager, install and use the version `.nvmrc` names. nvm for Windows does not read `.nvmrc`, and `nvm install` and `nvm use` without a version fail, so name it; in PowerShell, `nvm install (Get-Content .nvmrc)`, then `nvm use (Get-Content .nvmrc)`. Checked with nvm for Windows 1.2.2, and in the source of 2.0.1, whose `install` requires the version. [Workspace](workspace.md#toolchain) covers why the versions are pinned where they are.

`pnpm install` runs the root `prepare` script, which points git at `.githooks/` through `core.hooksPath`. If lifecycle scripts were disabled during the install, run `git config core.hooksPath .githooks`.

## Scripts

| Script               | Runs                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`           | The Node.js server, rebuilt and restarted on every change (`pnpm --filter @symbolon/node run dev`). Reads `apps/node/.env`.                |
| `pnpm format:check`  | `oxfmt --check`, then `prettier --check` over `**/*.md`.                                                                                   |
| `pnpm format:fix`    | The same two formatters, rewriting files.                                                                                                  |
| `pnpm lint:check`    | `oxlint`.                                                                                                                                  |
| `pnpm lint:fix`      | `oxlint --fix`.                                                                                                                            |
| `pnpm typecheck`     | `tsc -b` over the solution in `tsconfig.json`: every package, app and suite it references.                                                 |
| `pnpm test`          | `vitest run`: every package's and app's Vitest project, in one run. No browser.                                                            |
| `pnpm test:watch`    | `vitest`, in watch mode.                                                                                                                   |
| `pnpm test:coverage` | `vitest run --coverage`, with a V8 coverage report in `coverage/`.                                                                         |
| `pnpm test:e2e`      | The Playwright suites in `tests/e2e`, against a freshly built Node.js server.                                                              |
| `pnpm build`         | `pnpm -r --if-present run build`: the Node.js bundle, the Worker dry run and the dashboard. A package without a `build` script is skipped. |
| `pnpm verify`        | The checks above in the order [Workspace](workspace.md#root-scripts) gives. Not `test:e2e`.                                                |
| `pnpm prepare`       | `git config core.hooksPath .githooks`, reporting rather than failing when git cannot.                                                      |

`pnpm verify` is what CI runs, plus the PostgreSQL tests, the browser suites and the Docker image ([CI](ci.md)).

## TypeScript and Vitest

| File                             | Configures                                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.base.json`             | The compiler settings every project shares: strict, `noUncheckedIndexedAccess`, `noUnusedLocals` and `noUnusedParameters`, `verbatimModuleSyntax`, `isolatedModules`, bundler resolution, and type-checking only (`noEmit`). |
| `tsconfig.runtime-agnostic.json` | The base plus the `WebWorker` library and no types. It checks the source of `core`, `server`, `store`, `store-d1` and `apps/workers`, so a Node.js import or global fails `pnpm typecheck`.                                  |
| `tsconfig.node.json`             | The base plus the DOM library and Node.js types, for the Node.js adapters, `apps/node`, and the tests of every package.                                                                                                      |
| `tsconfig.json`                  | The solution `tsc -b` builds. It lists projects and holds no files.                                                                                                                                                          |
| `vitest.config.ts`               | The Vitest projects (`packages/*`, `apps/node`, `apps/workers`) and the V8 coverage settings. The dashboard and the browser suite are not Vitest projects.                                                                   |

## Narrowing a run

Vitest names each package's project after its directory, so one package runs on its own, and a path runs one file:

```sh
pnpm test --project core
pnpm test --project store-sqlite --project store-d1
pnpm test packages/core/src/config.test.ts
pnpm test:watch --project server
```

pnpm's `--filter` narrows `build`, or runs any script of one package:

```sh
pnpm --filter @symbolon/node run build
```

oxlint and oxfmt take paths: `pnpm exec oxlint packages/core` and `pnpm exec oxfmt --check packages/core`.

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

1. Create it under `packages/` (a library) or `apps/` (something deployed or run), with a `package.json` named `@symbolon/<directory>`, `"private": true`, `"type": "module"`, and its dependencies as `catalog:` or `workspace:*`. A new third-party version goes in the catalog in `pnpm-workspace.yaml`.
2. Give it a `tsconfig.json`. A package that must run on every runtime copies `packages/core`'s three files, so its source is checked against `tsconfig.runtime-agnostic.json`; a Node.js-only package copies `packages/store-sqlite`'s one.
3. Add the `tsconfig.json` to the references in the root `tsconfig.json`.
4. Give it a `vitest.config.ts` naming its project (`test: { name: "<directory>" }`). `packages/*` is already in the root Vitest projects; an app is added to the list in the root `vitest.config.ts`.
5. Give it a `build` script if it produces output; `pnpm build` runs it. Packages here ship their source and usually have none ([architecture](architecture.md#builds)).
6. Add it to the layout table in [the architecture](architecture.md#layout), and a `pkg:` or `app:` label to `.github/labels.sh`.
