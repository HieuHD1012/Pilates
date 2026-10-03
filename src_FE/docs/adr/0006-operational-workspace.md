# ADR 0006 — Isolated operational composition

Status: implemented as the review version on `codex/admin-composition`, 2026-10-03.

## Evidence and scope

The user explicitly requested a separate worktree from Claude and a redesign of
sign-in and every admin screen, calling the current interface crowded, raw and
hard to use. That request authorizes reconsidering the operational composition.
This record does not claim that a design canvas was approved or that customer
usability testing has occurred. The starting snapshot is commit `d4dd038`.

The audit covers 18 staff destinations and three authentication destinations,
plus student-record tabs and operational dialogs. Public marketing composition
is outside this redesign; the earlier cluster corrections are inherited.

## Decisions

1. Keep cream, warm brown and copper tokens. The staff rail stays warm and light;
   it is not the dark rail proposed by the inherited draft. A paper context bar
   identifies the current task and account; active links use fill plus text.
2. Bound actual tasks with paper panels, hairline borders and the existing 8px
   operational radius. No ornamental shadows, stock photographs or fake charts.
3. Page title and orientation precede a compact summary. Independent facts use
   label-over-value groups. Tables remain tables where cross-record comparison
   is the task; mobile lists carry equivalent facts.
4. Dashboard: four measured quantities with units and explicit destinations;
   chronological classes and outstanding attendance form separate work groups.
   Unknown values stay unknown. No revenue metric is invented.
5. Calendar: readable day groups by default, optional time-grid view on desktop.
   Phones and tablets select one day from the week, reducing long list scrolling.
   Week stepping belongs to the calendar toolbar, separate from class creation.
   The optional grid is keyboard-scrollable; its time scale leaves space for
   trainer names rather than cropping them. Class rules stay backend-owned.
6. Student record: identity and package health in parallel at wide widths,
   stacked on mobile. Commerce, history and contacts are distinct task groups.
   STAFF still has no access to progress photos or admin account controls.
7. Enquiry: incoming information and editable follow-up sit in separate panels.
   A converted enquiry keeps its student relationship, rather than offering a
   status form that can regress it to “contacted”.
8. Renewal list: per-person forms open in labelled dialogs instead of occupying
   every row. Follow-up date remains visible in the list. The same append-only
   endpoint and null-date semantics are retained.
9. Ledger landing: choose student, then their package, on the page. Fetch packages
   only after choosing a student; never select an arbitrary package by default.
10. Account actions: visible invitation action when needed; overflow contains
    secondary access controls. Locking still requires a consequence dialog and
    authoritative server confirmation.
11. Authentication: brown brand field and bounded form on desktop; compact brand
    header and form on mobile. Password reveal retains native autocomplete and
    paste. No fake registration, SSO, notifications or global search.
    Reset-password guidance now agrees with the existing 10-character minimum
    in both frontend validation and the backend auth schema.

## Sources and interpretation

- [Carbon data-table guidance](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines): relate toolbar, actions and data; choose density for the actual task.
- [GOV.UK password input](https://design-system.service.gov.uk/components/password-input/): password reveal, autocomplete, and safe input attributes.
- [NN/g cards](https://www.nngroup.com/articles/cards-component/): group related heterogeneous information as a readable unit.

These sources inform task structure; they do not establish that beige, a serif,
or this particular layout is “luxury”. Visual judgment still needs owner review.

## Verification

See `docs/thiet-ke/admin-composition/AUDIT.md` and the before/after gallery at the
repository root. Automated accessibility checks complement visual and flow
review; they are not a usability study or proof of improved conversion.
