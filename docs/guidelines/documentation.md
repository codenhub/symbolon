---
status: APPROVED
last_updated: 2026-10-20
scope: How documentation under docs/ is structured, maintained and interpreted, including this document.
---

# Documentation guidelines

This follows codenhub's documentation guidelines, so a document reads and is judged the same way in both repositories.

## Required header

Every document in `docs/` starts with YAML frontmatter holding, in this order:

- `status`: how authoritative the document is.
- `last_updated`: the date of the last meaningful content change, `YYYY-MM-DD`.
- `scope`: what the document governs, when the title alone does not say.

| Status        | Meaning                                                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DRAFT`       | Work in progress. Context, not a binding source of truth.                                                                                                                    |
| `APPROVED`    | The agreed source of truth. Future work follows it; existing code that does not is legacy until updated.                                                                     |
| `IMPLEMENTED` | The agreed source of truth, and the code is expected to comply. A new exception is documented, or the document changes.                                                      |
| `SUPERSEDED`  | Temporary, while a replacement lands across more than one change. Names its replacement in its first paragraph, and is deleted in the change that completes the replacement. |

## Formatting

Markdown is not hard-wrapped: each paragraph and list item is one line, so a one-word edit does not reflow a paragraph in the diff. `pnpm format:check` enforces it through Prettier's `proseWrap: never`.

## Source of truth

Documentation changes in the same change as the architecture, conventions or decisions it records.

APPROVED and IMPLEMENTED documents record decisions. Judge work against them on two separate questions:

- **Conformance:** does the work match the recorded decision? If not, the work is brought in line, or the departure is recorded as an exception.
- **Merit:** is the decision right? If not, the decision and its document change, with the code that follows them.

While a decision stands, conformance follows this priority: APPROVED or IMPLEMENTED documentation, then DRAFT documentation, then existing code. Two binding documents that conflict are reconciled in the same change, or both move to DRAFT with a note on the conflict.

Each rule has one owning document; others link to it rather than repeat it. Prefer updating a document to creating an overlapping one, and delete a document in the change that makes it stale.

## Recording decisions

A document that settles a choice says why. Where real alternatives existed, it names the ones it rejected and, briefly, why each lost.

A change that reverses a recorded decision names what the decision did not weigh: a concrete case it gets wrong, a measurement, or a constraint that changed. Preferring another option is not enough. The reversing change records the old choice among the rejected alternatives, with the evidence that reversed it.

## Exceptions

An exception to a binding document states what rule it bypasses, where, why that is acceptable, and whether it is temporary. It sits next to the rule it bypasses. Repeated exceptions mean the rule is wrong: change the rule.

## Layout

- `docs/specs/`: contracts a deliverable must satisfy, written so compliance can be checked: the invariants, the tests.
- `docs/guidelines/`: how to work, applied by judgment: code, security, documentation.
- `docs/guides/`: documentation for the people who run Symbolon and the developers who integrate apps with it. These are product documentation, read outside the repository.
- `docs/` itself: the index, the scope, the architecture, and references for one repository area or process: tooling, CI, roadmap.

File a new document by its main job, and add a folder only when a group of documents fits none of these. Plans and other short-lived notes go in `docs/plans/`, which is git-ignored.

## Agent instructions

`AGENTS.md` files hold how to work (the root one) and the known traps of a directory (scoped ones), not rules or decisions, which belong here. The root `AGENTS.md` describes the trap format.
