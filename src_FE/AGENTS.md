# AGENTS.md — Soul Pilates Nha Trang

## Current UI investigation

The September 2026 design audit is in `../docs/ui-audit/README.md`. Its
`context-map.md` locates older research and branches; `decision-history.md`
traces decisions to code and rendered evidence; `current-ui-diagnosis.md` and
`design-direction.md` explain the three independent experiments. Screenshots
and viewport measurements are in `../docs/ui-audit/screenshots/`. When changing
UI, inspect the relevant real screen at 1440, 1024, 768 and 390px, including
its empty and interactive states. The explicit human instruction for this audit
authorizes reconsidering the Reference Lock; do not treat historical artifacts
as new product requirements.

This file outranks every other instruction in this repository except an explicit
human decision. If a prompt, a habit or a tempting library conflicts with it,
this file wins.

**Precedence**

```
1. AGENTS.md
2. Accepted ADRs (docs/adr/)
3. Canonical docs (docs/*.md)
4. Scoped agent rules (.cursor/rules/*.mdc, CLAUDE.md)
5. Confirmed feature requirements (docs/PRODUCT.md, docs/source/)
6. Existing approved implementation precedent (the three reference screens)
7. AI preference — always last
```

---

## The twenty rules

1. **React Router v8 framework mode only.** No Next.js, Astro, or a second
   frontend framework. No React Router declarative or data mode.
2. **`ssr: false` is intentional**, not a default someone forgot to change. See
   `docs/adr/0001-static-spa-with-selective-prerender.md`.
3. **There is no production frontend Node runtime.** Node is for dev, build, CI
   and tooling. Nothing may require a server at request time.
4. **Public SEO routes use the official `prerender` config**, listed in
   `app/content/prerender-paths.ts`. No custom prerender plugins.
5. **Runtime application routes are served by the SPA fallback**
   (`build/client/__spa-fallback.html`) and must survive a hard refresh and a
   pasted deep link.
6. **The backend is authoritative** for authentication, authorization, booking
   eligibility, capacity, waitlist order, payment state, session deduction,
   package validity, schedule conflicts, and refund eligibility.
7. **No frontend BFF, no custom SSR, no Server Actions** without an accepted ADR.
8. **Mutable backend state belongs to TanStack Query.** Nothing else caches it.
9. **Route `loader`s serve build-time public content only.** A loader on a route
   that is not in `prerender-paths.ts` is a bug.
10. **Never use `clientLoader` and TanStack Query as two owners of the same
    mutable domain.** Pick one; for anything mutable, pick TanStack Query.
11. **`useEffect` + `fetch` is not the data strategy.** ESLint rejects it.
12. **Do not re-implement a backend business rule in the frontend.** Render what
    the backend returns (`eligibility`, `cancellation`, `waitlistAutoPromote`).
13. **Search before you abstract.** `rg` the repo; the pattern usually exists.
14. **Reuse the design-system primitives in `app/ui/`.** Do not restyle Radix
    defaults inline, and do not add a component library.
15. **Preserve the accepted Reference Lock** (`docs/REFERENCE_LOCK.md`). Changing
    the visual direction requires the process in that document, not a nicer idea.
16. **Public and operational surfaces are one brand doing two jobs.** Do not put
    editorial hero layouts into staff tools; do not put SaaS chrome on the
    public site.
17. **No unstable framework experiments** (RSC, canary APIs) in this repository.
18. **No new architecture without an ADR** in `docs/adr/`.
19. **Never invent business facts.** Prices, addresses, phone numbers, trainer
    biographies, testimonials, reviews and metrics for the Nha Trang studio are
    unknown. Use `app/content/studio.ts` + `<PendingFact>` and record the gap in
    `docs/OPEN_QUESTIONS.md`.
20. **`<PendingFact>` and `<Absent>` are not interchangeable.** PendingFact means
    *the studio owes us this and will supply it* — it renders "Đang cập nhật" and
    it belongs to `CONTENT_DEBT`. `<Absent>` means *this record legitimately has
    nothing here*: a student with no package, an optional email nobody recorded.
    Using PendingFact for the second tells staff to wait for something that is
    never coming.
21. **Run `npm run verify` before declaring anything done** — typecheck, lint,
    tests, production build, the build contract, and the code half of the content
    gate. `npm run check:release` is the stricter gate: it also fails on required
    studio facts that have no owner and no date. `verify` deliberately does not,
    because no code change can fix them and a permanently red gate gets ignored.

---

## The five locked design principles

These decide novel cases. They exist because the twenty rules above govern
architecture and these govern composition — and because four of their earlier
drafts could not actually resolve a real case in this product.

**P1 — One screen, one winning subject.**
The winning subject is the object the route is named after. Every other figure is
an attribute of that object or of one of its rows, never a peer. Yielding means
reducing size, tone, or dropping fill — and it governs emphasis, never presence:
any fact a customer needs in order to decide stays on the page at whatever size.
Two controls with the same label in one viewport are one subject rendered twice;
delete one. Never resolve competition with a dark overlay on a photograph, and
never by cropping a void to receive type.

