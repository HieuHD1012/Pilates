# Photography direction, rebuilt from `main`

The 2026-09-26 owner clarification establishes that the supplied J Pilates
photographs show the same place and owner as the Soul-inspired branch. The name
differs because this product explores the identity for another branch. The
photographs can therefore represent this space; copy must still avoid inventing
trainer identities or services absent from the product brief.

## What the reference sites taught us

I inspected the live home screens of [Brick Pilates](https://www.brickpilates.com/),
[Nouva Pilates](https://nouvapilates.com/) and [KZ Pilates+](https://www.kzpilates.com/).
These are references for visual behavior, not templates to copy.

- Photography needs to occupy a decisive part of the viewport. An inset image
  surrounded by unrelated margins reads like a slide or article illustration.
- Human movement and the actual room perform different jobs. The first attracts
  attention; the second supports trust. Neither needs a visible caption when
  the adjacent text already supplies the context.
- One large frame carries more authority than many small frames. Pictures
  should change the page's spatial rhythm, while image-free sections keep the
  decision path legible.
- Full-bleed imagery works only when the body or apparatus survives the crop.
  Type remains on a solid field; the page does not dim a photo to rescue text.
- Photography cannot conceal weak material. The supplied room view is useful
  proof, but its fluorescent fixtures and crowded edges make it a secondary
  image rather than the site's first impression.

## Composition map

```text
Home opening: claim + action | full-height reformer practice (#15)
Formats: image-free decision between group and private
Method: full-height movement (#13) | explanation + three principles
Schedule and first visit: image-free operational content
Studio page: room explanation | real reformer room (#17)
Sign-in: task | quiet chair practice (#11) on large screens only
```

The four JPEGs are direct copies of supplied `studio-15`, `13`, `17` and `11`.
The other frames are excluded because of baked promotional text, a competing
logo, a weak subject, or no clear role in the public journey. Student photographs
are never substituted for trainer portraits. There are no visible image captions.
The image descriptions remain in `alt` for screen readers.

## Visual gate

- The opening image must meet the viewport edge, remain connected to the claim
  and show the body and reformer at desktop and mobile widths.
- The method image must make one field with its explanation, rather than sit in
  a reserved square.
- The room image must support the Studio copy without becoming the dominant
  brand impression.
- All public and sign-in routes must be checked at 1440, 768 and 390px for
  visible-image loading, horizontal overflow, crop and top-to-bottom rhythm.

## Review outcome

Thirty full-page captures (nine public routes and sign-in at three widths) are
stored in `docs/photo-review/`. The home and Studio images retain their intended
subjects at 1440, 768 and 390px. The sign-in image is deliberately absent below
the large breakpoint, where the form keeps the whole viewport. A browser check
of all thirty route/viewport combinations found no horizontal overflow or
broken visible images.

`npm run verify` passed: typecheck, lint, 66 unit tests, production build,
prerender contract and code content gate. Required contact facts remain missing
from the source data and are tracked separately in `src_FE/docs/OPEN_QUESTIONS.md`.
