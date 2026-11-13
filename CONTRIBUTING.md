# Contributing

This document defines the contributor workflow, from a working tree through validation, review, and release. It applies to maintainers, contributors, and AI agents, and follows codenhub's workflow, so moving between the two repositories feels the same.

[The documentation index](docs/README.md) maps the scope, invariants, architecture, and guidelines. [Tooling](docs/tooling.md) describes the commands below. [Agent instructions](AGENTS.md) contain agent-specific behavior and context guidance.

## Setup

Setup installs the project's pinned toolchain and dependencies:

```sh
nvm install
pnpm install
```

nvm for Windows does not read `.nvmrc`, and `nvm install` without a version fails there. In PowerShell, run `nvm install (Get-Content .nvmrc)` and `nvm use (Get-Content .nvmrc)` in place of `nvm install`.

Setup also points git at `.githooks/` through `core.hooksPath`, so the hooks described below start working after it and not before. [Tooling](docs/tooling.md#setup) says where each version is pinned, what happens outside it, and how to point git at the hooks by hand. [Local development](docs/tooling.md#local-development) shows how to start the server for development.

## Changes

- Keep each change within its requested scope and preserve unrelated work.
- [The invariants](docs/specs/invariants.md) hold in every change. A change that touches one adds or updates its test.
- Applicable guidelines, specifications, and APPROVED or IMPLEMENTED documentation govern the change. Existing code may lag those contracts; conflicts and exceptions are resolved under the [documentation guidelines](docs/guidelines/documentation.md).
- Update affected documentation in the same change as behavior, public API, exports, configuration, conventions, or decisions. Each contract has one owning document; references point to that owner rather than repeat its requirements.
- Do not commit secrets, `.env` files, databases, build artifacts, or unrelated changes.

## Issues

Defects and requests are tracked as GitHub issues, opened through the bug and feature forms. A vulnerability is the exception: report it privately, as [`SECURITY.md`](SECURITY.md) describes.

Each issue carries one label from each group that applies:

| Group     | Labels                                        | Says                                                        |
| --------- | --------------------------------------------- | ----------------------------------------------------------- |
| `type:`   | `bug`, `feature`, `security`, `docs`, `chore` | What kind of work it is                                     |
| `pkg:`    | `core`, `server`, `store`                     | Which package it is in; `store` also covers the adapters    |
| `app:`    | one per application member, by commit scope   | Which app it is in                                          |
| `status:` | `needs-triage`, `blocked`                     | Why it is not moving, when it is not                        |
| —         | `upstream`                                    | The issue waits on a change in an `@codenhub` package first |

`.github/labels.sh` holds the list, one `label` line per label. Add a line in the change that adds a member. After editing the list, create or update the labels on GitHub through `gh` by running it:

```sh
sh .github/labels.sh
```

From PowerShell or `cmd`, which have no `sh`, run it through the one Git for Windows ships:

```sh
git -c "alias.labels=!sh .github/labels.sh" labels
```

It never deletes a label: deleting one strips it from every issue that carries it, so a label that is no longer listed is removed by hand. Renaming a label on GitHub, rather than creating it again, keeps it on the issues that carry it.

### A defect found mid-task

A defect hit while working on something else is filed and worked around, not fixed on the spot. Fixing it in place mixes two subjects in one branch, for the reason the [commit](#atomic-commits) and [pull request](#pull-requests) rules already reject, and where the fix ships as a release, it forces a release in the middle of unrelated work.

File it with what triage needs, from the terminal:

```sh
gh issue create --title "<area>: <what is wrong>" --label "type:bug,status:needs-triage" --body "<what happened, what was expected, and the workaround>"
```

Then mark the workaround where it lives, naming the issue in full as `<owner>/<repo>#<number>`, so the reference reads the same wherever it is read:

```ts
// Workaround for <owner>/<repo>#123: <what it works around>.
```

Once the fix lands, searching for `<owner>/<repo>#123` finds every workaround to remove. A defect with no workaround blocks the task; say so, and the fix goes first, in its own pull request.

A defect or gap in a codenhub package is fixed upstream, not around. Symbolon is the first real consumer of `@codenhub/oidc`, so its gaps will surface here. File the issue in codenhub, label the local issue that waits on it `upstream`, and mark the workaround with the upstream issue:

```sh
gh issue create --repo codenhub/codenhub --title "oidc: <what is wrong>" --label "type:bug,pkg:oidc,found-in:external" --body "<what happened, what was expected, and the workaround>"
```

```ts
// Workaround for codenhub/codenhub#123: <what it works around>.
```

Once codenhub releases the fix, raise the catalog entry in `pnpm-workspace.yaml` and remove every workaround that names the issue.

Opening an issue is outward-facing. An agent drafts it and asks before filing, as it does before pushing.

## Branches

Work happens on a branch. Do not commit to `main`.

`main` is the branch CI verifies in full and releases are tagged from, so a commit that lands there directly is one nobody reviewed. A pre-push hook refuses to push to it.

The exception is real but narrow: it takes an explicit request from a maintainer, in the moment, for that specific commit. An agent must ask and be told yes. Neither a general instruction to "just fix it" nor a previous approval carries over to the next commit.

Name the branch `<type>/<slug>`, where `<type>` is the [commit type](#type) of the work and `<slug>` is kebab-case. A version in the slug keeps its dots, as in `fix/validation-0.2-audit`.

```
feat/server-discovery
fix/sqlite-busy-timeout
docs/operator-backups
chore/update-dependencies
```

Every pushed branch follows the pattern, whoever or whatever created it. A tool that names its own branches, such as `claude/agent-branch-naming-03bee5` or `codex/fix-build-order`, does not make an exception: rename the branch with `git branch -m <type>/<slug>` before its first push. The `pre-push` hook refuses any other name.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>)!: <subject>

<body>

<trailers>
```

A `commit-msg` hook checks the shape of the subject line. It cannot check whether the message is honest, which is the part that matters.

### Type

One of `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

### Scope

The area the change lands in, and optional. In a workspace, each member the project declares is an area: its scope is the member's name without a namespace such as an npm scope, and for a member nested a level deeper than its kind, such as `packages/plugins/vite`, the path below that level, as in `plugins/vite`. Repository-level areas use their own name, such as `ci`, `deps`, or `docs`. Leave it out when the change spans several.

Symbolon's members are `core`, `server`, `store`, `store-sqlite`, `store-postgres`, `store-d1`, `node`, `workers`, `dashboard`, and `e2e`.

### Subject

Imperative mood, lowercase, no trailing period: "add", not "added" or "Adds". Aim for 50 characters and stay at 72 or fewer, which the hook enforces.

Describe what the change does for someone reading the log later, not which files moved. `fix(server): build request urls on the issuer, not the host header` says what broke and what now happens; `fix(server): update serve.ts` says nothing a diff would not.

Append `!` right before the colon, after the scope when there is one (`feat(server)!:`) or directly after the type (`feat!:`), for a change that breaks a contract someone relies on, such as a public API, a configuration variable, or a persisted format, and say in the body what breaks and what to do about it. For Symbolon that is a change an operator must act on when upgrading, such as a renamed variable or an incompatible migration.

### Body

Optional. Write one when the reason for the change is not obvious from the subject, and use it for why over what — the diff already carries the what.

### Atomic commits

One commit does one thing. A reviewer should be able to read the subject and know what is in the commit before opening it.

Split by intent, not by file count. Moving a function and changing its behavior are two commits even when they touch one file; renaming a symbol across twenty files is one commit. If a subject needs "and" to be accurate, that is usually two commits.

Formatting churn, unrelated fixes, and drive-by refactors are their own commits or their own pull request. Never bundle them into a behavior change: they make the real change unreviewable.

### Co-authorship

A commit an AI agent wrote or substantially shaped MUST carry a `Co-authored-by` trailer naming the **model**, not the tool or harness it ran in:

```
Co-authored-by: Claude Opus 5.5 <noreply@anthropic.com>
```

`Claude Opus 5.5`, not `Claude Code`; the model is what produced the change, and it is what someone auditing the history needs to know. A harness name records which client a person happened to open, which explains nothing about the commit. Use the model vendor's no-reply address when it publishes one.

The human directing the work stays the commit author. The trailer is an addition to authorship, never a replacement for it.

## Validation

Run scripts from the repository root. During development, narrow checks to what changed; [tooling](docs/tooling.md) lists the commands and how to narrow them. Before delivering a change, run the gate this section names; unless it names more, that is the whole gate:

```sh
pnpm verify
```

It runs the same checks CI runs, except those CI adds: the PostgreSQL tests, the browser suites, the Docker image, and a check that the run left the working tree clean ([CI](docs/ci.md#pull-requests-and-main-githubworkflowsciyml)). Run `pnpm test:e2e` too when the change affects anything a browser sees. Report any step that was skipped or failed.

## Pull requests

Every change reaches `main` through a pull request, and CI verifies it.

Pushing a branch and opening a pull request are outward-facing actions. An agent asks first and does neither on its own initiative.

Keep a pull request to one subject. A branch that fixes a bug and also restructures a doc is two pull requests, for the same reason a commit that does both is two commits.

A pull request that resolves an issue says `Fixes #123` in its description, so merging it closes the issue. Merging is not releasing: a fix reaches operators with the next release. The pull request template's checklist includes the security questions every change answers.

A pull request that builds on another unmerged one targets that one's branch and names it in its description. Merge them in order, the base first. GitHub then deletes the merged branch, with the setting [CI](docs/ci.md#branch-protection) recommends, and retargets the next pull request to `main`; merged out of order or before that retarget, it lands in the other branch instead of `main`.

## Releasing

Releasing is a maintainer action, and it is separate from merging. Merging changes `main`; a release puts a version where people install or reach it, and a published version can be superseded but rarely taken back. A release here is a version tag, which publishes the Docker image ([CI](docs/ci.md#releases-githubworkflowsreleaseyml)); an image tag cannot be taken back from everyone who pulled it.

Bump the version and record what operators need to know in an ordinary pull request first; the release itself names a commit already on `main`.

1. In that pull request, set `version` in the root `package.json`.
2. Once it is merged, tag the merge commit and push the tag:

```sh
git tag v0.0.1
git push origin v0.0.1
```

The release workflow refuses a tag that does not match `package.json`. Pushing a release tag and deploying are outward-facing actions. An agent asks first and never does either on its own initiative.

## Hooks

Three hooks run locally, all from `.githooks/`:

| Hook         | Checks                                                       |
| ------------ | ------------------------------------------------------------ |
| `pre-commit` | Formats and lints the staged files, re-staging what it fixed |
| `commit-msg` | The subject line shape described above                       |
| `pre-push`   | Refuses a direct push to `main`, and a misnamed branch       |

`--no-verify` bypasses them: on `git commit` for the first two, on `git push` for the last. It is for the commit that genuinely has to land unfixed, and an agent that reaches for it MUST say so in the same breath rather than quietly routing around a failing check. The whole point of a hook is that skipping one is visible.

### Why each hook does that much and no more

`pre-commit` runs only the formatters and linters, the checks `.githooks/profile.sh` declares for the stack. Type checking and tests take minutes, and a hook that slow gets bypassed until it may as well not exist; `pnpm verify` is where the rest belongs. [Workspace](docs/workspace.md#git-hooks) says which tools the profile runs and how the hooks are set up.

`pre-commit` reads files from the working tree rather than from the index. For a file that is only partly staged that matters: the hook never rewrites it, because re-staging would sweep in the parts deliberately left out of the commit, and it checks the file as it sits on disk. A commit whose staged content is already clean can therefore still fail. The reverse also holds: when the file was formatted on disk after its changes were staged, the hook passes while the staged content is still unformatted, and `pnpm verify` in CI then fails it. After formatting a partly staged file, stage the formatted parts again and review the staged content with `git diff --cached`. The alternative, skipping such files, would let unformatted code through in every case rather than this one.

`commit-msg` checks the subject line and nothing else. A body is optional, and no hook can tell whether a message describes the commit honestly, so the mechanical half is automated and the rest stays with review. Merges, reverts, and `fixup!`, `squash!`, and `amend!` markers pass unchecked: git composes those subjects, and rejecting a message nobody wrote would only train people to reach for `--no-verify` out of habit, which costs the checks that do matter. The 72-character limit is where practice already sat rather than a number from a style guide: replayed over 200 earlier commits of codenhub/codenhub, the monorepo whose workflow this follows, it rejected six, three merely long and three joining two changes with "and", which is the split the convention asks for anyway.

`pre-push` reads the destination ref rather than the branch you are standing on, so its refusal to push to `main` holds for a push from `main`, for an explicit refspec that targets it from elsewhere, and for a `--delete`. It also refuses a branch whose name is not `<type>/<slug>`. That check sits in a hook rather than in wording alone because the name is often not a choice anyone made: an agent harness creates `claude/...` or `codex/...` before the agent has read a file, and a rule about naming a branch does not read as applying to a branch that already has a name. Deleting a remote branch passes whatever it is called, since removing a misnamed branch is the cleanup, and tags are not checked.
