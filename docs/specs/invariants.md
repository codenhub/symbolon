---
status: APPROVED
last_updated: 2026-10-20
scope: The security and design commitments every change to Symbolon keeps.
---

# Invariants

These hold in every release. Breaking one takes a strong, explained reason, recorded in this document in the same change, under [Recording decisions](../guidelines/documentation.md#recording-decisions). They are numbered so that code, tests and reviews can cite them: `invariant 5`, or `I5` in a test title.

0.1 is done only when every invariant holds and has a test. The "Enforced by" line under each one names what checks it today; "not yet" means the feature it governs does not exist yet, and the change that adds the feature adds the test.

## 1. The default is secure

A freshly deployed instance can't be claimed without the setup token, has no default credentials, uses closed or invite-only registration, and refuses to run on plain HTTP outside an explicit local-development mode.

Enforced by: `loadConfig` refuses an `http://` issuer unless `SYMBOLON_DEV_MODE=true` (`packages/core/src/config.test.ts`). The setup token, credentials and registration mode: not yet.

## 2. No secret is ever stored in plaintext

No secret is stored in plaintext, and none appears in logs, errors, audit entries, or API responses. This covers passwords, client secrets, tokens, codes, TOTP secrets, recovery codes, private keys, the setup token, and reset links. Tokens and secrets are stored hashed. Data that has to be recoverable, like TOTP secrets and signing keys, is encrypted with the master secret. Client secrets are shown exactly once.

Enforced by: configuration errors name variables, never values (`packages/core/src/config.test.ts`); an unexpected error becomes a 500 response with no detail (`packages/server/src/create-handler.test.ts`, `apps/node/tests/integration/serve.test.ts`). Storage of secrets: not yet.

## 3. No user enumeration

Login, registration, and password reset respond the same whether or not an account exists, in both content and timing as far as practical.

Enforced by: not yet.

## 4. Every input is untrusted

Validate all request input (forms, query strings, JSON, headers) with `@codenhub/validation` at the boundary. Every input has a bounded size.

Enforced by: the environment is validated by `loadConfig`. Request input: not yet; there is no route that reads any.

## 5. Web hygiene on every HTML response

- a strict Content Security Policy (no inline scripts without nonces)
- `frame-ancestors 'none'`, which also covers clickjacking on login and consent
- `Referrer-Policy`, `X-Content-Type-Options`, and HSTS when on HTTPS
- CSRF protection on every state change
- `Cache-Control: no-store` on authenticated pages

Enforced by: `withSecurityHeaders` puts the CSP, `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options` and, over HTTPS, HSTS on every response, not only HTML ones (`packages/server/src/create-handler.test.ts`, in workerd by `apps/workers/tests/integration/worker.test.ts`, and in three browsers by `tests/e2e/specs/health.spec.ts`). CSRF and authenticated pages: not yet.

## 6. Every authorization check is server-side

The dashboard hides what a user can't do, but the API enforces it. Every admin API route declares the permission it needs, and a test proves that every route has one.

Enforced by: not yet.

## 7. Audit everything security-relevant

Writing the audit entry is part of the action, not a best-effort side effect.

Enforced by: not yet.

## 8. Atomicity where the protocol needs it

Every store adapter passes `@codenhub/oidc`'s `storeConformanceCases` and Symbolon's own store conformance suite, on every supported database, in CI.

Enforced by: Symbolon's suite (`@symbolon/store/testing`) runs against the memory store, SQLite, D1 in workerd, and PostgreSQL in CI. The OIDC half: not yet, until the adapters implement `OidcStore`.

## 9. One core, many runtimes

No runtime-specific API (`node:*`, Workers bindings) in `packages/core` or the shared store interfaces. Runtime differences live only in adapters.

Enforced by: the source of every runtime-agnostic package (`core`, `server`, `store`, `store-d1`) and of `apps/workers` is type-checked against `tsconfig.runtime-agnostic.json`, which loads no Node.js or Workers types, so `import "node:fs"` there fails `pnpm typecheck`. [The architecture](../architecture.md#runtime-boundary) lists which packages are on which side.

## 10. Data belongs to the user

Users can see what each app can access, revoke it, export their account, and delete their account. Deletion is complete.

Enforced by: not yet.

## 11. Free forever

No feature flags tied to licensing, no telemetry by default, and no calls to external services the operator didn't configure. That includes the breached-password check, which is opt-in if it exists at all.

Enforced by: review. The development toolchain is held to the same rule where it can be: CI turns off wrangler's telemetry.
