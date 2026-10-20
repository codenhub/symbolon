---
status: IMPLEMENTED
last_updated: 2026-10-20
scope: Index of the repository documentation.
---

# Documentation

[Contributing](../CONTRIBUTING.md) holds the contributor workflow and [agent instructions](../AGENTS.md) how agents work here.

## Product

| Document                          | Contains                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------- |
| [Scope](scope.md)                 | What Symbolon is, what 0.1 contains, what comes after, and the open questions.  |
| [Invariants](specs/invariants.md) | The security and design commitments every change keeps, and what enforces each. |
| [Roadmap](roadmap.md)             | The order of work toward 0.0.1 and 0.1.                                         |
| [The name](name.md)               | What "symbolon" means, and why it fits an identity provider.                    |

## Repository

| Document                        | Contains                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| [Architecture](architecture.md) | Layout, dependency direction, the runtime boundary, and the decisions behind them. |
| [Tooling](tooling.md)           | Root scripts, narrowing a run, local development, and adding a package.            |
| [CI](ci.md)                     | The pinned toolchain, CI jobs, releases, and dependency updates.                   |

## Guidelines and specifications

| Document                                     | Contains                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| [Code](guidelines/code.md)                   | Coding conventions, the upstream-first rule, and documentation in code. |
| [Security](guidelines/security.md)           | How the invariants turn into code.                                      |
| [Documentation](guidelines/documentation.md) | Document status, ownership, decisions, and layout.                      |
| [Tests](specs/tests.md)                      | Test categories, conformance suites, the security suite, and coverage.  |

## Guides

| Document                             | Contains                                                |
| ------------------------------------ | ------------------------------------------------------- |
| [Operator guide](guides/operator.md) | Configuration, Docker, Cloudflare Workers, and backups. |
