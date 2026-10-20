---
status: DRAFT
last_updated: 2026-10-20
scope: The product scope of Symbolon 0.1 and what comes after it.
---

# Symbolon: application scope

> **How to read this document.** This is a starting point from a brainstorming session, not a final spec. Section 5 points to the **invariants**: security and design commitments that should hold unless there's a strong, explained reason to break them. Everything else is a **proposal**, including the repo layout, the stack, the feature cuts and the open questions. If you find a better structure, better behavior, or a better-established practice, propose it and explain why. The goal is the best possible product, not faithfulness to this document.

---

## 1. What Symbolon is

Symbolon is a **self-hosted, 100% free and open-source identity provider**. You deploy it and get:

- **An admin dashboard** to manage administrators, users, roles, and registered apps.
- **One account per person.** External apps add a "Sign in with <instance>" button and send users to Symbolon to authenticate, using OpenID Connect.
- **Later: a user-owned data store.** This is the differentiator. Apps attach data to the user's _account_, not to themselves. The user owns the data, and each app gets scoped read and/or write access to it. It is **out of scope for 0.1**, but 0.1 must not make it hard to add (see section 4).

There will never be a paid tier, a hosted SaaS, or an "enterprise edition". Every feature is in the open-source build.

### Building blocks

- **`@codenhub/jwt`** (0.0.1): JWS/JWK on Web Crypto.
- **`@codenhub/oidc`** (0.0.1): OIDC client and provider. Symbolon is its first real consumer, so **expect to change `oidc`'s API**. When Symbolon needs something `oidc` lacks or gets wrong, fix it upstream in `codenhub` rather than working around it in Symbolon.
- **Other `@codenhub/*` packages** where they fit: `validation`, `error`, `i18n`, and the UI packages (`components`, `router`, `styles`, `ui-kit`, `toaster`, `theme`). Symbolon should be a good showcase for them.

---

## 2. Repository and runtime

### A separate repo, as a workspace

Symbolon lives in its own repo (`symbolon`), not inside `codenhub`. It has its own release cadence, Docker images, deploy templates, and product issues. Follow `codenhub`'s tooling conventions where it makes sense (pnpm workspace, oxlint/oxfmt, the docs style, an `AGENTS.md`), so moving between the two repos feels familiar.

A proposed layout (change it freely). [The architecture](architecture.md) records the layout the repository adopted and why it differs from this one:

```
symbolon/
  apps/
    server/        # the identity provider: OIDC endpoints, login/consent pages, admin API
    dashboard/     # admin + account SPA (or folded into server; see open questions)
  packages/
    core/          # domain logic: users, roles, apps, sessions, policy, audit; runtime-agnostic
    store/         # storage interfaces + migrations + conformance tests
    store-sqlite/  # node:sqlite (Docker default)
    store-postgres/
    store-d1/      # Cloudflare D1
    runtime-node/  # Node entrypoint, HTTP adapter, mail/SMTP, rate-limit backing
    runtime-workers/ # Workers entrypoint, bindings, Durable Objects if needed
  docker/          # Dockerfile, compose examples
  deploy/          # wrangler template, docs for other targets
```

### Runtime-agnostic core, thin runtime adapters

- **Core logic** only uses Fetch-API `Request`/`Response`, Web Crypto, and injected interfaces: store, mail, clock, rate limiter, key material. The same core runs on both targets.
- **Two first-class targets for 0.1**:
  - **Docker / Node 24+**: a single container image, SQLite by default (`node:sqlite`, no native dependency) on a mounted volume, Postgres optional.
  - **Cloudflare Workers**: D1 for storage. Use Durable Objects only where D1 can't give the needed atomicity or rate-limit semantics.
- Other runtimes (Deno, Bun, other edge platforms) should be possible with a new adapter. They don't need to ship in 0.1.

### Dependencies

- Core packages depend only on `@codenhub/*` packages.
- Adapters may use the minimum unavoidable third-party dependency, such as a Postgres driver. Isolate each one in its adapter and justify it.
- An HTTP framework (Hono or similar) is an open question. The package APIs are already Fetch-based, so a small internal router may be enough. Decide deliberately rather than by default.

---

## 3. Scope for 0.1

### Instance setup

- **First run:** generate signing keys and print a **one-time setup token** to the logs/stdout. The setup page creating the first admin requires that token. **An unauthenticated "first visitor becomes admin" page is never acceptable**, because an exposed fresh instance must not be claimable by anyone.
- **Configuration:** a small set of environment variables for things needed before the database exists: the public URL/issuer, the database location, and a master secret. Everything else lives in the database and is editable from the dashboard.
- **The master secret** (for example `SYMBOLON_SECRET`) encrypts sensitive data at rest: private signing keys, TOTP secrets, and anything else that would be dangerous in a leaked database. Document what happens when it's lost or rotated.

### Accounts and authentication

