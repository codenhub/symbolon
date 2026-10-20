---
status: DRAFT
last_updated: 2026-10-20
scope: The order in which Symbolon is built, toward 0.0.1 and 0.1.
---

# Roadmap

[The scope](scope.md) says what 0.1 contains and when each milestone is done. This document says the order, and what is already in place.

## In place

- The workspace, toolchain, hooks, CI and release workflow.
- Configuration from the environment, with the plain-HTTP refusal of invariant 1.
- The store port, migrations, and the SQLite, PostgreSQL and D1 adapters, each passing the store conformance suite in CI.
- One Fetch handler served by both runtimes, with the security headers of invariant 5 and a health check.
- The Docker image, smoke-tested in CI, and the Workers template, tested in workerd.

## Toward 0.0.1

0.0.1 is done when a fresh container is set up with the setup token, an admin registers an app, and a user signs in to it and out through OIDC, end to end in a browser, on both runtimes.

1. **Logout in `@codenhub/oidc`.** RP-initiated logout, upstream in codenhub. It is the first known gap, and 0.0.1's sign-out needs it.
2. **`OidcStore` in every adapter,** passing `@codenhub/oidc/testing`'s conformance cases on each database.
3. **Signing keys and the master secret:** key generation on first run, encryption at rest, JWKS.
4. **The setup token and the first admin.**
5. **Users, sessions and the login page,** server-rendered, with CSRF protection.
6. **Apps and client secrets,** through a minimal admin API.
7. **The OIDC endpoints** through `@codenhub/oidc/provider`, with consent.
8. **The end-to-end journey** in `tests/e2e`, against the Node.js build and the Worker.

## Toward 0.1

Everything else in [section 3 of the scope](scope.md#3-scope-for-01), in roughly this order: MFA and recovery codes, roles and permissions, the audit log, the dashboard, email flows, brute-force protection, account export and deletion, key rotation, branding and i18n, the security suite in full, the OpenID conformance plans, and the operator and integration guides.

## Decisions waiting on code

These open questions from the scope are decided when the code that needs them is written, and recorded in [the architecture](architecture.md):

- An HTTP framework or the internal router: when `server` has enough routes to compare.
- The dashboard as an SPA or server-rendered, and how it is served: with the admin API.
- Password hashing on Workers: measured on a real Workers plan before the login page.
- Rate limiting per runtime, and whether 0.1 supports several Node.js instances: with brute-force protection.
- An opt-out for automatic migrations, and the command that runs them by hand: before the first release that has a second migration.
