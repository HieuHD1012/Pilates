# Surrenne translation — `codex/ref-surrenne`

Source: [Surrenne](https://www.surrenne.com/en), reviewed at 1440px and 390px in September 2026. This branch starts at `main` (`9d64fb3`), not from the BLOK or mixed-photo implementation.

## Observed design language

- A centered masthead and a separate navigation line create a formal arrival before any sales copy.
- An architectural photograph owns the first screen. The site name is the only large text on that picture; an editorial proposition arrives after the image.
- The mobile screen protects the sense of place by keeping the image tall, then centers a serif statement beneath it. Activity and services are introduced later.
- Proportion, symmetry, quiet transitions and few asks create the premium impression. The reference's pool, membership offer and coral action are specific to that business and cannot transfer to Soul.

## Soul composition map

```text
MASTHEAD        Centered SOUL wordmark / account / one consultation action
NAVIGATION      Calm, separate line of public routes
ARRIVAL         Full-stage authentic room photograph; no sales headline layered on it
PROPOSITION     Centered Vietnamese serif statement + one paragraph
STUDIO          Room facts and material experience, then route to Studio
PRACTICE        Human-scale photograph where method becomes tangible
FORMATS         Two quiet choices, explained without decorative imagery
SCHEDULE        Actual data states, still readable and actionable
FIRST VISIT     Concise process / final consultation action
```

This differs from BLOK's photo-plus-solid-statement opening and colored service destinations. Surrenne's grammar is place before proposition, with a formal masthead and measured editorial pace. Soul will not pretend to have Surrenne's architecture: the actual studio is brighter, smaller and more practical. That tension is part of the evaluation.

## Image roles

| Asset | Role | Position and size | Reason |
| --- | --- | --- | --- |
| Owner-supplied `studio-17.jpg`, derived `room-architecture-clean.webp` | Physical place proof | One dominant opening frame; own full stage at both widths | It is the room the visitor may actually enter. A small former `J` mark was removed from the equipment; the scene was not replaced with a luxury pool. |
| Owner-supplied `studio-11.jpg` | Method and human scale | Later practice scene, separate from the arrival | A controlled movement on a Pilates chair; adjacent text does not call the apparatus a reformer. |
| Owner-supplied `studio-04.jpg` | Equipment/room continuity on Studio route | Wide center crop excluding embedded old-brand graphics | Supports the description of the physical room without asserting old address or hours. |

No captions or image-number labels appear in the product UI. Repeating the same room frame on each section would dilute its role, so it appears once in the main journey.

## Mobile behavior

The masthead becomes a three-part row: menu, centered wordmark, consultation path. The room image remains a tall frame; the editorial message follows rather than sitting on top. Service decisions and schedule rows become one reading column. The room photo's visible apparatus and old-brand removal must be checked at 390px before acceptance.

## Rejected source-specific claims

No pool, spa, membership qualification, luxury amenity, named treatment, sourced trainer identity, old J Pilates address, trial price, review or invented capacity. Soul's existing sand/ink/lacquer tokens remain.

## Visual review and decision

**Implemented as an independent comparison; reject as the lead luxury direction
with the current source photographs.** The grammar is coherent: the formal
two-row masthead, room-first arrival, centered editorial proposition, later
human-scale practice photograph and quiet service decisions form one reading
sequence. This is materially different from `main`'s opening text/image split
and BLOK's action-led, solid-statement stage.

The first desktop capture cropped too low, reducing the actual room to a row of
machines. Raising the crop restored its windows, columns and depth. The mobile
crop keeps the room legible and does not expose former branding. On the Studio
route the wide center crop of `studio-04.jpg` also excludes the embedded old
logo and address. No image appears merely because a section felt empty.

The remaining issue is intrinsic to the hypothesis: Surrenne's arrival depends
on an architectural setting that commands attention by itself. Soul's real
room is bright and functional, with visible storage and equipment; at desktop
the first viewport can read like an equipment showroom before the Pilates
proposition appears. Adding a pool, spa scene, or empty luxury interior would
misrepresent the studio. Further color and spacing changes would not solve
that mismatch. A new authentic room shoot with a more deliberate architectural
angle could justify reopening this branch. With current imagery, this variant
is useful for comparison but is not the strongest client-facing recommendation.

The first screenshot run failed to show the lazy-loaded practice image in its
full-page capture even though the image loaded when scrolled into view. The
capture script now scrolls each lazy frame into view before taking the shot;
the verified full-page captures show the image. The actual page's lazy loading
remains intact.

Functional checks covered home, formats, studio and consultation at 1440,
1024, 768 and 390: no horizontal document overflow, no broken images; the
mobile menu opens and hides the header's duplicate consultation action.
`npm run verify` passed after the capture-script lint fix (typecheck, lint,
66 tests, production build, nine prerendered routes, content code gate).

Representative captures: [desktop first fold](reference-variant-captures/home-fold-1440.png),
[mobile first fold](reference-variant-captures/home-fold-390.png),
[home desktop](reference-variant-captures/home-1440.png),
[home mobile](reference-variant-captures/home-390.png),
[formats desktop](reference-variant-captures/dich-vu-1440.png),
[formats mobile](reference-variant-captures/dich-vu-390.png),
[studio desktop](reference-variant-captures/gioi-thieu-1440.png),
[studio mobile](reference-variant-captures/gioi-thieu-390.png).
The folder also contains 1024px and 768px captures and the consultation route.

Soul's address, telephone, opening hours, Zalo and map URL remain unknown and
block release. Demo schedule/trainer data stays labelled. The owner must review
the cleaned room image before publication because image-generation can subtly
alter nearby details.

### Image edit provenance

Built-in `image_gen` was used in precise-object-edit mode on the real
`docs/thiet-ke/anh-studio/studio-17.jpg`. The resulting
`public/images/studio/room-architecture-clean.webp` is an encoded derivative
of its PNG output; the original source remains untouched. Final prompt:

> Use case: precise-object-edit. Input image: the supplied real vertical Pilates studio photograph is the edit target. Remove only the small circular 'J' logo printed on the wooden front reformer near the lower center-right of the photograph, and any other tiny visible 'J Pilates' marks on equipment. Reconstruct matching plain wood grain and natural lighting in those tiny areas. Preserve the same actual room, every machine, placement, camera angle, framing, color, window light, floor, curtains, and photographic texture. Do not redesign, beautify, add amenities, insert people, add text, or replace any equipment. This is a minimal old-brand removal for an authentic studio website photograph.