- **Users:** email (unique, normalized via `@codenhub/validation`), display name, status (active, disabled, pending), and timestamps.
- **Registration modes**, set by an admin: **closed** (admins create users), **invite-only**, or **open**. Default to closed or invite-only.
- **Passwords:**
  - Hash with a memory-hard KDF where the runtime allows. See the open question on Argon2id vs PBKDF2 under Workers' CPU limits.
  - Store the algorithm and its parameters with each hash so you can upgrade transparently on login.
  - Set a minimum length, and optionally check against a breached-password list (an open question for privacy and dependencies).
- **MFA:** TOTP with recovery codes in 0.1. Admins can require MFA per role or instance-wide.
- **Passkeys (WebAuthn):** a strong candidate for 0.1 if they fit. Otherwise they're the first thing after 0.1. Design the authentication flow so additional factors and passwordless login slot in.
- **Email flows** (verification, password reset, invites) go through a pluggable mail transport: SMTP on Node, and an HTTP mail API on Workers. Without mail configured, the instance still works: admins can set up users and generate reset links manually.
- **Brute-force protection:** rate limits per account and per IP on login, MFA, reset, and the token endpoint, plus progressive delays. Any lockout must not let attackers lock out arbitrary users permanently.

### Sessions

- Server-side sessions behind an opaque cookie: `HttpOnly`, `Secure`, `SameSite=Lax` or stricter, using the `__Host-` prefix.
- **CSRF protection** on every state-changing form and API call.
- Users can see their sessions and revoke them; admins can revoke any user's sessions.
- Session lifetime: idle timeout plus an absolute timeout, and re-authentication for sensitive actions.

### Roles and permissions

- **The dashboard permission model:** RBAC with a fixed set of built-in permissions, such as `users:read`, `users:write`, `apps:write`, `roles:write`, and `audit:read`. Built-in `owner`/`admin` roles plus custom roles. At least one owner must always exist.
- **App access control:** an app can be open to all users, or restricted to specific roles or users.
- **Roles in tokens:** decide whether and how roles appear as claims, for example a `roles` claim only when the app requests a specific scope. Never leak a user's full role list to apps by default.

### Apps (OIDC clients)

From the dashboard, admins can:

- Register an app with a name, logo, redirect URIs, client type (confidential or public), auth method, allowed scopes, and token lifetimes.
- **Generate client secrets.** A secret is shown exactly once and stored hashed. Admins can rotate and revoke secrets.
- Enable or disable an app.
- See which users have authorized an app, and revoke them.

**Consent:**

- The consent screen lists the requested scopes in plain language.
- The user's decision is remembered per user and app.
- Admins can mark first-party apps as pre-consented.
- Users can review and revoke their connected apps from their account page.

### OIDC

- Discovery, JWKS, authorization, token, and userinfo, all through `@codenhub/oidc/provider` with Symbolon's store adapters.
- **Signing key rotation:** a new key is published in JWKS before it starts signing, and old keys stay published until the tokens they signed have expired. Admins trigger rotation from the dashboard; scheduled rotation is a candidate.
- **Logout:** usable SSO needs at least RP-initiated logout, and back-channel logout is strongly preferred. `oidc` 0.0.1 has no logout support, so **this is probably the first thing to add upstream in `codenhub`**. Treat it as part of Symbolon 0.1.
- **The OpenID conformance suite** (Basic OP and Config OP plans) runs against a deployed Symbolon instance. This doubles as `@codenhub/oidc`'s 0.1 gate.

### User-facing pages

- Login, MFA, consent, logout, password reset, email verification, and invite acceptance.
- **Account page:** profile, password, MFA and recovery codes, active sessions, and connected apps.
- **Instance branding:** name, logo, and an accent color on the login and consent pages. Full theming is out of scope.
- **i18n** via `@codenhub/i18n`, with English and Brazilian Portuguese at launch.

### Admin dashboard

- Users: list, search, create, invite, disable, delete, reset MFA, revoke sessions.
- Roles: create and edit custom roles and assign them.
- Apps: as above.
- Instance settings: registration mode, MFA policy, branding, mail transport, session lifetimes.
- Signing keys: list and rotate.
- **Audit log:** every security-relevant event (logins, failures, MFA changes, admin actions, app and secret changes, key rotation), with who, what, when and from where. It's append-only from the app's point of view and readable in the dashboard.

### Distribution

- **A Docker image** (`symbolon`): multi-arch, a small base, runs as non-root, has a health check, and keeps data on a volume. Provide a compose example with SQLite and one with Postgres.
- **A Workers template**: a `wrangler` config, D1 migrations, and a short deploy guide.
- **Database migrations:** versioned, run automatically on startup (with an opt-out), and identical in meaning across SQLite, Postgres, and D1.
- **Backups:** document how to back up each store, and what the master secret means for restoring.

### Out of scope for 0.1

