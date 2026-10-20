# Agent instructions

Symbolon is an identity provider: a mistake here can expose every app that trusts an instance. Read [the invariants](docs/specs/invariants.md) before changing behavior, and [the security guidelines](docs/guidelines/security.md) before touching secrets, input, responses, sessions or authorization.

## Working agreement

- Use the task's scope and your judgment to choose which documentation and code to inspect. Applicable contributor rules, guidelines and specifications remain binding; reading less does not waive them.
- Ask when different interpretations would lead to different work. Do not settle an unstated choice about behavior, a security property, or a recorded decision by assuming it. Do everything independent of the answer first, then ask at the point the answer is needed.
- Keep changes small and within the requested scope. Preserve unrelated work.
- Report failing checks, skipped steps and unfinished work plainly. Never describe a partial result as complete.
- Close by listing material judgment calls and assumptions so they can be confirmed or reversed.

## Judgment

- Documentation records decisions; it does not prove them right. Follow a decision while it stands, and judge it too. `docs/guidelines/documentation.md` owns the distinction between conformance and merit, and the rules for reversing a decision.
- Do not reverse a recorded decision, or recommend reversing it, without naming what it did not weigh.
- Ground each finding in a realistic case: the request or calling code, what goes wrong, and for whom. A concern you cannot ground is a question; state it as one.
- A change that weakens an invariant, adds a configuration variable, changes a default, or adds a dependency is a decision, not a fix. Present the problem, the options, your recommendation and why, and wait for approval.

## Symbolon specifics

- **Upstream first.** When `@codenhub/oidc`, `@codenhub/jwt` or another codenhub package lacks something or gets it wrong, the fix belongs in codenhub. File the issue (ask first; it is outward-facing), work around it here with a `// Workaround for codenhub/codenhub#<n>: ...` comment, and say so.
- **Runtime boundary.** `core`, `server`, `store`, `store-d1` and `apps/workers` must run on every runtime; `pnpm typecheck` fails if their source reaches for `node:*`. Runtime code goes in an app or a Node.js adapter. `docs/architecture.md` explains the split.
- **Invariants have tests.** A change that makes an invariant hold, or touches how it holds, adds or updates the test and the invariant's "Enforced by" line.
- **No secrets in output.** Never put a secret, token, code or password in a log, an error, a test snapshot, a commit or a message to the user, including test values you generate.

## Knowledge

- Do not keep agent memory files. Knowledge worth keeping belongs in the repository: a recorded decision in documentation, a test, or a trap in a scoped `AGENTS.md`.
- Any directory may have its own `AGENTS.md`. Before working in a directory, read each `AGENTS.md` on the path from the root to it. This file says how to work; a scoped file records the known traps of its scope.
- A trap is information, not a rule: what happens, when trying what, and what to prefer instead. State the conditions it held under (tool or runtime version) and its evidence. Add it in the change that discovers it; remove it in the change that removes its cause.

## Context discipline

- Start with filenames, headings and focused searches; read the sections the change needs. Do not dump several files or a directory in one command.
- Reuse what you already inspected in the session; re-read only what changed or what a specific doubt requires.
- Narrow commands during development (`pnpm test --project <name>`) and run `pnpm verify` on the completed change.
- Read test, build and CI output as a summary first: filter to failures or the tail.

## Collaboration

- State material findings and uncertainties as work progresses.
- Resolve conflicts between instructions and documentation explicitly rather than silently choosing a reading.
- Pushing, opening a pull request or an issue, and pushing a release tag are outward-facing. Ask first.
