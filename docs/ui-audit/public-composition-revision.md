# Public site composition revision

The earlier audit was too permissive about rendered composition. The screenshots in `screenshots/composition-before/` show the problem: a large photograph was accepted because it was an authentic file, even when its placement made it an orphan block. This revision treats the public studio site as a service website with a conversion job. The operational app still needs a denser workflow layout.

## Structural map before implementation

```text
Home
  Navigation
  One hero grid: proposition + action | photograph + specific caption
  Service choice: group | private
  Method: one argument + three short supporting points
  Next classes: explanatory copy | live schedule
  First visit: four steps
  Consultation action and footer

Studio
  One intro grid: claim about the room | photograph of equipment + caption
  Explanation of the room's layout
  Three operating principles

Services
  One intro grid: difference between formats | photograph of reformer practice + caption
  Group and private comparison, with cancellation terms
  Consultation action
```

The same 12-column content grid, gutter, heading scale and caption treatment must govern all three openings. Every image is attached to a piece of copy in the same section. No full-width photograph is inserted between unrelated sections. The schedule, packages and contact pages stay data-first and do not receive decorative photos.

## Image roles

| Asset | Role | Why here | Size and relationship |
| --- | --- | --- | --- |
| `hero` | Emotional and physical proof of controlled movement | The person and Cadillac apparatus make the proposition visible. | Right side of the home hero, within the same grid as headline and CTA; caption names the scene. |
| `room` | Material evidence of the studio space | Shows a real piece of equipment, without pretending to show the entire room. | Right side of the Studio intro; caption identifies the ladder barrel. |
| `practice` | Service explanation | Shows a student working on a reformer, the apparatus named by the two formats. | Right side of the Services intro; caption ties it to the formats below. |
| `method` | None on these public routes | The frame shows a chair rather than the reformer service being compared. | Removed from the Services page; retained in the asset library for a future page where it has an explanatory role. |

## Visual acceptance criteria

1. The hero's text and photograph must occupy one layout unit at desktop and remain adjacent in reading order on mobile.
2. All public openings use the same left edge and a deliberate 6/5 or 5/6 column relationship; images never introduce an unrelated narrower axis.
3. Main public headings use one restrained scale. A section heading cannot leap back to near-hero size unless it begins a new decision.
4. Body text remains readable against the schedule and rule-based content; rules organize content but do not turn the whole service page into a dense admin table.
5. Each photograph has a visible, truthful caption and a semantic role. Removing the photograph must not leave an empty frame or a gap.
6. Inspect full-page renders at 1440, 768 and 390px, including pages without images, before accepting the revision. Screenshots show layout quality, not conversion impact.

## Implemented and reviewed

- [Home before](screenshots/composition-before/home-1440.png) → [Home after](screenshots/composition-after/home-1440.png): the proposition, actions and Cadillac scene now form one hero grid. The picture has a visible caption. Section headings and spacing no longer jump between two unrelated scales.
- [Studio before](screenshots/composition-before/about-1440.png) → [Studio after](screenshots/composition-after/about-1440.png): the ladder barrel sits beside the introduction. The oversized, unrelated second photograph is gone.
- [Services before](screenshots/composition-before/services-1440.png) → [Services after](screenshots/composition-after/services-1440.png): reformer practice sits beside the explanation of the two class formats. The chair photo and its empty adjacent column are gone.
- [Trainers before](screenshots/composition-before/trainers-1440.png) → [Trainers after](screenshots/composition-after/trainers-1440.png): a trainer with no supplied portrait has a text profile, without a fake image frame. A real supplied portrait still renders beside its own profile.

The [complete after set](screenshots/composition-after) covers all nine public routes at 1440, 768 and 390px. Their recorded document widths equal their viewport widths at all 27 combinations. In particular, the 768px [home capture](screenshots/composition-after/home-768.png) keeps both hero actions on one line and the [390px capture](screenshots/composition-after/home-390.png) keeps the copy, actions and image in reading order. The photograph-free package, schedule, promotions, contact and consultation pages retain the shared left edge and section rhythm without decorative imagery.

At 1440px, Home's rendered document is 3678px tall instead of 5026px, Studio 1843px instead of 2956px, and Services 1938px instead of 2797px. Shorter height is a consequence of removing disconnected image blocks and oversized gaps; it is not the quality metric by itself. The remaining service copy, form and schedule content were preserved.

`npm run verify` passed: 66 unit tests, typecheck, lint, production build, build contract and code content gate. The content gate still lists missing address, phone, opening hours, Zalo and map data as release blockers; these are studio facts, not layout defects. No conversion or user research result is claimed from these screenshots.
