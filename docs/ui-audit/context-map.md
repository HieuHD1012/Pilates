# Context and history map

## What this product is

Soul Pilates Nha Trang is two related products: a public site for a visitor deciding whether to contact a single-location studio, and an operating system for staff, trainers, and students. Staff schedule classes, manage people, packages, payments and renewals; students find and book classes on phones. The functional basis is `src_FE/docs/PRODUCT.md`, the workbook in `src_FE/docs/source/`, and the backend contracts in `docs/api/`. It is not primarily a marketing landing page or an analytics dashboard. Prices, address, contact information, and trainer profiles for this location remain unconfirmed in `src_FE/app/content/studio.ts` and `src_FE/docs/OPEN_QUESTIONS.md`.

## Reconstructed sequence

| When / Git evidence | What happened | What can be established |
| --- | --- | --- |
| 2026-08, imported at `562df8a` | The large `src_FE/docs/source/BOOTSTRAP_BRIEF.md` asked for research, an original premium direction, three reference screens, and guardrails. `docs/DESIGN_DIRECTION.md` chose “Measure”: rules, figures, plaster, one lacquer accent. `docs/adr/0004-measure-design-direction.md` accepted it. | The brief is an instruction given to earlier agents; the design direction is their interpretation, not a user-validated usability result. |
| By `562df8a` | Full frontend imported with public routes, staff calendar, student booking, tokens, `AGENTS.md`, Reference Lock and tests. | The actual development history before import is absent from this repository's Git log. The imported artifacts report the reasoning, but individual earlier iterations cannot be independently reconstructed as commits here. |
| 2026-08-25 artifact | `docs/thiet-ke/soul-doi-chieu.html` compared Soul-1 with a Soul-2 build using screenshots and DOM/CSSOM counts. It preferred Soul-1 under five principles while noting Soul-2's shorter lines, faster list scanning, clearer today column, and fewer nodes. | The counts and observations are evidence about those captured builds. “0 cards / 0 pills” proves adherence to a style rule, not higher usability. The Soul-2 source is unavailable in current refs. |
| 2026-09-16–21, `009f410` → `82f3d5a` | Photography work filled five slots, audited 21 studio images, tested treatment and compression, then changed the homepage to one frame. The reports in `docs/thiet-ke/` describe more experiments than the five available `photos/*` refs. | The image pipeline is technically careful (`picture`, AVIF/WebP, responsive `sizes`, reserved ratios). The final one-photo homepage can be rendered at `photos/g3-mot-khung`; the other named but missing branches cannot be verified from Git. |
| 2026-09-18–19, `e627bab`, `d6bc929`, `9d64fb3` on `main` | Frontend mapped 88 backend endpoints; a real API run exposed five functional defects; demo seeding was added. | The API-connected UI is a later functional base but diverged from the photography branch. `codex/ui-base` merges them, resolving only a docs conflict, so the experiments keep both functionality and image work. |
| 2026-09-25, this audit | The current and integrated UIs were run in Chromium with MSW. Screenshots and measurements are in `screenshots/`. | This is direct evidence of rendered behaviour at four viewports and selected states. It is not user testing. |

## Source confidence

- **Confirmed product / code facts:** source workbook, API contracts, route code, current Git refs, and rendered browser measurements.
- **Historical interpretation:** `DESIGN_DIRECTION.md`, `REFERENCE_LOCK.md`, HTML comparisons, comments explaining intent. These show what prior agents believed and tried.
- **Unavailable evidence:** original individual Soul-1 development commits, Soul-2 source, most experiment branches mentioned by the HTML report, actual customer behaviour, studio content decisions, and production analytics. Conclusions requiring these remain unproven.

## Branch map

- `photos/g3-mot-khung` (`82f3d5a`): current photographed UI, before backend mapping.
- `photos/g3-nen` (`0a6a7e8`): earlier image/compression variant.
- `photos/base` (`fbcae35`): alternate photography ancestry.
- `main` (`9d64fb3`): API-connected frontend, without the later photography commits.
- `codex/ui-base`: merge of `photos/g3-mot-khung` and `main`, used as common base for the three versions.

The working tree initially had no local edits. The three experiment branches start from one identical `codex/ui-base` commit and live in separate Git worktrees.
