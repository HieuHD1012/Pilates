# UI quality

How a screen is judged before it ships, above all on the operational surfaces
(staff, trainer, student apps). The visual language is in
`docs/DESIGN_SYSTEM.md` and `docs/REFERENCE_LOCK.md`; this document is about
reasoning. Adopted 2026-10-04 at the owner's request.

## North star

Calm, precise, task-first, productively dense. The shell recedes; the work
surface advances. Linear's current UI is a useful reference for hierarchy,
restraint and interaction grammar — not a layout or component template. The
studio's own semantics, workflows and permissions always win over visual
similarity.

## Reasoning process

When facing a screen, work in this order:

1. **Understand** — what is the user here to understand, compare, decide or
   do? What do the data, states and capabilities actually mean in the
   workflow?
2. **Rank** — what deserves attention first, second, last? What is merely
   orientation, what is active work, what is reference?
3. **Compose** — how should relationships, scan paths and hierarchy be
   organised across the whole screen?
4. **Subtract** — what is competing for attention without earning it?
5. **Calibrate** — are typography, spacing, contrast and proportions serving
   the intended hierarchy?
6. **Stress-test** — does this direction hold across other states, roles, data
   densities and related screens?

Do not start from components, patterns or reference screenshots. Start from
meaning.

## Principles

1. **Start from product meaning.** Understand the task and the real meaning of
   every piece of information before layout. Do not let API shape, component
   availability or visual convenience become the information architecture.
2. **Establish a clear centre of gravity.** Rank information by relevance and
   consequence; let visual weight follow that ranking across the whole screen.
   Primary work holds focus; context, metadata, navigation and chrome recede.
   Colour is information, not decoration: keep the baseline neutral so
   meaningful states can signal themselves with restraint.
3. **Express relationships before drawing containers.** Group with proximity,
   alignment, rhythm, type and surface first. Add borders, cards, dividers,
   backgrounds or elevation only when the relationship is unclear without them.
4. **Spend density on useful information.** Less competition, not less
   information. Compress where people scan, compare and repeat; give room where
   they must comprehend or make a consequential decision. No filler, decorative
   containers, redundant content or manufactured balance.
5. **Design the product as a system.** The same semantic role gets the same
   grammar — hierarchy, type, surface, interaction — while layout adapts to the
   task.
6. **Make interaction truthful, quiet and spatially stable.** Actions must be
   valid; decisions have a clear next step; hover never hides the only
   affordance; selection, expansion and loading keep spatial memory; feedback
   closes the loop without noise.
7. **Refine by subtraction and calibration.** When hierarchy is wrong, reduce
   the secondary before amplifying the primary. Stop adding treatment when the
   screen is already clear.

## Quality lens

Before shipping, blur the screen mentally:

- Is the intended work still the visual centre of gravity?
- Are related things grouped before they are decorated?
- Does anything attract more attention than its meaning has earned?
- Could removing treatment make the hierarchy clearer?
- If the visual hierarchy looks right, is the hierarchy itself based on the
  correct product meaning?

## Grammar on the staff surface (from the 2026-10-04 pass)

The system-level decisions this produced, so the next screen starts from them:

| Role                             | Grammar                                                                                                                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell (rail)                     | Light, recessive: linen ground, ink text, the active page on paper with a copper stroke. Queue counts are neutral figures. The sample-data tag lives here once, not on every page.                                                                             |
| Page header                      | Serif title, one line of purpose, actions at the right edge. No status, tags or notices in the action row.                                                                                                                                                     |
| Figures for one period or object | One panel, figures separated by hairlines (`StatGroup`). Not one card per number; no decorative icon tiles.                                                                                                                                                    |
| Status                           | Shown only when it distinguishes. A status every item shares (all "Đang bán") is noise. Roles are categories, not states: neutral text.                                                                                                                        |
| Row actions                      | One visible action only when the row needs handling; everything else in `RowMenu`. A row that opens something is itself the link.                                                                                                                              |
| Lists of comparable records      | Attributes people compare down the list get columns with a header from `lg` up; below that the row stacks in rank order. Never pile every fact into the left edge with one attribute alone at the far edge and empty space between (the 2026-10-04 lead list). |
| A status, a meter, a count       | Sits beside the thing it describes: a status after the name, a meter after its fraction, a queue count leading its label. Only a row's action (chevron, menu) belongs at the edge.                                                                             |
| Copper                           | The single contact or money action of a screen. In lists, the same action is a secondary button.                                                                                                                                                               |
| Phone numbers                    | A `tel:` link where the number is shown; no second "Gọi" button beside it.                                                                                                                                                                                     |
| Empty states                     | In a secondary panel: one line. A full empty state only where the empty thing is the page's subject.                                                                                                                                                           |
| Notes                            | At most one per screen, one or two lines, beside the decision it explains. Nothing that repeats what the screen already shows.                                                                                                                                 |