**P2 — One ask, stated once.**
The unit is a transaction, not an element: one primary control that starts a
booking or an enquiry, per screen. Secondary paths repeat as text links. **Facts
are not asks and are uncapped** — P2 may never be cited against an address, an
opening hour, a class format or a capacity. On operational surfaces: one primary
action per screen and one per row; navigation, filters and week-stepping are not
asks. Confidence: medium, resting on a small-sample correlation with a known
counterexample. Breakable by measuring contact rate.

**P3 — Never invent a fact; an empty slot must look like an empty slot that is waiting.**
Required before launch: address, district, opening hours, phone, Zalo. A fact
enters only through `app/content/studio.ts` or the backend, carrying a source and
a date. **Identity is absolute**: no placeholder person reaches a public surface —
`npm run check:content` fails the build on it. An empty slot is final geometry,
the ground moved one step, and the frame's own hairline: no label, no mark, no
texture. Decorating an empty slot announces that it is empty.

**P4 — One token per semantic function, not one token per value.**
Adding a token within a small delta of an existing one (leading, tracking,
duration, opacity, rule weight) requires retiring the neighbour or documenting
what distinguishes them. A new _chromatic_ token is a brand decision and needs
the Reference Lock reconsideration process — a chart palette is not a screen
decision. The rule that produced this: five tracking values existed at 11px while
the token declaring 0.11em already existed. Intent was not missing; enforcement was.

**P5 — Vietnamese decides the typography.**
Caps are permitted for the Latin wordmark only — never for Vietnamese strings,
nav, labels, buttons or section rubrics. Leading is set for the worst-case line
pair (tallest diacritic stack over deepest descender), not the average.
"Comparable number" means it appears in a column, or is set against another
instance of the same quantity on the same screen; those go in the face that has
`tnum`, everything else stays in the sans. Diacritic-bearing text never goes
below `text-2xs`, never uses weight 300 under 15px, and is **never resolved by
hover-only disclosure** — if it does not fit, the container changes, not the string.

---

## What the tooling already enforces

You do not have to remember these; the repository will stop you.

| Rule                                                 | Enforced by                                     |
| ---------------------------------------------------- | ----------------------------------------------- |
| No arbitrary colours (`bg-blue-500` does not exist)  | `--color-*: initial` in `app/styles/app.css`    |
| No arbitrary radii (`rounded-2xl` does not exist)    | `--radius-*: initial`                           |
| No decorative elevation (`shadow-lg` does not exist) | `--shadow-*: initial`, three named shadows only |
| No `useEffect(fetch)`                                | `no-restricted-syntax` in `eslint.config.js`    |
| No Zustand/Redux holding server state                | `no-restricted-imports`                         |
| No fixtures imported by app code                     | `no-restricted-imports`                         |
| Pre-rendered routes exist and carry SEO HTML         | `scripts/check-build-contract.mjs`              |
| SPA fallback present, `ssr:false` intact             | `scripts/check-build-contract.mjs`              |
| Impure calls during render                           | `react-hooks/purity`                            |

If you find yourself wanting to disable one of these, that is the signal to open
an ADR — not to add an eslint-disable comment.

---

## Where things live

```
app/
  content/     Studio facts, nav, photography briefs, prerender path list
  features/    Domain modules: auth, booking, schedule
  layouts/     One layout per audience: public, auth, student, trainer, staff
  lib/         API adapter, query keys, query client, formatting, cn
  mocks/       MSW handlers + clearly-marked DEMO fixtures (never imported by app code)
  routes/      Route modules, grouped by audience
  styles/      The token layer
  test/        Vitest setup and the provider-aware render helper
  ui/          Design-system primitives
docs/          Canonical documentation; docs/adr/ for decisions; docs/source/ for the brief
e2e/           Playwright specs. `*.spec.ts` run against the real build artifact;
               `*.app.spec.ts` run against the dev server, because MSW only starts
               in development and the built artifact has no backend at all
scripts/       Build-contract, content inventory, static server, screenshot capture
```

## The three reference screens

Before inventing a pattern, read the nearest one:

| Screen                    | File                                  | Establishes                                          |
| ------------------------- | ------------------------------------- | ---------------------------------------------------- |
| A — Public homepage       | `app/routes/public/home.tsx`          | Brand, composition, type, public data states         |
| B — Staff weekly calendar | `app/routes/staff/calendar.tsx`       | Operational shell, density, filters, status language |
| C — Student booking       | `app/routes/student/class-detail.tsx` | Mobile product UX, transactions, mutation states     |

## Language

The product is **Vietnamese-first**. UI copy, route slugs, error messages and
empty states are Vietnamese. Code, comments, commits and documentation are
English. Never set Vietnamese in all caps (see `docs/DESIGN_SYSTEM.md`).
