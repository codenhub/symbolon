---
status: APPROVED
last_updated: 2026-11-12
scope: Coding conventions for every package and app.
---

# Coding guidelines

These follow codenhub's coding guidelines, so moving between the two repositories feels the same, with the additions an identity provider needs. The [testing specification](../specs/tests.md) owns how tests are organized and run, and the [security guidelines](security.md) cover how the invariants turn into code. The [stack guidelines](stack.md) add the conventions of the project's languages and the tools that check them, such as casing and the format of API documentation.

## Naming

- Files and folders: kebab-case (`create-handler.ts`, `store-d1/`). oxlint enforces it.
- Identifiers and constants: the casing each kind takes is in the [stack guidelines](stack.md#naming).
- Booleans: prefixed with is, has, can or should (`isHttps`, `hasConsent`).
- Arrays: plural nouns (`users`, `redirectUris`).
- Functions: verb phrases (`loadConfig`, `fetchUser`).

Name by domain intent. Avoid names that say only the type or the mechanism, such as `data`, `item`, `manager`, or `helper`, unless the scope makes the meaning obvious.

## Architecture and design

- [The architecture](../architecture.md) owns the layout, the dependency direction and the runtime boundary. Code that needs to cross them changes that document first.
- Code that must run on every runtime uses only Fetch-API types, Web Crypto and the ports. A runtime's API belongs in its app or adapter.
- Prefer dependency injection to hard-coding. Time, randomness and storage arrive through ports, which is what makes the core testable and portable.
- Single responsibility: each function, class, and module does one thing well.
- Group related files in a folder with one entrypoint that exports the folder's public surface.
- High cohesion: logic that belongs together stays together.
- Loose coupling: minimize dependencies between modules.
- Keep each package's public surface small and intentional. Do not export what only the package uses.
- Keep dependency direction clear: shared code does not import app-specific code.
- Do not add a dependency unless simple in-house code is worse. A third-party dependency in an adapter is justified in the architecture document.
- Do not add compatibility layers unless there is a real consumer, persisted data, shipped behavior, or an explicit requirement that needs one.

## Upstream first

`@codenhub/oidc`, `@codenhub/jwt` and the other building blocks are meant to change as Symbolon needs them. When one lacks something or gets it wrong, the fix goes upstream in codenhub, and Symbolon takes it from a release. A workaround here is temporary and marked with the codenhub issue it waits on:

```ts
// Workaround for codenhub/codenhub#123: <what it works around>.
```

Searching for the issue reference finds every workaround to remove once the fix is released. [CONTRIBUTING.md](../../CONTRIBUTING.md#a-defect-found-mid-task) describes filing the issue.

## Code

- Functions are small and clearly nameable.
- Avoid magic numbers and strings: extract a value to a named constant when it has domain meaning or is reused.
- Code should explain itself through its names.
- Design for predictable, deterministic behavior. Time and randomness come from ports, so a test controls them.
- Avoid god objects, feature envy, and long method chains.
- Prefer readable code to clever code.

Literal values MAY stay inline when extraction makes code worse: protocol literals, header names, package names, CSS selectors, event names, SQL, test fixtures, one-off validation messages, and external API values used once near their boundary.

Function parameters:

- 0–1 parameters: excellent.
- 2 parameters: acceptable.
- 3 or more: refactor into an options object.

Exceptions: framework callbacks, test helpers, tiny local functions, and APIs where an object parameter would hide meaning instead of improving it.

## Concurrency and errors

- Run independent asynchronous work concurrently. Waiting for each in turn needs a reason, given where the code does it.
- Do not swallow errors silently. An error that cannot be shown to the client (most of them) becomes a generic response and goes to the logging port.
- Throw or return errors with enough context to debug them.
- Errors, logs and responses never carry a secret, token, code, password or personal data ([invariant 2](../specs/invariants.md#2-no-secret-is-ever-stored-in-plaintext)). `console` is forbidden by oxlint outside the entrypoints, which print startup failures.
- Logging is not a substitute for error handling.

## Inputs, failures, and state

Most review findings that hold up are about these, not about style: a [study of the review threads in codenhub/codenhub](https://github.com/codenhub/codenhub/blob/37b44e7adc31f628c94fb9ff8bd257c869f64996/packages/skills/docs/internal/coding-skill-research.md), a monorepo whose code agents wrote, records the evidence.

- Validate input from outside the code's control after it is converted, against the limits of what consumes it: `--timeout 1e308` passes "positive number" and becomes an infinite timer. Reject empty, whitespace-only, NaN, Infinity, and partial numbers such as `10s`.
- When required input is missing or matches nothing, fail with a message naming it. A run whose required input was absent never reports success.
- Hold unsaved changes in memory freely; that needs no write. Mark them as saved, such as a record's saved status or a cache entry's committed flag, only after the write succeeds, and never swallow a write error. A record shown as saved whose write failed is lost the next time the process restarts, and nobody was told.
- Apply a new option or fix to every path the same input or behavior flows through: each source of the value, sync and async variants, create and update, and every caller. Name any path left out, with the reason.
- A hand-written parser rejects syntax it does not support, naming the file and line, instead of reading it as data.
- Keep input order and any order a contract defines; sort output whose order is unspecified by a defined key with a tie-breaker.

## Testing

- Test behavior, edge cases, and error paths, not just the happy path.
- One behavior per test, named by the behavior it proves, in the form the existing tests use: `shouldRefusePlainHttpOutsideDevMode`.
- Unit tests sit next to the code they test. Integration tests sit in the package's `tests/integration/`.
- Mock the network, timers, and browser APIs. Test code whose job is file or database access against a real temporary directory or database where practical, and mock them elsewhere. Pure logic is tested directly.
- Give each behavior decision a test that fails when the decision is reversed, and see a new test fail before keeping it.
- A test that writes files uses its own directory under the system temporary directory, never the package or the current directory, and removes it afterwards.
- Poll for a condition instead of sleeping a fixed time.
- Prefer observable behavior to implementation details.
- A change in behavior changes its tests in the same commit.
- An invariant's test is named in that invariant's "Enforced by" line.

A mock answers only what the test tells it, so it cannot show the containment, symlink, and stale-output bugs found in review threads on [codenhub/codenhub#24](https://github.com/codenhub/codenhub/pull/24#discussion_r3875960231), [#25](https://github.com/codenhub/codenhub/pull/25#discussion_r3888570403), and [#293](https://github.com/codenhub/codenhub/pull/293#discussion_r4304630356). A real temporary directory does.

[The test specification](../specs/tests.md) defines the categories, the conformance suites and the security suite.

## Documentation in code

- Comments explain why, not what or how.
- Every symbol a package exports from its entrypoint has API documentation in source, in the format the [stack guidelines](stack.md) give. The documentation describes the caller-facing purpose, important inputs, return values or side effects, and observable failure, including the states a caller must handle and the conditions under which it fails. It does not restate the type signature in prose or describe private implementation details. An example in it is realistic and works against the current API.
- When a change touches a package's exports or its observable behavior or failures, it updates the API documentation and every README or document describing them in the same change.
- Remove redundant comments, decorations, and outdated docs in the change that makes them outdated.

## Formatting, linting, and type checking

- Code MUST pass `pnpm verify`, which runs the format, lint, typecheck, test and build steps. The pre-commit hook runs the format and lint checks on staged files. [Tooling](../tooling.md) names each tool.
- Do not fight the formatter's output.
- Lint rules are policy. Change a rule, or add a scoped override in `.oxlintrc.json` with its reason recorded where the rule's subject is documented, rather than disabling it broadly. A local suppression comment says why it is there.
