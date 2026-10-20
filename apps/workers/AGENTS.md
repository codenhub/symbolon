# Agent instructions: `apps/workers/`

## Traps

- `new Miniflare({ modules: true, script, d1Databases })` throws a ZodError ("Unrecognized keys") on miniflare 5.20261012.1-beta, whose options moved to a `workers` array. Prefer wrapping v4-style options in `convertV4MiniflareOptions`, as the tests here do; codenhub's oidc workerd test does the same. Held with miniflare 5.20261012.1-beta and Vitest 4.1.
