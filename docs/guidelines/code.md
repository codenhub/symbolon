---
status: APPROVED
last_updated: 2026-10-20
scope: Coding conventions for every package and app.
---

# Coding guidelines

These follow codenhub's coding guidelines, so moving between the two repositories feels the same, with the additions an identity provider needs. [Security guidelines](security.md) cover how the invariants turn into code.

## Naming

- Files and folders: kebab-case (`create-handler.ts`, `store-d1/`). oxlint enforces it.
- Variables and functions: camelCase (`loadConfig`, `isDevMode`).
- Classes and types: PascalCase (`ConfigError`, `SettingsStore`).
- Constants: UPPER_SNAKE_CASE (`MIGRATIONS_TABLE`).
- Booleans: prefixed with is, has, can or should (`isHttps`, `hasConsent`).
- Arrays: plural nouns. Functions: verb phrases.

Name by domain intent. Avoid names that say only the type or the mechanism, such as `data`, `item`, `manager` or `helper`, unless the scope makes the meaning obvious.

## Architecture

- [The architecture](../architecture.md) owns the layout, the dependency direction and the runtime boundary. Code that needs to cross them changes that document first.
- Code that must run on every runtime uses only Fetch-API types, Web Crypto and the ports. A runtime's API belongs in its app or adapter.
- Prefer dependency injection to hard-coding: the clock, randomness, mail and storage arrive through ports, which is what makes the core testable and portable.
- Keep each function and module to one responsibility. Group related files in a folder with an `index.ts` entrypoint.
- Keep each package's exports small and intentional. Do not export what only the package uses.
- Do not add a dependency unless simple in-house code is worse. A third-party dependency in an adapter is justified in the architecture document.
- Do not add compatibility layers without a real consumer, persisted data, or shipped behavior that needs one.

## Upstream first

`@codenhub/oidc`, `@codenhub/jwt` and the other building blocks are meant to change as Symbolon needs them. When one lacks something or gets it wrong, the fix goes upstream in codenhub, and Symbolon takes it from a release. A workaround here is temporary and marked with the codenhub issue it waits on:

```ts
// Workaround for codenhub/codenhub#123: <what it works around>.
```

Searching for the issue reference finds every workaround to remove once the fix is released. CONTRIBUTING.md describes filing the issue.

## TypeScript

- Strict TypeScript, with `noUncheckedIndexedAccess`.
- Prefer `unknown` to `any`, which oxlint forbids. Validate `unknown` at the boundary before use.
- Prefer interfaces for object shapes and type aliases for unions.
- Use type-only imports for types (`verbatimModuleSyntax` requires it).
- Keep casts narrow and close to the boundary that justifies them, as `store-d1`'s tests do with Miniflare's D1 binding.

## Code

- Small functions with clear names; readable over clever.
- `const` over `let`; never `var`.
- Extract magic numbers and strings with domain meaning to named constants. Protocol literals, header names, SQL and test fixtures may stay inline.
- 0 to 2 parameters; 3 or more become a typed options object, except where an object would hide meaning.
- Deterministic behavior: time and randomness come from ports, so a test controls them.

## Async and errors

- `async`/`await`; independent work runs in parallel with `Promise.all`. Sequential awaits in a loop need a reason in an `oxlint-disable-next-line` comment, as migrations have.
- Never swallow an error silently. An error that cannot be shown to the client (most of them) becomes a generic response and goes to the logging port.
- Errors, logs and responses never carry a secret, token, code, password or personal data ([invariant 2](../specs/invariants.md#2-no-secret-is-ever-stored-in-plaintext)). `console` is forbidden by oxlint outside the entrypoints, which print startup failures.

## Tests

- Test behavior, edge cases and error paths, one behavior per test, with descriptive names (`shouldRefusePlainHttpOutsideDevMode`).
- Unit tests sit next to the code; integration tests in the package's `tests/integration/`.
- A change in behavior changes its tests in the same commit.
- An invariant's test is named in that invariant's "Enforced by" line.

[The test specification](../specs/tests.md) defines the categories, the conformance suites and the security suite.

## Documentation in code

- Comments say why, not what or how.
- Every exported symbol of a package's entrypoint has TSDoc: a one-sentence summary, `@param` for each parameter with intent rather than type, `@returns` including the states a caller must handle, and `@throws` for each failure. oxlint checks the tags' structure.
- Remove outdated comments in the change that makes them outdated.

## Formatting and linting

- Code passes `pnpm format:check` and `pnpm lint:check`; `pnpm verify` and the pre-commit hook run both.
- oxfmt formats code and JSON, Prettier formats Markdown. Do not fight the formatter.
- Lint rules are policy. Change a rule, or add a scoped override in `.oxlintrc.json` with its reason recorded where the rule's subject is documented, rather than disabling it broadly.
