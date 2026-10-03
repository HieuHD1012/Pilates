# ADR 0006 — The operational workspace: panels, a dark rail, and page titles in the serif

**Status:** Accepted · 2026-10-03 · amends the "Application" column of the
public → application table in `docs/REFERENCE_LOCK.md` and composition
principles 6 and 7 **for the staff area only** (`/studio/*` and the sign-in
threshold). The public site, the student app and the trainer app are unchanged
except where they share a primitive (noted under Consequences).

## Context

The owner reviewed the staff area and the sign-in screen and called them raw,
cramped, hard to read and unfriendly. That is the third trigger listed under
Reconsideration — testing exposes comprehension problems. An audit of all
fifteen staff screens, cluster by cluster, was prepared and reviewed as a design
canvas ("Soul Pilates — Đăng nhập và khu quản lý", 2026-10-03), and the owner
asked for it to be implemented.

The audit found six systemic causes, not fifteen separate ones:

1. The shell did not hold the page: a cream rail whose ground stopped short on
   long pages, a tiny wordmark, tracked group labels, no icons, and no count of
   waiting work.
2. Titles at 20px and dashboard figures without unit, context or destination.
3. Tables read as spreadsheets: distant columns, boxed 11px badges, a bordered
   button repeated on every row.
4. Filters heavier than the data they filter: a labelled select per filter.
5. Dead ends: the session ledger opened empty, payments named "Gói #2" instead
   of a person, a lead's page was only an edit form.
6. Density in the wrong place: a student's record confined to ~740px while
   calendar events crammed three facts into a 52px hour.

Hairlines alone could not separate a dozen concurrent tasks on one screen. The
lock already concedes this: "the rule is now no decorative elevation and no soft
rounded fills — not 'no containers'".

## Decision

1. **Panels.** Operational content groups sit in a `Panel` (`app/ui/workspace.tsx`):
   `paper` surface, a `rule` hairline border, and a new radius token
   `--radius-lg: 8px`. No shadow — elevation stays reserved for dialog, popover
   and sheet. A panel has an optional header (title 15px/600, one supporting
   line, actions at its edge) and footer.
2. **Ground.** The workspace ground is `sand`; panels are `paper`. No new
   chromatic token.
3. **The rail is dark.** `ink-deep` ground, `sand` text, `rule-dark` hairlines,
   `amber` for the active stroke. Every destination has an icon (lucide, already
   a dependency) and the three queues that hold waiting work carry a count:
   new leads, unconfirmed payments, renewals due. Counts come from the
   dashboard endpoint and the lead list the studio already loads; nothing is
   computed that the backend does not return.
4. **Page titles use the display serif** at 32px (26px on phones), with the
   one sentence that says what the page is for. This changes the Application
   column's "Display serif: figures only" to "figures and page titles".
5. **Status is a filled wash with a dot**, radius-full, no border. Badges were
   bordered rectangles at 11px; at a glance they read as inputs. The written
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
- No backend contract changes. Features the canvas showed but the API does not
  serve — a global search, notifications — are not built
  (`docs/OPEN_QUESTIONS.md`).