- **The user-owned data store** (the differentiator). It's next after 0.1; see section 4.
- SAML.
- Social or upstream login (federating to Google or GitHub). It's a likely candidate later, and `oidc/client` already makes it feasible.
- LDAP and SCIM.
- Organizations, tenants, and multi-tenancy.
- Dynamic client registration, PAR, DPoP, and device flow. These are tracked in `oidc`.
- Webhooks.
- A public admin API with API keys. Build the dashboard's API as if it will become public, but don't promise stability.

---

## 4. Leaving room for user-owned data

0.1 doesn't build it, but it must not paint the project into a corner. Concretely:

- **The scope model** must support app-defined, namespaced scopes beyond `openid profile email`, for example `data:<namespace>:read` and `data:<namespace>:write`. The consent screen and the stored consent records must handle them without a schema rewrite.
- **Access tokens** must carry enough information for a future resource API to authorize requests: subject, client, scopes, and audience. Whether that means opaque tokens plus introspection or RFC 9068 JWTs is a decision for later, but don't foreclose either.
- **Storage:** user data will be keyed to the user, not the app. Keep the user ID stable and keep the user table free of app-specific columns.
- **Account deletion and export** must cover everything tied to a user, including future data. Design deletion as a single, exhaustive operation from the start.
- **Pairwise subject identifiers** (a different `sub` for each app) fit the privacy story. Leave room for them even if 0.1 uses public `sub`s.

---

## 5. Invariants

The invariants moved to [the invariants specification](specs/invariants.md), which owns them, numbered as they were here. They are binding; the rest of this document is a proposal.

---

## 6. Open questions

- **Password hashing on Workers.** Argon2id through WASM is the right algorithm, but Workers' CPU-time limits may make sane parameters impractical. PBKDF2-SHA256 through Web Crypto works everywhere but isn't memory-hard. Options:
  - Argon2id on Node, PBKDF2 with high iterations on Workers, with the stored parameters allowing migration later.
  - Argon2id with tuned parameters on both, measured on real Workers plans.

  Measure before deciding.

- **The dashboard as an SPA or server-rendered.** The login and consent pages should probably be server-rendered: minimal, no JS required, strict CSP, and nothing to compromise between the user and their password. The admin dashboard could be an SPA built with codenhub's UI packages, talking to the admin API. Is that split right, or is everything server-rendered simpler?
- **An HTTP framework or an internal router?** See section 2.
- **Rate limiting backing store** per runtime: an in-process limiter is fine for a single Node container, the database for multiple containers, and a Durable Object or D1 on Workers. What's the minimum honest implementation for 0.1?
- **Multiple Node instances.** Is horizontal scaling a 0.1 goal, or is "one container, scale up" acceptable at first? This affects sessions, rate limits, and caches.
- **Roles in tokens:** the claim format, and whether apps can define their own app-scoped roles.
- **Passkeys in 0.1** or right after?
- **Access token format** for the future data API. See section 4.
- **Name collisions.** Check `symbolon` on npm, Docker Hub, and GitHub before settling on package scopes and the image name.

---

## 7. Testing and acceptance

- **Unit and integration tests** for `core`, against the in-memory store and against every real store adapter.
- **Store conformance.** `@codenhub/oidc/testing`'s `storeConformanceCases`, plus Symbolon's own suite, run against SQLite, Postgres, and D1 (through Miniflare) in CI.
- **End-to-end browser tests** with Playwright:
  - setup → create an admin → register an app → a user logs in through a real OIDC client (`@codenhub/oidc/client` and panva's `openid-client`) → consent → logout
  - MFA enrollment and login
  - password reset
  - session revocation
  - a non-admin cannot reach admin routes
- **A security suite**, in the spirit of the codenhub packages' hostile-input suites:
  - setup without the token
  - user enumeration timing and response checks
  - CSRF on every state-changing route
  - a permission check on every admin route
  - brute-force limits
  - secrets absent from logs, errors, and audit entries
  - clickjacking headers
  - CSP present on every HTML response
- **The OpenID conformance suite** (Basic OP and Config OP) against a running instance, documented so anyone can reproduce it.
- **Both runtimes in CI**: the Docker image builds and passes a smoke test, and the Workers build runs the integration suite in workerd.
- **Docs:** an operator guide (deploy with Docker, deploy on Workers, configuration, backups, upgrades, key rotation), an integration guide for app developers (with `@codenhub/oidc/client` and with any standard OIDC library), and a security policy.

**0.0.1 is done when:**

- A fresh Docker container can be set up with the setup token.
- An admin can register an app.
- A user can sign in to that app through OIDC and sign out, end to end in a browser test.
- The Workers build passes the same flow.

**0.1 is done when:**

- Everything in section 3 works.
- Every invariant holds and has a test.
- The OpenID conformance Basic and Config OP plans pass against a deployed instance.
- The operator and integration guides are written.
