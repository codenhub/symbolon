---
status: APPROVED
last_updated: 2026-11-12
scope: How the test categories run with Vitest and Playwright: file names, configuration, scripts, coverage reports, and commands.
---

# Tests with Vitest and Playwright

The [testing specification](tests.md) defines the categories, where they live, and what they cover. This document says how they run on this stack.

## Runners and file names

| Category    | Runner                                | File                                                    | Runs with       |
| ----------- | ------------------------------------- | ------------------------------------------------------- | --------------- |
| Unit        | [Vitest](https://vitest.dev/)         | `src/<file>.test.ts` or `.tsx`, next to `src/<file>.ts` | `pnpm test`     |
| Integration | Vitest                                | `<package>/tests/integration/`                          | `pnpm test`     |
| Conformance | Vitest                                | `conformance.test.ts` in each adapter's integration dir | `pnpm test`     |
| Security    | Vitest                                | `packages/server/tests/security/`                       | `pnpm test`     |
| Browser     | [Playwright](https://playwright.dev/) | `tests/e2e/specs/`                                      | `pnpm test:e2e` |

The browser category runs through `pnpm test:e2e`, not `test:browser`: Symbolon calls these end-to-end tests, and the script name follows.

## Configuration

- A package or app that needs custom options, such as path aliases, environment variables, plugins, or a DOM environment, MUST include its own explicit configuration file, `vitest.config.ts` or `playwright.config.ts`, and not `vite.config.ts`: a runner that discovers packages by their `vitest.config.ts` would silently leave one configured through `vite.config.ts` out of `pnpm test`. Do not rely on implicit or undocumented fallback behavior. How the runs are put together is [tooling](../tooling.md)'s.
- Each package and app names its Vitest project after its directory in its `vitest.config.ts` (`core`, `server`, `store`, `store-sqlite`, `store-postgres`, `store-d1`, `node`, `workers`). The root `vitest.config.ts` lists them, so one run covers all of them in one process.
- `conformance.test.ts` files turn off the `vitest/expect-expect` and `vitest/valid-title` rules in `.oxlintrc.json`: the shared conformance cases throw instead of using Vitest's assertions, so they can also run inside workerd, and their titles come from the cases.
- Test scripts MUST NOT chain their own build step. Build ordering belongs to the root tooling, as [Tooling](../tooling.md) describes. The end-to-end suite builds the Node.js server through the `webServer` command in its Playwright configuration, which also keeps `reuseExistingServer` off in CI so the suite never runs against a stale build.
- A package that defines its own test scripts uses the root names and meanings:
  - `test`: runs unit and integration tests once, and nothing that needs a browser.
  - `test:watch`: runs those tests in watch mode.
  - `test:coverage`: runs those tests and writes a coverage report.
  - `test:e2e`: runs the browser suite, when the package has one.
  - `test:e2e:ui`: runs the browser suite in Playwright's UI mode.

## Browser suites

- `pnpm test`, `pnpm test:watch`, and `pnpm test:coverage` MUST NOT reach a browser suite, directly or through another script.
- The browser suite is the workspace package `tests/e2e` (`@symbolon/e2e`), and the root `test:e2e` script runs it. `pnpm verify` does not run it; CI does, as its own jobs ([CI](../ci.md#pull-requests-and-main-githubworkflowsciyml)). Browsers are installed with `pnpm --filter @symbolon/e2e run browsers`; a package does not install browsers from its own scripts, and the CI image of the Playwright version the lockfile pins carries them.
- Every Playwright project name ends in the engine it runs on, `chromium`, `firefox`, or `webkit`, optionally prefixed to distinguish surfaces (`app-chromium`). CI can then run one engine per job by selecting on the name, and a project named anything else cannot silently drop out of that selection. [CI](../ci.md#pull-requests-and-main-githubworkflowsciyml) describes how jobs select engines.
- A Playwright config MUST set `retries: process.env.CI ? 1 : 0`, unless it states why it needs more. A test that passes on its retry is reported as `flaky`, not as passed, so the retry keeps one timing failure from failing a merge without hiding it, and a test that fails twice still fails the run. Locally there is no retry, so a flake shows up where it can be fixed. The cost is that a flaky test stays green until someone reads the summary line; a test that shows up there is fixed rather than retried more. Without retries, the full run of codenhub/codenhub, the monorepo this rule comes from, failed 3 of 30 merges on 2026-11-03, each on one timing-sensitive Firefox test ([codenhub/codenhub@702af904](https://github.com/codenhub/codenhub/commit/702af904)).
- A suite whose tests do not read cookies, storage, or permissions left by an earlier test SHOULD share one browser context per worker and take a fresh page per test. Playwright builds a context per test by default, and the engines price that very differently: on one suite in codenhub/codenhub, a fresh context cost Firefox about 2.6 s against Chromium's 0.3 s, the whole gap between them ([codenhub/codenhub@7aad1c19](https://github.com/codenhub/codenhub/commit/7aad1c19ff7a1b43db939ddff6a0ac435fe8bc5d)). Writing such state does not disqualify a suite; reading it back across a test boundary does. A suite whose assertions rely on state an earlier test left behind MUST keep the default. A suite that shares a context MUST reset whatever the page under test persists before each test, not after, so the reset holds even when a test fails partway.

## Coverage

`pnpm test:coverage` writes a V8 coverage report to `coverage/`, over the source of `packages/*` and `apps/*`, excluding test files.

## Commands

Run tests from the repository root.

```sh
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm test:e2e
```

Narrow a run while working on one area. Vitest names each project after its directory, and a path after the script is forwarded to Vitest, so a single project, directory or file runs on its own:

```sh
pnpm test --project core
pnpm test --project store-sqlite --project store-d1
pnpm test packages/core/src/config.test.ts
pnpm test:watch --project server
```

[Tooling](../tooling.md#narrowing-a-run) describes the other ways to narrow a run, including Playwright's and the PostgreSQL tests that need a database.
