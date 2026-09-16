# ADR 0003 — TypeScript 6.0, not 7.0

**Status:** Accepted · 2026-08-18 · **Revisit:** when typescript-eslint supports TS 7

## Context

At bootstrap, `typescript@latest` is **7.0.2** and `typescript@6.0.3` is the
previous stable line. `typescript-eslint@8.67.0` declares:

```json
"peerDependencies": { "typescript": ">=4.8.4 <6.1.0" }
```

Installing TypeScript 7 would leave the repository without type-aware linting —
which is where several of the AGENTS.md guardrails are enforced.

## Decision

Pin `typescript@~6.0.3`.

`baseUrl` was also removed from `tsconfig.json`: TypeScript 6 reports it as
deprecated and it is unnecessary because `paths` resolves against the config
file's directory.

## Consequences

- Full type-aware lint coverage is retained.
- The repository forgoes TS 7's compiler performance until the ecosystem moves.
- `npm run typecheck` runs `react-router typegen && tsc --noEmit`.

## Revisit when

typescript-eslint publishes a release whose peer range admits TypeScript 7.
Upgrading is then a one-line change plus a full `npm run verify`.
