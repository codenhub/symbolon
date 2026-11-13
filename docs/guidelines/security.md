---
status: APPROVED
last_updated: 2026-11-12
scope: How the invariants turn into code, for anyone writing or reviewing a change.
---

# Security guidelines

[The invariants](../specs/invariants.md) say what must hold. This document says how code keeps them, so the same problem is solved the same way everywhere. Where it and an invariant disagree, the invariant wins and this document is fixed. Vulnerabilities are reported as [SECURITY.md](../../SECURITY.md) describes, never in a public issue.

## Secrets

- **Random values** come from `crypto.getRandomValues` or `crypto.randomUUID`, through the core's randomness port once there is one. Never `Math.random`.
- **High-entropy tokens** (session ids, codes, reset tokens, client secrets, the setup token) are stored as a SHA-256 digest, never the value. A leaked database then holds nothing a client can present. `@codenhub/oidc` already does this for its codes and tokens.
- **Passwords** go through a memory-hard KDF where the runtime allows, with the algorithm and parameters stored next to each hash so they can be upgraded on login. [The scope](../scope.md#6-open-questions) has the open question on Argon2id and PBKDF2.
- **Recoverable secrets** (TOTP secrets, private signing keys) are encrypted with a key derived from `SYMBOLON_SECRET`, with an authenticated cipher (AES-GCM through Web Crypto), and a key id stored with each ciphertext so the master secret can be rotated later.
- **Comparisons** of a secret or digest against input are constant-time.
- **Showing a secret** happens once, in the response to the action that created it, and that response is `Cache-Control: no-store`.
- **Secrets in the repository** do not exist. Configuration reads them from the environment or a secret store; examples use obvious placeholders.

## Never in logs, errors, audit entries or responses

- Error messages name the field, never its value. `@codenhub/validation` issues already never hold input values; keep it that way when wrapping them, as `ConfigError` does.
- An unexpected error becomes a generic response. Its detail goes only to the logging port, which redacts known secret-bearing fields.
- Request URLs can carry codes and tokens in their query strings: log the path, not the query.
- Page content, form values, and anything a user typed stay out of logs.
- A test proves it: the security suite feeds known secrets through each flow and asserts they never appear in what was logged, returned or audited.

## Input

- Every request input (body, query, headers, cookies) is validated with `@codenhub/validation` at the boundary, in `server`, before any other code sees it, and parsed into a typed value. What does not parse is rejected, not passed along.
- Every input has a size bound: the body is read with a byte limit before parsing, and every string and collection in a schema has a `max`. The read itself enforces the limit: it stops as soon as the body is seen to exceed the limit and the request is rejected, so a body of exactly the limit is accepted and one over it is never truncated and parsed as if it were whole. A `Content-Length` check before the read can reject early, but it is not the bound.
- URLs are built on the configured issuer, never on the `Host` header or `X-Forwarded-*` headers, which the client controls.
- Redirect targets are only ever registered redirect URIs, compared exactly.
- Do not build a query, command, or HTML by concatenating input. Use parameters, argument arrays, and escaping by default.

## Responses

- Every response goes through `withSecurityHeaders` in `server`. A route never builds headers that loosen it.
- Pages are server-rendered with escaping by default and no inline script. A script that must be inline carries a per-response nonce in the CSP.
- Authenticated pages and every response holding a secret are `Cache-Control: no-store`.
- Login, registration and password reset take the same path, and as far as practical the same time, whether or not the account exists ([invariant 3](../specs/invariants.md#3-no-user-enumeration)): hash a dummy password when the account is missing.

## Sessions and state changes

- Session cookies are `__Host-` prefixed, `HttpOnly`, `Secure` and `SameSite=Lax` or stricter.
- Every state-changing request is a non-GET method and checks a CSRF token bound to the session.
- Sensitive actions (changing the password or MFA, deleting the account, admin actions on other users) require a recent authentication.

## Authorization and audit

- Every authorization check runs on the server, declared where the route is defined, before the handler runs.
- Every admin route declares the permission it needs, in the route table, and the check runs in the server before the handler. A test walks the route table and fails on a route without one ([invariant 6](../specs/invariants.md#6-every-authorization-check-is-server-side)).
- The audit entry is written in the same transaction as the action it records. If it cannot be written, the action fails ([invariant 7](../specs/invariants.md#7-audit-everything-security-relevant)).

## Outbound calls and dependencies

Symbolon calls only the services the operator configured: their mail transport, their database. No telemetry, no update checks, no breached-password lookups unless the operator turned them on ([invariant 11](../specs/invariants.md#11-free-forever)).

Every dependency is a trust decision. The rule in [Coding guidelines](code.md#architecture-and-design) on adding dependencies applies with extra force to anything that runs at install time or handles secrets.

## Reviewing a change

A change that touches any of the above names the invariants it affects in its pull request, and adds or updates their tests. The [pull request template](../../.github/pull_request_template.md) carries the checklist. Ask:

- Does it add a way for untrusted input to reach the code? Is that input validated and bounded at the boundary?
- Does a secret, token, user's data, or full URL now reach a log, error, audit entry or response, other than the one that shows a new secret to its creator?
- Does it store a secret, and is it stored as a digest or encrypted as above?
- Does it add a permission, route, endpoint, or outbound call? Is that named in the pull request and tested?
