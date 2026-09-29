# BLOK translation — `codex/ref-blok`

Source: [BLOK London](https://www.bloklondon.com/), reviewed at 1440px and 390px in September 2026. This is an independent branch from `main` (`9d64fb3`). It does not inherit the prior image pass.

## Observed grammar

- The opening screen is activity before explanation: a single image occupies the whole stage, with a very large, compact sans statement and a direct action.
- Navigation gives classes and schedule equal prominence to brand. The mobile crop keeps the working body as subject.
- The page descends from physical activity to class selection; the decision path is short. The visual weight comes from scale and strong editing, not a collection of small photographs.

## Soul composition map, before implementation

```text
HEADER         SOUL / Studio / Hình thức tập / Lịch tập / ...
OPENING        Single real reformer-action photograph + solid ink statement field
ORIENTATION    Short proposition: what Soul offers, direct class-choice path
FORMATS        Two large, clearly different entry panels with their own explanations
METHOD         One working-body photograph + precise movement explanation
SCHEDULE       Real API states, with a clear route to the full calendar
ARRIVAL        First-visit steps, shortened visually, no invented testimonial
FINAL ASK      One contact route
```

The solid text field replaces BLOK's type over a very dark photograph. Soul's real action image is bright and has no safe text region. Darkening or cropping a blank area for type would fail the project's P1 rule. The image and statement still share one opening stage.

## Image decisions

| Image | Role | Why here / size | Relation to copy |
| --- | --- | --- | --- |
| Owner-supplied `studio-15.jpg`, derived `reformer-action-clean.webp` | Action and real reformer proof | Dominant opening scene, full body and apparatus visible at both widths | Supports the claim that visitors will train on a reformer; a small former `J` mark on the carriage was removed with imagegen, then encoded to WebP |
| Owner-supplied `studio-11.jpg` | Movement and control example | Secondary portrait-scale scene in method section | Supports the generic method discussion; it shows a Pilates chair, so adjacent copy must not call it a reformer |
| Owner-supplied `studio-04.jpg` | Physical room proof | Wide crop on Studio route, excluding old J Pilates logo and old address | Shows the equipment and room, not a claim about new Soul address |

No other photographs are added just to balance empty space. The existing source photos contain the previous studio identity in several frames, so only compositions that completely exclude that graphic are usable. The owner says it is the same place and owner under a different name; this is not evidence that the old address or opening hours apply to Soul.

## Mobile recomposition

The working body occupies the opening screen before the copy panel, rather than being reduced to a thumbnail beside text. Class choice becomes two full-width paths. Schedule rows remain functional at 390px, and the mobile menu remains a real navigation overlay.

## Deliberate rejections

- No borrowed BLOK copy, prices, trial offer, studio count, palette or brand mark.
- No implied high-intensity class, changing room, club amenities or trainer identity.
- No unsourced Soul testimonials or numerical class capacity.

## Difference from `main` and other hypotheses

`main` opens with a light editorial text block and narrow empty image column. This branch starts with full-stage action and a heavy sans information field. Class choice moves forward and is rendered as large destination panels rather than a ruled text comparison. It is a performance-led hypothesis; it is intentionally different from the architecture-first Surrenne/Pillar and method-first Pvolve hypotheses.

## Visual review

The first capture exposed a real discontinuity: the action-led upper page fell
back into `main`'s small schedule table and four tiny introduction rows. Both
were recomposed. Schedule now has a larger section heading and more row rhythm;
first visit is a two-column progression on desktop and a single reading path on
mobile. The practical schedule remains less expressive than the opening scene,
because dates and availability have to remain readable rather than performing
as a campaign headline.

At 1440 and 390, the reformer body remains visible in the opening image, the
solid ink field holds all text without dimming the photograph, and the separate
Pilates-chair photograph appears only next to method copy. The studio photograph
is deliberately a wide center crop: neither the old logo above nor the old
address below enters the 1440 or 390 compositions. It should be checked again
if that frame's aspect changes. There is no image between the format panels,
because another image would not add evidence to the group/private distinction.
The first-fold mobile inspection caught a former `J` mark on the reformer that
was easy to miss in a scaled full-page capture. The cleaned derivative was
made with the built-in imagegen tool using a precise-object-edit instruction:
remove only the circular mark, reconstruct the local wood grain, preserve the
person, pose, light, room, equipment and crop, add no replacement mark. The
original `studio-15.jpg` remains intact in the repository's source-photo folder.
The edit should be accepted by the owner before publication because it is a
derived image and image-generation output can alter nearby detail subtly.
That same first-fold inspection also exposed an unnecessary white image label.
It was removed; the context is already in the headline and service copy. The
mobile visual height was reduced so the booking action appears sooner without
cutting the working body or reformer out of view.

The final mobile crop is shifted toward the left of the source frame. This keeps
both feet and the reformer carriage visible at 390px instead of cutting one leg
at the screen edge. The action is now legible in the first viewport together
with the primary consultation action.

Representative captures: [desktop first fold](reference-variant-captures/home-fold-1440.png),
[mobile first fold](reference-variant-captures/home-fold-390.png),
[home desktop](reference-variant-captures/home-1440.png),
[home mobile](reference-variant-captures/home-390.png),
[formats desktop](reference-variant-captures/dich-vu-1440.png),
[formats mobile](reference-variant-captures/dich-vu-390.png),
[studio desktop](reference-variant-captures/gioi-thieu-1440.png),
[studio mobile](reference-variant-captures/gioi-thieu-390.png).
The capture folder also holds 1024px and 768px versions and the consultation route.

### Image edit provenance

Built-in `image_gen` was used in precise-object-edit mode on the real
`docs/thiet-ke/anh-studio/studio-15.jpg`. Its output was encoded as
`public/images/studio/reformer-action-clean.webp` (100,400 bytes); the original
source remains untouched. Final prompt:

> Use case: precise-object-edit. Input image: the supplied real Pilates studio photograph is the edit target. Remove only the small circular 'J' logo stamped on the wooden reformer carriage near the lower center of the image. Reconstruct plain matching wood grain and the same natural shading in that tiny area. Preserve every other pixel-level scene element as faithfully as possible: the same woman, body and face, clothing, exact exercise pose, reformer structure and straps, room, curtains, window light, camera angle, crop, color, sharpness, and photographic texture. Do not add a replacement logo or text. Do not stylize, beautify, retouch the person, alter equipment, or change composition. This is a minimal brand-mark removal for use as an authentic studio website photograph.

Functional checks covered home, formats, studio and consultation at 1440, 1024,
768 and 390: no document overflow and no broken image in 16 route/viewport
combinations; mobile menu opens. Production verification passed (typecheck,
lint, 66 tests, build, prerender contract and code content gate). The build
contract's homepage-copy assertion was updated to the branch's new headline.

This is a credible direction for a more energetic Soul, though it makes a
stronger fitness statement than the quiet `main` direction. It remains a
comparison branch, not a publishing recommendation. Soul's address, telephone,
opening hours, Zalo and map URL are still unknown; demo schedule/trainer data
is still labelled. The two unused photograph slots remain pending rather than
being filled with unrelated imagery. A final release needs confirmed studio
facts and an owner review of the photograph crops and consent.

## Soul palette transfer · 2026-09-30

This variant now uses the observed [Soul Đà Nẵng homepage](https://soulpilates.com.vn/) colour roles: cream #fff5ec, peach #fce5d1, copper #c97b4b, amber #d4a574 and chocolate #2c2319. Small action text uses #9a4e2d for legibility. The reference-specific layout and image sequence remain this variant's own experiment. This is a palette study for the owner's beige preference, not a brand/name transfer from the Đà Nẵng studio.
