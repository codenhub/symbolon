---
status: IMPLEMENTED
last_updated: 2026-11-12
scope: The CI workflow, the shared setup action, action pinning, releases, dependency updates, and branch protection.
---

# Continuous integration

`.github/workflows/ci.yml` verifies every pull request, every merge-queue check, and every push to `main`. It runs the same gate a contributor runs locally, `pnpm verify`, plus the checks that need more than a laptop has: a PostgreSQL service, real browsers and the Docker image. A green run means the gate passed rather than that some CI-only approximation of it did. [Workspace](workspace.md) says what each check guarantees.

## Toolchain

Local and CI runs resolve the same versions, each declared once, and CI reads those same declarations rather than repeating a version. A version is raised in one place, and a machine that cannot satisfy it is told at install time instead of failing later in a way nobody can reproduce. [Workspace](workspace.md#toolchain) lists where each version is declared.

The composite action `.github/actions/setup` sets up the toolchain and installs from the lockfile, so every job that needs the project sets it up the same way. A lockfile that disagrees with the manifests fails the install rather than being rewritten in CI.

## Pull requests and `main`: `.github/workflows/ci.yml`

Every job runs on every pull request, every merge-queue check, and every push to `main`. The workspace is small enough that a full run is a few minutes, so there is no changed-package selection to get wrong.

| Job                | Checks                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Verify`           | `pnpm verify`, with a PostgreSQL 17 service so the PostgreSQL conformance tests run instead of skipping. This covers SQLite, D1 and the Worker in workerd, and every build. Then the `Working tree is clean` step. |
| `End-to-end (...)` | The Playwright suites, one job per engine, in the Playwright image of the version the lockfile pins.                                                                                                               |
| `End-to-end`       | Passes only when every engine job did. This is the check a branch rule requires, since the matrix reports one check per engine.                                                                                    |
| `Docker image`     | Builds the image for one architecture, and checks that it runs as non-root, refuses a plain-HTTP issuer, becomes healthy on its own health check, and writes its database to the volume.                           |

Wrangler's telemetry is turned off for the whole workflow (`WRANGLER_SEND_METRICS=false`), as [invariant 11](specs/invariants.md#11-free-forever) asks of anything that runs on Symbolon's behalf.

By default there is no change-based selection: every run checks the whole workspace. A check that skips part of the workspace on a pull request lets that part reach `main` unverified, and a selection has to be maintained and can be wrong in ways a green run hides. If the full run grows too slow to wait for, add selection then, under three rules:

- **The whole workspace is checked before the merge lands.** A merge queue does that: it runs the full check on the merge result and drops a pull request that fails it. A push run on `main` only reports afterwards, once the failure is already there. Without a queue, the pull requests of codenhub/codenhub, the monorepo this rule comes from, went green on their own packages while 3 of 30 merges on 2026-11-03 failed on `main`, in packages those pull requests never touched ([codenhub/codenhub@702af904](https://github.com/codenhub/codenhub/commit/702af904)).
- **A change to `.github/` runs everything.** A workflow or the setup action belongs to no package, so a selection by changed package selects nothing, and the run passes without exercising the change it was opened for ([codenhub/codenhub@3d9bfe8a](https://github.com/codenhub/codenhub/commit/3d9bfe8a)).
- **The run asserts the ref it compares against.** A selection that compares against the base branch needs that ref in the checkout (`fetch-depth: 0`), and the job checks the ref exists before selecting: a tool that falls back to working-tree changes when the ref is missing would, in CI, check nothing and report success.

`Working tree is clean` fails when a check has left a tracked or untracked file changed. A check that writes has changed what it was checking, so it is reported rather than passing.

Runs for the same pull request cancel each other, because only the newest push is worth a verdict. A merge-queue run or a push to `main` is never cancelled to make way for a newer one: each is the authoritative check of a commit, so each is grouped by its commit rather than its branch. Grouping by branch would not hold that: a concurrency group holds one running and one pending run, and GitHub cancels the pending one when a third arrives, whatever `cancel-in-progress` says, so three quick pushes to `main` would leave the second without a verdict. The cost is that runs on `main` can run in parallel. The `merge_group` trigger never fires in a repository without a merge queue; if Symbolon requires one, it removes the `push` trigger, since the queue lands the exact commit it checked. The workflow's token is read-only (`permissions: contents: read`); a job that needs more asks for it on that job alone.

## Changing the workflow

Prefer adding a check to the gate over adding a step to the workflow. A step only CI can run is a step nobody can reproduce before pushing, and that is how CI turns into a second build system. The jobs above are the exceptions, each for something a laptop cannot be assumed to have, and each is documented here.

### Pinning third-party actions

Every action from another repository is referenced by full commit SHA, with the release it corresponds to in a trailing comment:

```yaml
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

A tag is a mutable pointer. `@v7` resolves to whatever its owner last pointed it at, so a compromised or simply retagged release changes what runs here without any change landing in this repository. A SHA cannot move, which turns an action upgrade into a reviewable diff. The comment carries the human-readable version, because a bare SHA says nothing about how far behind it is.

The rule is all or nothing on purpose. Pinning some actions and not others is worse than pinning none: a reader cannot tell a reference that was reviewed from one that was missed. Adding an action means resolving its SHA in the same change. The repository's Actions settings can enforce the rule, refusing any workflow that references another repository's action by anything but a full SHA; that setting is dashboard state, so turn it on when the repository is created.

`./.github/actions/setup` is deliberately not pinned. It is a path in this repository, already versioned by the commit under test.

For a hand upgrade, resolve the new SHA with `gh` and update the comment alongside it:

```sh
gh api repos/actions/checkout/commits/v7.0.1 --jq .sha
```

## Releases: `.github/workflows/release.yml`

A tag `v<version>` on a commit of `main` publishes the image to `ghcr.io/<owner>/symbolon` for `linux/amd64` and `linux/arm64`, tagged with the version, the minor line (`0.1`) and, for a version without a pre-release suffix, `latest`. The image carries an SBOM and build provenance. The workflow refuses a tag that does not match `version` in the root `package.json`.

The Workers template is not published: an operator deploys it from a checkout of the tag, as [the operator guide](guides/operator.md#cloudflare-workers) describes.

## Dependency updates

`.github/dependabot.yml` proposes weekly updates for the GitHub Actions, including the composite actions under `.github/actions/`, the Docker base image, and the npm dependencies, with the `@codenhub/*` packages in a group of their own because their updates often need code changes here. It moves an action's SHA and its version comment together, so a pin and its label cannot drift apart. npm updates arrive as catalog changes in `pnpm-workspace.yaml`, with the lockfile, as [Workspace](workspace.md#versions) describes. Every update pull request is labelled `type:chore`.

The groups take minor and patch updates only, so a week brings at most one pull request per group: `codenhub` and `toolchain` for npm, and `actions` for each listed directory, since Dependabot groups each directory on its own. Two pull requests for the actions in one week, or two for npm, is the configuration working, not a duplicate; the Docker base image has no group and gets a pull request per update. A major update, such as Vitest 4 to 5, arrives as a pull request of its own: it is a decision that may need code changes, and inside a group it would hold the routine updates back until it is dealt with.

A dependency held back for a known breakage gets an `ignore` entry with the reason and the condition for removing it.

Renovate does the same job, and was rejected: it runs as a GitHub App with a configuration of its own, while Dependabot is built into GitHub and already raises the repository's security updates.

## Branch protection

The workflow reports; it does not block on its own. What blocks is a branch protection rule or a ruleset on `main`, repository settings no file here can enforce. A ruleset does the same job with more control, and either works if nobody can bypass it. The recommended configuration:

| Setting                | Value                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| Required status checks | `Verify`, `End-to-end` and `Docker image`, from the GitHub Actions app |
| Pull request required  | Yes                                                                    |
| Enforced for admins    | Yes, with no bypass actors                                             |
| Force pushes, deletion | Refused                                                                |

Binding the checks to the GitHub Actions app stops any other integration from reporting a passing check under the same name. Admin enforcement is what makes the rest hold: without it, a maintainer's direct push to `main` is stopped only by the `pre-push` hook, which `--no-verify` skips.

Turn on "Automatically delete head branches" in the repository's general settings too; it is available on every plan. Deleting a merged branch is what makes GitHub retarget a pull request built on it to that branch's own base. With the branch left behind, the next pull request merges into it and never reaches `main`.
