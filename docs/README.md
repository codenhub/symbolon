---
status: IMPLEMENTED
last_updated: 2026-11-12
scope: Index of the project documentation.
---

# Documentation

`docs/` holds durable project knowledge. [Contributing](../CONTRIBUTING.md) contains the contributor workflow, and [agent instructions](../AGENTS.md) contain how agents work here. The [documentation guidelines](guidelines/documentation.md) define how these documents are written, what their status means, and how they change.

Every other document in `docs/` is listed here. Adding, moving, or deleting one updates this index in the same change.

## Overview

| Document                        | Contains                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| [Scope](scope.md)               | What Symbolon is, what 0.1 contains, what comes after, and the open questions.     |
| [Architecture](architecture.md) | Layout, dependency direction, the runtime boundary, and the decisions behind them. |
| [Roadmap](roadmap.md)           | The order of work toward 0.0.1 and 0.1.                                            |
| [The name](name.md)             | What "symbolon" means, and why it fits an identity provider.                       |

## Guidelines

| Document                                     | Contains                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Code](guidelines/code.md)                   | Naming, design, errors, inputs and state, testing practices, the upstream-first rule, and documentation in code. |
| [Documentation](guidelines/documentation.md) | Metadata, status and authority, recording decisions, exceptions, document roles, and layout.                     |
| [Stack](guidelines/stack.md)                 | The conventions of TypeScript, JavaScript, and Node.js, and the tools that check them.                           |
| [Security](guidelines/security.md)           | How the invariants turn into code: secrets, untrusted input, what stays out of logs, and reviewing a change.     |

## Repository references

| Document                  | Contains                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Workspace](workspace.md) | The root scripts and what each guarantees, the shared tool configurations, the pinned toolchain, installs, and dependency versions. |
| [Tooling](tooling.md)     | Setup, how the scripts are implemented, the compiler and test runner configuration, narrowing a run, and adding a package.          |
| [CI](ci.md)               | The verification jobs, the setup action, action pinning, releases, dependency updates, and branch protection.                       |

## Specifications

| Document                            | Contains                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| [Invariants](specs/invariants.md)   | The security and design commitments every change keeps, and what enforces each. |
| [Tests](specs/tests.md)             | Test categories, conformance suites, the security suite, and coverage.          |
| [Stack tests](specs/stack-tests.md) | The runners, file names, configuration, scripts, and commands of the stack.     |

## Guides

| Document                             | Contains                                                |
| ------------------------------------ | ------------------------------------------------------- |
| [Operator guide](guides/operator.md) | Configuration, Docker, Cloudflare Workers, and backups. |
