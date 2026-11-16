# Agent instructions: `packages/store-d1/`

## Traps

- `new Miniflare({ modules: true, script, d1Databases })` throws "Unrecognized keys" on miniflare 5 (a ZodError on 5.20261012.1-beta, a `MiniflareCoreError` on 5.20261113.0-beta), whose options moved to a `workers` array. Prefer wrapping v4-style options in `convertV4MiniflareOptions`, as the tests here do; codenhub's oidc workerd test does the same. Held with miniflare 5.20261012.1-beta and Vitest 4.1, and checked again on 2026-11-16 with miniflare 5.20261113.0-beta on Node.js 26.13.1.
