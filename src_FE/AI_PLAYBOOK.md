# AI Playbook

The loop to run for every feature in this repository. It exists so that a short
prompt — "implement staff student management" — produces work that fits.

## Before writing code

1. Read [AGENTS.md](AGENTS.md).
2. Read the relevant doc from the table in [CLAUDE.md](CLAUDE.md).
3. Read the requirement. The functional source of truth is
   `docs/source/Pilates_Danh_Sach_Chuc_Nang_Va_Cau_Hoi_Xac_Nhan.xlsx`, summarised
   in [docs/PRODUCT.md](docs/PRODUCT.md).
4. Name the user and their primary task. Student, trainer, staff and owner want
   different things from the same data.
5. Find the closest existing implementation. One of the three reference screens
   is almost always the precedent.
6. `rg` for existing primitives and hooks before creating anything.

## Deciding ownership

7. Decide who owns each piece of data — see
   [docs/DATA_OWNERSHIP.md](docs/DATA_OWNERSHIP.md). Public and stable → route
   `loader` + prerender. Mutable → TanStack Query. Ephemeral UI → `useState`.
8. Write down the API contract you are assuming. Add the types to
   `app/lib/api/types.ts` with a comment tracing them to the requirement.
9. Add query keys to `app/lib/api/query-keys.ts`. Never inline a key.

## Building

10. Implement queries and mutations in `app/features/<domain>/`.
11. Design all four read states: loading, empty, error, and stale/refetching.
    A screen with only a success state is not finished.
12. Design the mutation states: pending, success, failure — and state the
    transaction's consequence before the user commits to it.
13. Check 375 / 390 / 768 / 1024 / 1440. Mobile is a design, not a narrowing.
14. Check accessibility: heading order, labels, focus, keyboard path, contrast,
    and that no status is carried by colour alone.

## Checking yourself

15. Open the nearest reference screen and compare. Does yours look like it came
    from the same studio?
16. Re-read [docs/REFERENCE_LOCK.md](docs/REFERENCE_LOCK.md). Rules not cards.
    Figures in the serif. No pills. No decorative shadow.
17. Add or update tests. Business-rule mapping and remote states are the two
    things worth testing here.
18. `npm run verify`.
19. Confirm no architectural invariant moved: still `ssr:false`, still one
    server-state cache, still no backend rule re-implemented in the frontend.
20. Confirm nothing generic crept in: no invented data, no stock-looking
    section, no unexplained visual effect.

## When the requirement is unclear

Do not guess a business rule. Add the question to
[docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md), model the field as backend-
provided, and render the neutral case until the studio answers.
