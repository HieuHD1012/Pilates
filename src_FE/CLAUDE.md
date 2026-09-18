# CLAUDE.md

Start with **[AGENTS.md](AGENTS.md)**. It is the contract for this repository and
it is not duplicated here.

Then, depending on the task:

| Task                          | Read                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| Anything at all               | [AGENTS.md](AGENTS.md), [AI_PLAYBOOK.md](AI_PLAYBOOK.md)                                                 |
| Adding a screen               | [docs/UI_PATTERNS.md](docs/UI_PATTERNS.md), the nearest reference screen                                 |
| Calling the backend           | [docs/API_MAPPING.md](docs/API_MAPPING.md) — every endpoint and its one caller                           |
| Fetching or mutating data     | [docs/DATA_OWNERSHIP.md](docs/DATA_OWNERSHIP.md), [docs/QUERY_CONVENTIONS.md](docs/QUERY_CONVENTIONS.md) |
| Styling                       | [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), [docs/REFERENCE_LOCK.md](docs/REFERENCE_LOCK.md)         |
| Adding a route                | [docs/ROUTING.md](docs/ROUTING.md)                                                                       |
| A form                        | [docs/FORMS.md](docs/FORMS.md)                                                                           |
| Business behaviour            | [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md), [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md)       |
| Deployment or build questions | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                                                                 |
| Comparing against `../soul`   | [docs/review/index.html](docs/review/index.html) — ảnh chụp, số đo, bản trình khách                      |

## Fast facts

- Vietnamese-first product; English code and docs.
- `npm run verify` is the gate. Nothing is done until it passes.
- `npm run dev` boots with MSW fixtures that implement the real API shape; point
  `VITE_API_BASE_URL` at a running backend to use the real one.
- To review a role-gated screen locally:
  `localStorage.setItem("soul:demo-role", "ADMIN" | "STAFF" | "TRAINER")`, then
  reload. Anything else is the student.
- Capture screens for visual review:
  `node scripts/shoot.mjs http://localhost:5188 ./shots "/studio/lich@staff"`.

## Two things that are easy to get wrong

1. **The SPA fallback is `__spa-fallback.html`, not `index.html`**, because `/`
   is itself pre-rendered. Hosting rewrites must point at it.
2. **Numbers are set in the display serif.** The UI sans has no tabular figures.
   Use `<Figures>` — never a bare number in a table, metric or price.
