# Contributing

This document defines the contributor workflow, from a working tree through validation, review and release. It applies to maintainers, contributors and AI agents, and follows codenhub's workflow, so moving between the two repositories feels the same.

[The documentation index](docs/README.md) maps the scope, invariants, architecture and guidelines. [Tooling](docs/tooling.md) describes the commands below. [Agent instructions](AGENTS.md) hold agent-specific guidance.

## Setup

The toolchain is pinned, and an install outside it fails rather than warns:

```sh
nvm use
pnpm install
```

`pnpm install` also points git at `.githooks/` through `core.hooksPath`, so the hooks below work after the first install. [CI](docs/ci.md) explains where the versions are pinned.

## Changes

- Keep each change within its scope and preserve unrelated work.
- [The invariants](docs/specs/invariants.md) hold in every change. A change that touches one adds or updates its test.
- APPROVED and IMPLEMENTED documentation governs the change; existing code may lag it. [Documentation guidelines](docs/guidelines/documentation.md) cover conflicts and exceptions.
- Update affected documentation in the same change as behavior, configuration, or conventions.
- Never commit secrets, `.env` files, databases or build output.

## Issues

Defects and requests are GitHub issues, opened through the bug and feature forms. A vulnerability is the exception: report it privately, as [SECURITY.md](SECURITY.md) describes.

Each issue carries one `type:` label, the `pkg:` or `app:` label of the area it is in, and a `status:` label when it is not moving. `upstream` marks an issue that needs a codenhub change first. `.github/labels.json` lists them all; after editing it, create them on GitHub:

```sh
jq -c '.[]' .github/labels.json | while read -r label; do
  gh label create "$(jq -r .name <<<"$label")" --color "$(jq -r .color <<<"$label")" --description "$(jq -r .description <<<"$label")" --force
done
```

### A defect in a codenhub package

Symbolon is the first real consumer of `@codenhub/oidc`, so its gaps will surface here. A defect or missing feature in a codenhub package is fixed upstream, not around: file it in codenhub, work around it here if you can, and mark the workaround with the issue:

```sh
gh issue create --repo codenhub/codenhub --title "oidc: <what is wrong>" --label "type:bug,pkg:oidc,found-in:external" --body "<what happened, what was expected, and the workaround>"
```

```ts
// Workaround for codenhub/codenhub#123: <what it works around>.
```

Once codenhub releases the fix, raise the catalog entry in `pnpm-workspace.yaml` and remove every workaround that names the issue. A defect with no workaround blocks the task; the upstream fix goes first.

Opening an issue is outward-facing. An agent drafts it and asks before filing.

## Branches

Work happens on a branch. Do not commit to `main`, which CI verifies and releases are tagged from. A pre-push hook refuses a push to it. The exception takes an explicit request from a maintainer, in the moment, for that specific commit.

Name the branch `<type>/<slug>`, where `<type>` is the [commit type](#type) and `<slug>` is kebab-case:

```
feat/server-discovery
fix/sqlite-busy-timeout
docs/operator-backups
```

A tool that names its own branches (`claude/...`, `codex/...`) does not make an exception: rename with `git branch -m <type>/<slug>` before the first push. The pre-push hook refuses any other name.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>)!: <subject>

<body>

<trailers>
```

### Type

One of `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

### Scope

Optional: the package or app directory name (`core`, `server`, `store-d1`, `node`, `workers`, `dashboard`, `e2e`), or a repository area such as `ci` or `deps`.

### Subject

Imperative, lowercase, no trailing period, under 72 characters (the `commit-msg` hook enforces the shape). Say what the change does for someone reading the log: `fix(server): build request urls on the issuer, not the host header`, not `fix(server): update serve.ts`.

Append `!` for a change an operator must act on when upgrading, such as a renamed variable or an incompatible migration, and say what to do in the body.

### Body

Optional. Write one when the reason is not obvious from the subject: why over what.

### Atomic commits

One commit does one thing. Split by intent, not by file count. Formatting churn, unrelated fixes and drive-by refactors are their own commits. If a subject needs "and", it is usually two commits.

### Co-authorship

A commit an AI agent wrote or substantially shaped carries a `Co-authored-by` trailer naming the model, not the tool:

```
Co-authored-by: Claude Opus 5.5 <noreply@anthropic.com>
```

The human directing the work stays the author.

## Validation

Run scripts from the repository root. Narrow runs while working (`pnpm test --project core`), then run the full check before delivering:

```sh
pnpm verify
```

Run `pnpm test:e2e` too when the change affects anything a browser sees. Report any skipped step.

## Pull requests

Every change reaches `main` through a pull request, with one subject per pull request. A pull request that resolves an issue says `Fixes #123`. The template's checklist includes the security questions every change answers.

Pushing a branch and opening a pull request are outward-facing. An agent asks first.

## Releasing

A release is a version tag, which publishes the Docker image ([CI](docs/ci.md#releases-githubworkflowsreleaseyml)). An image tag cannot be taken back from everyone who pulled it, so releasing is a maintainer action, separate from merging.

1. In an ordinary pull request, set `version` in the root `package.json`, and record what operators need to know.
2. Once it is merged, tag the merge commit and push the tag:

```sh
git tag v0.0.1
git push origin v0.0.1
```

The release workflow refuses a tag that does not match `package.json`. Pushing a release tag is outward-facing; an agent never pushes one on its own initiative.

## Hooks

| Hook         | Checks                                                       |
| ------------ | ------------------------------------------------------------ |
| `pre-commit` | Formats and lints the staged files, re-staging what it fixed |
| `commit-msg` | The subject line shape described above                       |
| `pre-push`   | Refuses a direct push to `main`, and a misnamed branch       |

`--no-verify` bypasses them. It is for the commit that genuinely has to land unfixed, and an agent that uses it says so.
