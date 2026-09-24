# Rendered UI diagnosis and root causes

## Audit method and limits

Chromium rendered the merged app with MSW demo data at 1440×900, 1024×768, 768×1024, and 390×844. Captures cover homepage, staff dashboard/calendar, student browse/schedule, a populated student day, public menu, and staff create-class dialog. `src_FE/scripts/ui-audit-capture.mjs` produced the screenshots and `screenshots/integrated/measurements.json`. The former photography-only branch was captured separately at 1440/768/390. Static code inspection covered routes, shared layouts, tokens, `WeekGrid`, booking flow, data states, and feature docs. No real customer or production content was available.

## High-impact findings

| Symptom in rendered UI | Evidence | Root cause | Impact |
| --- | --- | --- | --- |
| Staff calendar at 390px creates a 472px document; rightmost week action is outside the viewport. | `screenshots/integrated/staff-calendar-390.png`; `measurements.json`; `app/routes/staff/calendar.tsx` five actions inside `PageHeader` | `PageHeader` action container is `flex` without wrap or width constraints. The staff strip is only locally scrollable and cannot constrain a widening document. | Horizontal page scroll and clipped actions on phone. CSS implementation and shared component composition. |
| Mobile public menu toggles to X but the menu panel is invisible. | Pre-fix interaction capture, `app/layouts/public-layout.tsx`: fixed panel nested inside sticky blurred header | `backdrop-filter` creates a containing block for fixed descendants; `top-16 bottom-0` collapses within the header. | Public navigation broken on phone. A shared functional bug; fixed in `codex/ui-base` by making the header opaque and removing the blur, then recaptured. |
| Student lands on “no classes” although a bookable day exists within the queried 14-day range. | `student-classes-390.png` and `student-classes-populated-390.png`; `app/routes/student/classes.tsx` initializes `activeDay=today` and does not mark which tabs have classes | The UI starts with a date choice before showing availability. Empty state asks the student to hunt through an unmarked horizontal strip. | Weak booking discovery and false impression of no supply. Information architecture / interaction, not a lack of data. |
| Dashboard makes four figures equal peers; action lists start far down on phone. | `staff-dashboard-390.png`; `ui/layout.tsx` `Metric`; `routes/staff/dashboard.tsx` | Reference Lock prizes figures and uniform ruled rhythm. The page does not distinguish “act now” (renewals, unconfirmed payments, attendance) from orientation (today's class count). | Staff scans metrics before tasks. Product hierarchy and composition. |
| Week grid at 1440 spends hundreds of pixels on empty midday hours. | `staff-calendar-1440.png`; `week-grid.tsx` 1.25px per minute and 06:00–18:20 classes | A continuous literal time axis is used for a bimodal schedule. `computeBounds` narrows outer bounds but cannot compress the gap inside. | Staff must travel vertically to compare morning and evening. Layout model issue. |
| Homepage at 390px is approximately 5.5k px tall before footer completion, with multiple generous numbered sections after the hero. | `home-390.png`; `home.tsx` sections; `ui/layout.tsx` `Section` padding | Editorial pacing from the public brand thesis was applied to every content block even though the visitor's main jobs are compare formats, see availability and contact. The final image pass optimized frame/format rather than sequence. | Important decision information and final CTA are distant. Over-application of valid whitespace/photography principles. |
| The polished public page still cannot answer address, hours, price or direct phone. | `content/studio.ts`, `OPEN_QUESTIONS.md`, footer placeholders | Confirmed content debt, not UI execution. The prior design correctly refused invention, but a real trust decision requires the studio to supply facts. | No visual variant can close the launch gap on its own. |

## What already works

- Authentication and business mutations remain server-owned after `main` integration. The UI does not need a new data architecture for this audit.
- Vietnamese font coverage and line clearance look sound at reviewed widths.
- The public image is authentic studio material, displayed without a heavy text scrim and with responsive sources.
- `WeekList` is a real mobile recomposition rather than a seven-column grid squeezed to 390px.
- Booking detail states the transaction's consequence and uses explicit confirmation; preserve this in every version.
- Error, loading and empty primitives exist and are used broadly. Visual review did not exhaust every backend error variant or long real names; the versions need CSS robustness for those states.

## Causal summary

1. **Aesthetic governance became a proxy for usability.** “Zero cards,” one hairline unit, one accent and one subject explain visual consistency; they do not prove that staff can spot the next action or visitors can answer their questions. This is a research interpretation/design-decision problem.
2. **Page composition follows a genre more than each job.** Editorial public pacing and literal calendar time are defensible individually, but they burden the actual decision paths. This is a design model problem, not just spacing.
3. **Shared responsive contracts are incomplete.** `PageHeader` and the mobile menu break despite per-screen responsive intentions. This is implementation.
4. **Honest missing content remains a business blocker.** The UI should show the best available next step, while the studio supplies the facts; styling cannot manufacture trust.

## Evidence status

These are observations of demo fixtures and selected states, not measured customer outcomes. Faster scanning, trust and contact conversion are hypotheses to validate with users or analytics. The 472px overflow and invisible menu are direct, reproducible defects.
