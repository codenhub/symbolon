# Symbolon

> _σύμβολον_: in Ancient Greek, a token broken in two, whose halves prove identity when they fit. [Why the name](docs/name.md).

A self-hosted, free and open-source identity provider. Deploy it and get one account per person, an admin dashboard for users, roles and apps, and "Sign in with <your instance>" for any app that speaks OpenID Connect.

There is no paid tier, no hosted edition and no telemetry: every feature is in the open-source build. Later, Symbolon will let apps store data on the user's account rather than their own, with the user deciding which app can read or write what.

> **Status:** pre-release. The foundation is in place; the identity provider itself is being built toward 0.0.1. See the [roadmap](docs/roadmap.md).

## Runs on

- **Docker / Node.js 24**, with SQLite on a volume by default, or PostgreSQL.
- **Cloudflare Workers**, with D1.

One runtime-agnostic core serves both; see the [architecture](docs/architecture.md). Built on [`@codenhub/oidc`](https://github.com/codenhub/codenhub/tree/main/packages/oidc), [`@codenhub/jwt`](https://github.com/codenhub/codenhub/tree/main/packages/jwt) and the other codenhub packages.

## Repository

- `packages/`: the core, the HTTP server, and the store adapters, all runtime-agnostic except the Node.js-only adapters.
- `apps/`: the Node.js server and Docker image, the Worker, and the dashboard.
- `tests/e2e/`: browser tests across Chromium, Firefox and WebKit.
- `deploy/`: Compose examples.
- `docs/`: the scope, invariants, architecture, guidelines and guides.

## Development

```sh
nvm use
pnpm install
cp apps/node/.env.example apps/node/.env   # then set SYMBOLON_SECRET
pnpm dev
```

`pnpm verify` runs every check CI runs except the browser suites, which are `pnpm test:e2e`. [Tooling](docs/tooling.md) describes every script.

## Documentation

- [Contributing](CONTRIBUTING.md): setup, workflow, commits, and releases.
- [Documentation index](docs/README.md): scope, invariants, architecture, guidelines, and guides.
- [Operator guide](docs/guides/operator.md): configuring and running Symbolon.
- [Security policy](SECURITY.md): reporting a vulnerability.

## License

Apache-2.0.
