---
status: APPROVED
last_updated: 2026-11-12
scope: Test categories, where each lives, the conformance and security suites, and coverage expectations.
---

# Tests

This document defines how Symbolon is tested: what kinds of tests exist, where they live, how they run, and what they are expected to cover. The conventions for writing an individual test are in the [coding guidelines](../guidelines/code.md#testing), and the runners, file names, configuration, and commands of the project's stack are in [stack tests](stack-tests.md).

## Principles

- **Test behavior, not implementation.** A test verifies what a caller can observe, not how the code produces it.
- **Fast and deterministic.** A flaky test is a bug. Time and randomness come from ports a test controls, and a test that depends on real timing or a real window does not belong in the default suite. The default suite reaches the network only on loopback (the `node:http` tests) and, when `SYMBOLON_TEST_POSTGRES_URL` is set, the PostgreSQL server that variable names.
- **Error paths count.** Failure cases are tested as carefully as the happy path, and inputs and edge cases early. Every error path an attacker can reach counts most: for an identity provider the failure cases are the product.
- **Every invariant has a test,** named in the invariant's "Enforced by" line ([invariants](invariants.md)).
- **No permanent absence checks.** A test asserting only that a removed name, class, or token is gone, such as an assertion that some output does not contain `old-name`, verifies nothing about current behavior: it is indistinguishable from asserting the absence of a string that never existed. Such a check earns its place only while a rename or removal is in flight, as a guard against a forgotten reference; delete it once the change is verified, in the same pull request. A durable rule, such as "no compatibility aliases", is a lint rule or repository check, not a permanent unit test.

## Categories

| Category    | Where                               | Runs                                     | Covers                                                                      |
| ----------- | ----------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| Unit        | Next to the code it tests           | With the default suite                   | One module, its dependencies replaced by the memory store or a fake port.   |
| Integration | In the package or app it belongs to | With the default suite                   | A real boundary: a database, `node:http`, workerd.                          |
| Conformance | Each adapter's integration tests    | With the default suite                   | Every store adapter against the shared suites. See below.                   |
| Security    | `packages/server/tests/security/`   | Planned; no tests exist yet              | The hostile-input suite. See below.                                         |
| Browser     | `tests/e2e`, a workspace package    | Apart from the default suite, on its own | Full user journeys in Chromium, Firefox and WebKit, against a built server. |
| OpenID      | Not in the repository               | By hand, against a deployed instance     | The OpenID conformance suite's Basic OP and Config OP plans.                |

The default suite is what the gate's test step runs. Add a category only when the project has tests for it, and mark one that is only planned as such, as the security suite is: an empty suite, or a script that passes without running anything, misleads more than a missing one.

Manual usage scenarios, such as a playground used during development, are outside these categories.

### Unit tests

- A test file is named after the file it covers, as [stack tests](stack-tests.md#runners-and-file-names) gives.
- What to mock, and what to test against real temporary state instead, is owned by the [coding guidelines](../guidelines/code.md#testing).
- Do not import test utilities across distant packages, except from a package or subpath that exists to share them.

### Integration tests

- Integration tests live inside the package or app they belong to. Do not add a repository-root `tests/` directory by default.
- When a journey or orchestration genuinely spans packages, a dedicated workspace package for those tests is allowed, rather than placing them in one of the packages they cross. `tests/e2e` is one: each journey crosses every package and runs against both runtimes.

### Browser tests

- Browser suites are configured and run apart from the default suite, so the loop everyone runs constantly stays fast and needs no browser installed.
- A suite SHOULD cover every engine its users run, because catching what one engine does differently is what the suite is for. Cookie and redirect behavior is where engines differ most, and an identity provider is made of both.
- In CI, a failed browser test is retried once and a pass on the retry is reported as flaky, not as passed; locally it is not retried. [Stack tests](stack-tests.md#browser-suites) gives the setting and the evidence behind it.
- Add visual regression tests once a component has an agreed visual design, not for placeholder interfaces.

## Conformance suites

Invariant 8 requires every adapter to pass two suites on its real database:

- `storeConformanceCases` from `@symbolon/store/testing`: Symbolon's own store behavior.
- `storeConformanceCases` from `@codenhub/oidc/testing`: the atomicity the OIDC flows need. It joins once the adapters implement `OidcStore`.

Each case runs as its own test against a fresh database: `:memory:` for SQLite, a fresh Miniflare for D1, and a schema of its own for PostgreSQL. The cases throw instead of using the runner's assertions, so they could also run inside workerd; this is why [stack tests](stack-tests.md#configuration) turn off two lint rules for `conformance.test.ts` files.

A new adapter is not done until both suites pass on it in CI.

### Databases in CI and locally

- SQLite runs everywhere, on `node:sqlite`.
- D1 runs everywhere, in workerd through Miniflare.
- PostgreSQL runs when `SYMBOLON_TEST_POSTGRES_URL` is set, and its tests are skipped otherwise, so the default suite works on a machine without Docker. CI always sets it ([CI](../ci.md)); [tooling](../tooling.md#postgresql-tests) shows how to run it locally.

## Both runtimes

The Workers build is tested in workerd, not only on Node.js: `apps/workers/tests/integration/` bundles the Worker with esbuild and runs it in Miniflare against a real D1. A test that matters on both runtimes is written once, in `server` against the memory store, and exercised again end to end on each runtime.

## Security suite

Planned: `packages/server/tests/security/` does not exist yet, and `pnpm test` runs nothing from it. In the spirit of the codenhub packages' hostile-input suites, it will hold one file per concern, each added with the feature it guards:

- setup without the token, or with a wrong one
- user enumeration: same responses and comparable timing for existing and missing accounts
- CSRF on every state-changing route, found by walking the route table
- a permission declared on every admin route, found the same way
- brute-force limits on login, MFA, reset and the token endpoint
- known secrets absent from logs, errors, responses and audit entries
- clickjacking headers and the CSP on every HTML response

Tests that walk the route table fail when a route is added without the protection, which is the point: the suite cannot fall behind the routes.

## Coverage

The coverage script writes a report, as [stack tests](stack-tests.md#coverage) describes. The target is **80%** for `core` and `server`. It guides development and review; it is not a gate and never fails a build, because a coverage threshold that blocks merges gets satisfied with tests that execute lines without asserting anything.

## Not covered by automated tests

Behavior that no automated test reaches is listed here with how it is verified instead, usually by hand, and why a suite was not added. A gap that is written down can be judged; a gap nobody recorded is found by a user.

- **OpenID conformance.** The OpenID conformance suite (Basic OP and Config OP plans) runs by hand against a deployed instance, as [the scope](../scope.md) plans. CI has no deployed instance to point it at.
