---
status: IMPLEMENTED
last_updated: 2026-10-20
scope: The pinned toolchain, the CI jobs, releases, and dependency updates.
---

# CI

## Pinned toolchain

A local run and a CI run resolve the same versions. `engines` in `package.json` declares the range, `.nvmrc` names the exact Node.js, `packageManager` names the exact pnpm, and `.npmrc` sets `engine-strict` so an install outside the range fails rather than warns. `.github/actions/setup` reads `.nvmrc` and `packageManager`, so CI has no versions of its own to keep in step.

Every third-party action is pinned to a commit SHA, with its version in a comment. A tag can be moved to other code; a SHA cannot. Dependabot proposes the updates.

pnpm 11's supply-chain settings are on in `pnpm-workspace.yaml`: `trustPolicy: no-downgrade` refuses a version published with weaker provenance than an earlier one, `blockExoticSubdeps` refuses dependencies from git or tarball URLs, and `allowBuilds` lists the only packages whose install scripts run (esbuild and workerd, which fetch their binaries).

## Pull requests and `main`: `.github/workflows/ci.yml`

Every job runs on every pull request and every push to `main`. The workspace is small enough that a full run is a few minutes, so there is no changed-package selection to get wrong.

| Job                | Checks                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Verify`           | `pnpm verify`, with a PostgreSQL 17 service so the PostgreSQL conformance tests run instead of skipping. This covers SQLite, D1 and the Worker in workerd, and every build.              |
| `End-to-end (...)` | The Playwright suites, one job per engine, in the Playwright image of the version the lockfile pins.                                                                                     |
| `End-to-end`       | Passes only when every engine job did. This is the check a branch rule requires, since the matrix reports one check per engine.                                                          |
| `Docker image`     | Builds the image for one architecture, and checks that it runs as non-root, refuses a plain-HTTP issuer, becomes healthy on its own health check, and writes its database to the volume. |

The checks a protected `main` should require are `Verify`, `End-to-end` and `Docker image`.

Wrangler's telemetry is turned off for the whole workflow (`WRANGLER_SEND_METRICS=false`), as [invariant 11](specs/invariants.md#11-free-forever) asks of anything that runs on Symbolon's behalf.

## Releases: `.github/workflows/release.yml`

A tag `v<version>` on a commit of `main` publishes the image to `ghcr.io/<owner>/symbolon` for `linux/amd64` and `linux/arm64`, tagged with the version, the minor line (`0.1`) and, for a version without a pre-release suffix, `latest`. The image carries an SBOM and build provenance. The workflow refuses a tag that does not match `version` in the root `package.json`.

The Workers template is not published: an operator deploys it from a checkout of the tag, as [the operator guide](guides/operator.md#cloudflare-workers) describes.

## Dependency updates: `.github/dependabot.yml`

Weekly, grouped by ecosystem: GitHub Actions, the Docker base image, and npm, with the `@codenhub/*` packages in a group of their own because their updates often need code changes here.
