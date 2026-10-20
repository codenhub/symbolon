## What and why

<!-- What the change does for someone reading the log later, and why it is needed. -->

Fixes #

## Checks

- [ ] `pnpm verify` passes, or the skipped steps are listed here
- [ ] `pnpm test:e2e` passes, if the change affects anything a browser sees
- [ ] Documentation affected by the change is updated in this pull request

## Security

- [ ] No secret, token or code can reach a log, an error, an audit entry or a response (invariant 2)
- [ ] New request input is validated at the boundary, with a bounded size (invariant 4)
- [ ] Each invariant the change touches has a test, and its "Enforced by" line in `docs/specs/invariants.md` is updated
