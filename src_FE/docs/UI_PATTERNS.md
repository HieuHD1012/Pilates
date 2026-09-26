# UI patterns

The canonical implementations. Read the nearest one before inventing.

## Page openings

- **Public** — `<PublicPageHeader label title lede aside>`, then `<TickRule>`.
  Every non-home public page uses it. Repetition is the rhythm.
- **Operational** — `<PageHeader title description actions meta>`. Small title,
  one orienting sentence, screen actions on the right, and a `meta` row of
  ruled figures. An admin screen with a 48px headline wastes the row a studio
  manager needs.

## Sections

`<Section index="01" label="…" tone="sand | deep | ink">` — a hairline, a serif
numeral, a sentence-case label. Never a card.

## Lists and tables

Ruled rows, no borders around the outside, no zebra striping.

```tsx
<ul className="rule-t">
  <li className="rule-b grid grid-cols-[…] items-baseline gap-4 py-4">…</li>
</ul>
```

Below `md`, dense tables become ruled lists (`WeekList` beside `WeekGrid`).
Never shrink a desktop table onto a phone.

## Status

`<StatusBadge tone="neutral | positive | attention | critical | info">` always
carries a written label; the dot is a redundant cue. Colour alone never conveys
state.

`<CapacityMeter booked capacity>` writes the fraction and draws a hairline meter
under it.

## Numbers

`<Figures>` and `<Figures display>`. See `docs/DESIGN_SYSTEM.md` for why.

## Remote states

Four, always: `SkeletonRows` → `ErrorState` → `EmptyState` → content, with
`RefreshingRule` for background refetches. Existing data stays on screen while
new data loads.

## Mutations

The pattern established by Reference C (`app/routes/student/class-detail.tsx`):

1. State the consequence before the action — what is deducted, and what the
   balance becomes, shown as `4 → 3`.
2. State the exit terms before entry — when this stops being refundable, in the
   backend's numbers.
3. Confirm destructive or transactional actions in a `Dialog`.
4. `<Button pending>` keeps its label; a button that swaps its text mid-mutation
   loses the user's place.
5. Announce the outcome through `<LiveRegion>`.
6. Render the backend's refusal as a sentence, via the eligibility copy map.
7. Replace the action with the result state — never leave a "Book" button next
   to "Booked".

## Photography

`<ArtDirectedImage photo="hero">` renders a selected frame from
`app/content/photography.ts`. Give each frame a semantic role and size it for
that role. Keep text on a solid surface and describe the image in `alt`; visible
captions are optional and are not needed for the current compositions. See
`docs/photo-direction.md` for the source selection and visual gate.

## Unknown facts

`<PendingFact label="Địa chỉ studio" />` renders "Đang cập nhật". Never invent a
value to make a layout look finished.

## Never

Card grids as a default · pills (except avatars and status dots) · decorative
shadow · emoji as iconography · a second icon family (Lucide only) · KPI tiles
that no one acts on · charts that answer no question · all-caps Vietnamese ·
`window.alert`.
