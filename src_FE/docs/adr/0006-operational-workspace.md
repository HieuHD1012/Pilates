# ADR 0006 — The operational workspace: panels, a quiet rail, and page titles in the serif

**Status:** Accepted. Defines staff workspace panels and navigation alongside
`docs/REFERENCE_LOCK.md`. Shared primitives also serve student/trainer screens.

## Context

Staff workflows need readable record identity, grouped navigation, visible
queues, coherent filters and clear transaction states. The owner-approved
operational composition uses panels on a warm ground and a dark navigation rail.

## Decision

1. **Panels.** Operational content groups sit in a `Panel` (`app/ui/workspace.tsx`):
   `paper` surface, a `rule` hairline border, and a new radius token
   `--radius-lg: 8px`. No shadow — elevation stays reserved for dialog, popover
   and sheet. A panel has an optional header (title 15px/600, one supporting
   line, actions at its edge) and footer.
2. **Ground.** The workspace ground is `sand`; panels are `paper`. No new
   chromatic token.
3. **The rail recedes** (amended 2026-10-04, below). A light rail on linen,
   `ink-2` labels, the open page on paper with a copper stroke. Every destination has an icon (lucide, already
   a dependency) and the three queues that hold waiting work carry a count:
   new leads, unconfirmed payments, renewals due. Counts come from the
   dashboard endpoint and the lead list the studio already loads; nothing is
   computed that the backend does not return.
4. **Page titles use the display serif** at 32px (26px on phones), with the
   one sentence that says what the page is for. This is the current
   operational title style alongside the display treatment for figures.
5. **Status is a filled wash with a dot**, radius-full, no border. The written
   label remains mandatory (WCAG 1.4.1).
6. **Filters are segmented tabs with counts** for the primary dimension
   (status), and compact drop-downs for secondary ones, in one toolbar at the
   top of the panel they filter.
7. **One action per row, at its edge.** A row shows a button only when it needs
   handling (confirm a payment, resend an invitation); everything else lives in
   an overflow menu (`RowMenu`, a Radix popover).
8. **People before identifiers.** A row that is about a person starts with the
   person: initials avatar, name, phone.
9. **Copper is the contact action.** Calling a lead or a student and confirming
   money received use `copper`; the screen's primary action stays `ink`.
   Copper and `danger` still never share a context.

## Consequences

- `PageHeader`, `Metric`, `StatusBadge`, `FilterBar` and `DataTable` are shared
  with the trainer and student apps. Their new look reaches those screens too;
  that is intended — the status vocabulary is one language across audiences.
- Reference screen B (`app/routes/staff/calendar.tsx`) is updated in the same
  change, as the Reconsideration process requires.
- No backend contract changes. Global search and notifications are not supported
  by the current API and are not built
  (`docs/OPEN_QUESTIONS.md`).

## Amendment — 2026-10-04: the quality pass

Applying `docs/UI_QUALITY.md` to all twenty staff screens found that the first
version added treatment the work had not earned. The resulting grammar is the
table at the end of that document. Changed:

- **The rail is light.** The dark rail was the highest-contrast mass on every
  screen: chrome advancing over the work. Queue counts are neutral figures.
- **The sample-data tag lives in the shell, once**, instead of in a different
  place on every page.
- **Figures of one period or object share one panel** (`StatGroup`/`Stat`),
  separated by hairlines. `Kpi` — one card per number with a tinted icon
  tile — is retired.
- **Copper is the single contact or money action of a screen**; in lists the
  same action is a secondary button, and a shown phone number is itself the
  `tel:` link.
- **Status only where it distinguishes**; roles are neutral text.
- **Secondary empty states and notes are one line**, placed beside the
  decision they explain.
