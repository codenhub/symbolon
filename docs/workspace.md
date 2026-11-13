---
status: IMPLEMENTED
last_updated: 2026-11-12
scope: The root script names and what each guarantees, the shared tool configurations, the pinned toolchain, install rules, and how dependency versions are declared.
---

# Workspace

This document is the workspace's contract: the names of the root scripts and what each one guarantees, the configuration files every project shares, and how versions are declared. CI, the git hooks, and the agent instructions rely on it. How this project implements the scripts, narrows a run, and adds a package is in [Tooling](tooling.md).

The workspace members are declared in `pnpm-workspace.yaml`: `apps/*`, `packages/*` and `tests/*`. [The architecture](architecture.md#layout) lists them.

## Root scripts

| Script               | Guarantees                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`  | Every file is formatted: code and JSON by oxfmt, Markdown by Prettier. Reports, writes nothing.                                          |
| `pnpm format:fix`    | The same two formatters, rewriting files.                                                                                                |
| `pnpm lint:check`    | oxlint passes over the repository.                                                                                                       |
| `pnpm lint:fix`      | oxlint, applying its safe fixes.                                                                                                         |
| `pnpm typecheck`     | Every package, app and suite type-checks, each against the configuration for the runtime it runs on.                                     |
| `pnpm test`          | Every package's and app's unit and integration suites pass. No browser is started.                                                       |
| `pnpm test:watch`    | The same, in watch mode.                                                                                                                 |
| `pnpm test:coverage` | The same, with a coverage report in `coverage/`.                                                                                         |
| `pnpm build`         | Every package that produces output builds: the Node.js bundle, the Worker dry run and the dashboard.                                     |
| `pnpm verify`        | `format:check`, `lint:check`, `typecheck`, `test` and `build`, in that order, stopping at the first failure. It does not run `test:e2e`. |
| `pnpm prepare`       | Runs on install: points git at the committed hooks in `.githooks/`.                                                                      |

`pnpm verify` is what CI runs ([CI](ci.md)), so a green local `verify` predicts a green run. The order puts the cheapest checks first, so a formatting slip is reported in a second instead of after the tests. The build comes last, unlike in a workspace whose packages are built before they are used: packages here ship their TypeScript source and have no build step ([architecture](architecture.md#builds)), so type checking and tests resolve every import without a build, and only the apps bundle.

Keep these names as they are: CI, the git hooks and the agent instructions call them by name. There is no plain `format` script on purpose: when a name matches no script, pnpm runs the program of that name from `PATH` instead, and on Windows `format` is the system disk formatter. The explicit `format:check` and `format:fix` names avoid that.

Symbolon adds these scripts:

| Script          | Guarantees                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`      | The Node.js server runs, rebuilt and restarted on every change.                                    |
| `pnpm test:e2e` | The Playwright suites pass in Chromium, Firefox and WebKit against a freshly built Node.js server. |

## Configuration

| File                             | Configures                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                   | The root scripts, the tooling as `devDependencies`, and the pinned Node.js and pnpm (`engines`, `packageManager`).                                                                                                                                                                                                      |
| `pnpm-workspace.yaml`            | The workspace globs, the catalog of every dependency version, the supply-chain rules for installs ([below](#dependency-installs)), and `engineStrict`, so an install outside `engines` fails.                                                                                                                           |
| `.nvmrc`                         | The exact Node.js version, read by `nvm` and by CI.                                                                                                                                                                                                                                                                     |
| `.editorconfig`                  | Indentation, final newline, and no hard wrap in Markdown.                                                                                                                                                                                                                                                               |
| `.gitattributes`                 | LF line endings in the repository and the working tree on every platform, and the binary file types.                                                                                                                                                                                                                    |
| `.oxfmtrc.json`                  | oxfmt: 120 columns, double quotes, semicolons, trailing commas, sorted imports and `package.json` keys. Markdown is excluded; Prettier owns it.                                                                                                                                                                         |
| `.prettierrc.json`               | Prettier, for Markdown only: `proseWrap: "never"`, so a paragraph is one line and a diff shows the sentence that changed.                                                                                                                                                                                               |
| `.prettierignore`                | Paths inside the Markdown set Prettier leaves alone: build output and caches.                                                                                                                                                                                                                                           |
| `.oxlintrc.json`                 | oxlint's plugins and rules. `no-console` is an error except in the two entrypoints that print startup failures, `apps/node/scripts/`, `.githooks/` and tests, where printing is the point. A scoped override turns off two Vitest rules for the conformance suites ([stack tests](specs/stack-tests.md#configuration)). |
| `tsconfig.base.json`             | The compiler settings every project shares ([Tooling](tooling.md#typescript-and-vitest)).                                                                                                                                                                                                                               |
| `tsconfig.runtime-agnostic.json` | The compiler settings for source that must run on every runtime: no Node.js or Workers types, so a runtime API fails the type check ([architecture](architecture.md#runtime-boundary)).                                                                                                                                 |
| `tsconfig.node.json`             | The compiler settings for Node.js code and for the tests of every package.                                                                                                                                                                                                                                              |
| `tsconfig.json`                  | The solution `tsc -b` builds. It lists projects and holds no files.                                                                                                                                                                                                                                                     |
| `vitest.config.ts`               | The Vitest projects and the coverage settings ([Tooling](tooling.md#typescript-and-vitest)).                                                                                                                                                                                                                            |
| `.dockerignore`, `deploy/`       | What the Docker build context leaves out, and the Compose examples operators start from.                                                                                                                                                                                                                                |

### Two formatters

oxfmt formats everything it understands except Markdown; Prettier formats only Markdown. oxfmt is far faster and agrees with Prettier's output for code, but its Markdown support does not yet match Prettier's, and the documentation is where formatting churn costs the most review time. `.oxfmtrc.json` ignores `**/*.md`, and the scripts hand Prettier `**/*.md` explicitly, so neither formatter touches the other's files.

### Versions

Every third-party dependency version is declared once, in the catalog in `pnpm-workspace.yaml`, and referred to as `catalog:` in each `package.json`. The workspace therefore cannot hold two versions of one dependency by accident, and an upgrade is a one-line change that Dependabot can propose ([CI](ci.md#dependency-updates)). A workspace package depends on another as `workspace:*`, and a `peerDependencies` range says what a consumer may install, so neither is a catalog entry.

The `@codenhub/*` packages are catalog entries like any other. When a fix Symbolon waits on is released upstream, raising the entry is the change that removes the workarounds that name it ([contributing](../CONTRIBUTING.md#a-defect-found-mid-task)).

## Toolchain

Local and CI runs resolve the same versions, each declared once:

| Where                                | Declares                                        |
| ------------------------------------ | ----------------------------------------------- |
| `package.json` `engines`             | The Node.js and pnpm range every run must meet  |
| `package.json` `packageManager`      | The exact pnpm version pnpm installs itself     |
| `.nvmrc`                             | The exact Node.js version, read by `nvm` and CI |
| `pnpm-workspace.yaml` `engineStrict` | Makes an install outside `engines` fail         |

CI reads those same files rather than repeating a version: `pnpm/action-setup` takes pnpm from `packageManager`, and `actions/setup-node` takes Node.js from `.nvmrc`, both in the [setup action](ci.md#toolchain), which then installs with `--frozen-lockfile`.

`engineStrict` is deliberate friction. A patch-level difference rarely matters, and the one time it does, the failure looks like a bug in the change under review rather than a difference in the runtime. It is set in `pnpm-workspace.yaml` because pnpm ignores `engine-strict` in `.npmrc`: with `engine-strict=true` there and an `engines` range the Node.js in use did not meet, `pnpm install` printed `Unsupported engine` and went on, on pnpm 11.7.0; with `engineStrict: true` in `pnpm-workspace.yaml` it stopped.

### Dependency installs

`pnpm-workspace.yaml` holds the pnpm settings that govern installs, locally and in CI alike:

- `blockExoticSubdeps: true` refuses a transitive dependency that resolves to a git repository or a tarball URL instead of the registry. A direct dependency's source is written in `package.json`, where a reviewer sees it; a transitive one would arrive through another package's manifest unseen.
- `trustPolicy: no-downgrade` refuses a version whose publish-time trust evidence, such as provenance or trusted publishing, is weaker than that of an earlier version of the same package. A release that drops its provenance is a common sign of a compromised publish.
- `allowBuilds` lists the only dependencies whose install scripts run: `esbuild` and `workerd`, which fetch their binaries on install. A dependency that needs a script gets an entry in the same change, with the reason.
- pnpm's default `minimumReleaseAge` prefers a version published at least a day ago, so a compromised release is usually caught and pulled before it is chosen here. It is not a hard gate: the workspace does not set `minimumReleaseAge`, so pnpm's default non-strict mode applies, and when the only version that matches a range or an exact pin is younger than a day, pnpm installs it anyway. Setting `minimumReleaseAge` explicitly, in `pnpm-workspace.yaml` or in a contributor's own pnpm configuration, makes it strict, so such an install fails instead; a version needed sooner then goes in `minimumReleaseAgeExclude`, by exact version, and leaves it once it is old enough.

## Git hooks

[Contributing](../CONTRIBUTING.md#hooks) lists what each hook checks and why each does that much and no more. This section records what is particular to this stack.

`pre-commit` itself knows nothing of the stack: it finds the staged files, keeps partly staged ones out of the rewrite, and calls `profile_fix` and `profile_check` from `.githooks/profile.sh`, which run oxfmt, Prettier, and oxlint. oxfmt is handed every staged file and formats those it understands, so the hook covers the same files as `pnpm format:check`, YAML and the formats oxfmt gains later included, with no list of extensions to fall behind. A formatter for code in another language adds its commands to both functions and to the `format:fix` and `format:check` scripts, so the hook and the gate run the same formatter; when oxfmt also understands those files, they are listed in `ignorePatterns` in `.oxfmtrc.json`. The type checker and the tests belong to `pnpm verify`.

The hooks are wired by `core.hooksPath`, which the root `prepare` script sets on every install with `git config`. That is a local git setting rather than a tracked one, so a fresh clone runs no hooks until something sets it; doing it from `prepare` keeps a hook manager out of the dependency list. The setup step never fails an install: a tree without git, or without permission to write its config, reports and carries on.
