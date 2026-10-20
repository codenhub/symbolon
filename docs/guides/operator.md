---
status: IMPLEMENTED
last_updated: 2026-10-20
scope: Running Symbolon: configuration, Docker, Cloudflare Workers, and backups.
---

# Operator guide

> Symbolon is pre-release. This guide covers what exists today and grows with each feature: setup, keys, mail and upgrades come with the features they configure.

## Configuration

Symbolon reads a few environment variables, the ones it needs before the database exists. Everything else will live in the database and be edited from the dashboard.

| Variable            | Required | Meaning                                                                                                                                         |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `SYMBOLON_ISSUER`   | yes      | The public URL of the instance, such as `https://id.example.com`. It is the OIDC issuer, so changing it later breaks every app's configuration. |
| `SYMBOLON_SECRET`   | yes      | The master secret, at least 32 characters. See [the master secret](#the-master-secret).                                                         |
| `SYMBOLON_DEV_MODE` | no       | `true` allows an `http://` issuer, for local development only. Default `false`.                                                                 |
| `SYMBOLON_DATABASE` | no       | Node.js only. A SQLite file path, or a `postgres://` URL. Default `./data/symbolon.db`; the Docker image sets `/data/symbolon.db`.              |
| `SYMBOLON_PORT`     | no       | Node.js only. Default `3000`.                                                                                                                   |
| `SYMBOLON_HOST`     | no       | Node.js only. The interface to listen on. Default `127.0.0.1`; the Docker image sets `0.0.0.0`.                                                 |

Symbolon refuses to start with an `http://` issuer unless dev mode is on, and the error names the variable, never its value.

### The master secret

Generate it once, keep it with your backups, and never commit it:

```sh
openssl rand -base64 32
```

It will encrypt the data that must be recoverable, such as signing keys and TOTP secrets. Losing it makes that data unreadable: a restored database without its secret has to be set up again. Rotating it is not supported yet.

## Docker

The image runs as a non-root user, keeps its data in the `/data` volume, and has a health check on `/healthz`. It speaks plain HTTP inside the container: put a TLS-terminating reverse proxy in front of it, and set `SYMBOLON_ISSUER` to the public `https://` URL.

```sh
docker run -d --name symbolon -p 127.0.0.1:3000:3000 \
  -e SYMBOLON_ISSUER=https://id.example.com \
  -e SYMBOLON_SECRET="$(openssl rand -base64 32)" \
  -v symbolon-data:/data \
  ghcr.io/codenhub/symbolon:latest
```

Compose files for SQLite and for PostgreSQL are in `deploy/compose/`. Migrations run on every start.

To build the image from a checkout, from the repository root:

```sh
docker build -f apps/node/Dockerfile -t symbolon .
```

## Cloudflare Workers

The Worker uses D1 for storage. From a checkout of a release tag:

```sh
pnpm install
pnpm --filter @symbolon/workers exec wrangler d1 create symbolon
```

Put the database id it prints in `apps/workers/wrangler.jsonc`, along with your `SYMBOLON_ISSUER`, then set the secret and deploy:

```sh
pnpm --filter @symbolon/workers exec wrangler secret put SYMBOLON_SECRET
pnpm --filter @symbolon/workers run deploy
```

The Worker migrates D1 on the first request each instance serves.

## Backups

| Store      | How                                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQLite     | Stop the container and copy the `/data` volume, or run `sqlite3 /data/symbolon.db ".backup /data/backup.db"` while it runs. Copying the file alone while running can miss the write-ahead log. |
| PostgreSQL | `pg_dump`.                                                                                                                                                                                     |
| D1         | `wrangler d1 export symbolon --remote --output backup.sql`, or D1's Time Travel.                                                                                                               |

A backup is only restorable together with the `SYMBOLON_SECRET` it was written under.
