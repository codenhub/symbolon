---
status: APPROVED
last_updated: 2026-10-20
scope: Test categories, where each lives, the conformance and security suites, and what CI runs.
---

# Tests

## Principles

- Test observable behavior, not implementation.
- Every error path an attacker can reach is tested as carefully as the happy path. For an identity provider the failure cases are the product.
- Tests are fast and deterministic; a flaky test is a bug. Time and randomness come from ports a test controls.
- Every invariant has a test, named in the invariant's "Enforced by" line ([invariants](invariants.md)).

## Categories

| Category    | Where                                  | Runs with                            | Covers                                                                      |
| ----------- | -------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| Unit        | Next to the code: `src/<file>.test.ts` | `pnpm test`                          | One module, its dependencies replaced by the memory store or a fake port.   |
| Integration | `<package>/tests/integration/`         | `pnpm test`                          | A real boundary: a database, `node:http`, workerd.                          |
| Conformance | Each adapter's `tests/integration/`    | `pnpm test`                          | Every store adapter against the shared suites. See below.                   |
| Security    | `packages/server/tests/security/`      | `pnpm test`                          | The hostile-input suite. See below.                                         |
| End-to-end  | `tests/e2e/specs/`                     | `pnpm test:e2e`                      | Full user journeys in Chromium, Firefox and WebKit, against a built server. |
| OpenID      | Documented in the operator guide       | By hand, against a deployed instance | The OpenID conformance suite's Basic OP and Config OP plans.                |

Unit and integration tests use Vitest. Each package and app has a `vitest.config.ts` naming its project, and the root config runs them all in one process.

End-to-end tests are a workspace package of their own, `tests/e2e`, rather than living in an app, because each journey crosses every package and will run against both runtimes. They are reachable only through `test:e2e`; `pnpm test` never starts a browser. Playwright project names are the engine names (`chromium`, `firefox`, `webkit`), so CI can run one engine per job.

## Conformance suites

Invariant 8 requires every adapter to pass two suites on its real database:

- `storeConformanceCases` from `@symbolon/store/testing`: Symbolon's own store behavior.
- `storeConformanceCases` from `@codenhub/oidc/testing`: the atomicity the OIDC flows need. It joins once the adapters implement `OidcStore`.

Each case runs as its own test against a fresh database: `:memory:` for SQLite, a fresh Miniflare for D1, and a schema of its own for PostgreSQL. The cases throw instead of using Vitest's assertions, so they could also run inside workerd; this is why `.oxlintrc.json` turns off `vitest/expect-expect` and `vitest/valid-title` for `conformance.test.ts` files.

A new adapter is not done until both suites pass on it in CI.

### Databases in CI and locally

- SQLite runs everywhere, on `node:sqlite`.
- D1 runs everywhere, in workerd through Miniflare.
- PostgreSQL runs when `SYMBOLON_TEST_POSTGRES_URL` is set, and its tests are skipped otherwise, so `pnpm test` works on a machine without Docker. CI always sets it ([CI](../ci.md)); [tooling](../tooling.md#postgresql-tests) shows how to run it locally.

## Both runtimes

The Workers build is tested in workerd, not only on Node.js: `apps/workers/tests/integration/` bundles the Worker with esbuild and runs it in Miniflare against a real D1. A test that matters on both runtimes is written once, in `server` against the memory store, and exercised again end to end on each runtime.

## Security suite

In the spirit of the codenhub packages' hostile-input suites, `packages/server/tests/security/` holds one file per concern, each added with the feature it guards:

- setup without the token, or with a wrong one
- user enumeration: same responses and comparable timing for existing and missing accounts
- CSRF on every state-changing route, found by walking the route table
- a permission declared on every admin route, found the same way
- brute-force limits on login, MFA, reset and the token endpoint
- known secrets absent from logs, errors, responses and audit entries
- clickjacking headers and the CSP on every HTML response

Tests that walk the route table fail when a route is added without the protection, which is the point: the suite cannot fall behind the routes.

## Coverage

`pnpm test:coverage` writes a V8 report to `coverage/`. 80% is the target for `core` and `server`. Coverage guides review; it does not fail a build.
