# Reference Lock

## Accepted identity and layout

The owner-confirmed product is **J Pilates Nha Trang**. Preserve the approved
public layout and warm beige/copper/brown palette. Use `J Pilates` in copy and
metadata, `J PILATES` in the wordmark and `J` in monogram slots.

The reference screens are the current public homepage, staff calendar and
student class detail. The token source is `app/styles/app.css`; use existing
primitives in `app/ui/` and the [Design System](DESIGN_SYSTEM.md).

## Typography and colour

- Newsreader for editorial/display text and comparable tabular figures;
  Be Vietnam Pro for body text and controls. Both fonts are self-hosted.
- No all-caps Vietnamese. Keep stacked diacritics readable and within the token
  scale. Diacritic-bearing text never uses weight 300 below 15px.
- Cream/beige public grounds, warm brown ink and copper accents. The app uses
  ink primary actions; semantic status colours remain separate.
- Keep token roles and accessibility requirements. Decorative `ink-3` and
  `copper-bright` are not body text colours.

## Composition

- One main subject and one primary transaction per screen; facts required to
  make a decision remain visible.
- Public sections share the twelve-column grid and established heading/content
  relationships. Keep current intentional photo bleeds and focal points.
- Independent facts keep labels beside or above their values. Package options
  group credits, price and validity. Session lists read time, class, trainer,
  availability and action in order.
- Public controls use the existing small radii and hairline structure; elevation
  is reserved for dialogs, popovers and sheets.
- Staff screens use the accepted bordered paper panels with 8px radius, dark
  grouped navigation and readable filters. All destinations and logout remain
  reachable through the labelled mobile navigation dialog.
- Preserve the existing responsive hierarchy. Do not introduce a separate
  visual direction screen by screen.

## Imagery and honest content

Six owner-authorized concept photographs in `public/images/concept/` are
interim assets. The footer discloses them once; no overlaid documentary captions
are used. No fictional trainer identity appears on the trainers page.
`npm run check:release` fails while concept images are referenced.

Replace these with approved photographs of the actual studio before launch.
Recheck each crop at 390/768/1024/1440px. `app/content/photography.ts` contains
rendering data only. Missing facts remain governed by `CONTENT_DEBT` and the
[release checklist](RELEASE_CHECKLIST.md); do not invent content.

## Interaction

Use the declared interaction and reveal easing curves. No bounce, parallax or
scroll hijacking. Public reveals apply only to secondary elements on narrative
pages, once per page load, on eligible desktop pointers. Text, headings, prices,
times, availability and actions remain immediately visible. Reduced motion,
no JavaScript and unsupported browsers must retain visible content.

A booking, payment or attendance success requires backend acceptance. Explain
its consequence before submission; preserve pending/error/retry states.

## Reconsideration

Revisit the accepted design when brand assets, studio photographs, user
comprehension, Vietnamese typography or accessibility provide concrete evidence
that a change is needed. Record the decision, update this lock and affected
tokens, check the three reference screens, then propagate consistently.
Historical research and rejected variants are retained on legacy branches.
