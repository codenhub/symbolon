# Security

Symbolon is an identity provider, so a vulnerability in it can expose every app that trusts it. Reports are welcome and taken seriously.

## Reporting a vulnerability

Report it privately through [GitHub's private vulnerability reporting](https://github.com/codenhub/symbolon/security/advisories/new), not in a public issue. Include the version or commit, the runtime (Docker with SQLite or PostgreSQL, or Workers), the impact, and the smallest reproduction you have.

A report is acknowledged on GitHub, and the advisory stays private until a fixed image is published.

A vulnerability in an `@codenhub/*` package that Symbolon uses, such as `@codenhub/oidc` or `@codenhub/jwt`, goes to [codenhub](https://github.com/codenhub/codenhub/security/advisories/new). If you are not sure which side it is on, report it here.

## Supported versions

Symbolon is pre-release. Fixes ship in a new image; only the latest release receives them.

## What Symbolon commits to

The [invariants](docs/specs/invariants.md) are the security commitments every release keeps, such as no secret stored in plaintext, no user enumeration, and no instance claimable without its setup token. A way to break one is a vulnerability.
