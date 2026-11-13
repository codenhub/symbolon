---
status: APPROVED
last_updated: 2026-11-12
scope: TypeScript, JavaScript, and Node.js conventions, on top of the coding guidelines.
---

# TypeScript guidelines

The [coding guidelines](code.md) hold for every language in the project. This document adds what is particular to TypeScript, JavaScript, and Node.js, and the tools that check them.

## Naming

- Files and folders: kebab-case (`create-handler.ts`, `store-d1/`). oxlint enforces it for file names; review keeps folder names.
- Variables and functions: camelCase (`loadConfig`, `isDevMode`).
- Classes and types: PascalCase (`ConfigError`, `SettingsStore`).
- Constants: UPPER_SNAKE_CASE (`MIGRATIONS_TABLE`).

## TypeScript

- Use strict TypeScript; `tsconfig.base.json` sets the flags, including `noUncheckedIndexedAccess`.
- Prefer `const` to `let`; never use `var`.
- Prefer `unknown` to `any`, which oxlint forbids. Validate `unknown` at the boundary before use.
- Prefer interfaces for object shapes and type aliases for unions and intersections.
- Use type-only imports when importing only types; `verbatimModuleSyntax` requires it, and oxlint checks it.
- Prefer string-literal unions or `as const` objects to `enum`. `enum` is not erasable syntax: Node.js type stripping rejects it, so code that `tsc` and Vitest accept can fail when Node.js loads it. Tests of `enum` support are the exception. An earlier rule allowed `enum` and named its members in UPPER_SNAKE_CASE; it was replaced once code run by Node.js directly hit the rejection ([codenhub/codenhub@e3ae18df](https://github.com/codenhub/codenhub/commit/e3ae18df)).
- Keep casts narrow and close to the boundary that justifies them, as `store-d1`'s tests do with Miniflare's D1 binding.
- Do not export types or values that are not part of the package or module API.
- A function with three or more parameters takes a typed options object instead, under the exceptions the [coding guidelines](code.md#code) give.
- Source that must run on every runtime is checked against `tsconfig.runtime-agnostic.json`, which loads no Node.js types: a runtime API there fails `pnpm typecheck`. [The architecture](../architecture.md#runtime-boundary) owns which packages that covers.

## Modules and imports

- Group related files in a folder with an `index.ts` entrypoint.
- Prefer named exports, except where a tool or framework requires a default export, such as config files or framework routes.
- Use barrel files only as package or folder entrypoints.
- Do not deep-import another package's internals unless the subpath is part of its `exports`.

## Async and logging

- Use `async`/`await` for asynchronous code.
- Run independent async work in parallel with `Promise.all()`. Sequential awaits in a loop need a reason, given in the comment on the `oxlint-disable-next-line` suppression they require, as the migrations have.
- `console` is for entrypoints reporting startup failures, build scripts, git hooks, and tests: the paths `.oxlintrc.json` exempts from `no-console`. oxlint forbids it elsewhere, and a deliberate diagnostic there needs a scoped lint override with its reason. Casual logging is not a substitute for error handling, and the [security guidelines](security.md) say what may reach a log.

## TSDoc

The API documentation the [coding guidelines](code.md#documentation-in-code) require is TSDoc in source. Every symbol exported from a package's entrypoint, through `package.json` `exports`, is that package's API to the others: functions, classes and their public members, interfaces, type aliases, constants, and configuration objects. Its TSDoc:

- Opens with a one-sentence summary of what the symbol does for the caller, in the present tense. Longer explanation goes in `@remarks`.
- Documents every parameter and type parameter with `@param` and `@typeParam`, giving intent and any constraint, unit, or accepted range rather than the type. A `@param` MAY be left out only when the name already fixes the meaning exactly.
- Documents the returned value with `@returns`, including the states a caller must handle, such as an empty collection, `null`, or a failed result. Leave it out for `void`.
- Gives one `@throws` per error type, with the condition that triggers it. A symbol that reports failure by return value instead says so where a reader would expect a throw.
- Gives `@defaultValue` to an optional parameter or property whose default a caller cannot infer.
- Carries `@deprecated` with the replacement and, when known, the version that removes it.
- Documents each public member of a class or interface with its own TSDoc. A bare member is an incomplete API.
- Prefers `{@link OtherSymbol}` to repeating another symbol's contract.

`@example` blocks are encouraged for any non-obvious usage; each MUST be realistic and compile against the current API.

An export needed only to compose entrypoints SHOULD stay out of public entrypoints. When one cannot, mark it `@internal`.

oxlint checks the structure of the tags: `.oxlintrc.json` enables the `jsdoc` rules for parameter, return, throws and property descriptions and tag shape, though not that a tag is present.

## Formatting, linting, and type checking

- oxfmt formats code and JSON, and Prettier formats Markdown. Do not fight the formatter. While working, `pnpm format:check`, `pnpm lint:check`, and `pnpm typecheck` run the gate's parts on their own; [Workspace](../workspace.md#root-scripts) lists them.
- Lint rules are policy. Change a rule, or add a scoped override in `.oxlintrc.json` with its reason recorded where the rule's subject is documented, rather than disabling it broadly.

## Frameworks and styling

The admin dashboard is a Vite single-page app that uses `@codenhub/styles` and `@codenhub/icons`; `apps/dashboard/AGENTS.md` records its traps, and [the architecture](../architecture.md#dashboard) its decisions.
