# Third Space reference variant — structural brief

Branch `codex/ref-third-space` begins at `main` (`9d64fb3`), independently of the BLOK, Surrenne and Tracksmith implementations.

Sources inspected on 27 September 2026: [home](https://www.thirdspace.london/) at 1440×900 and 390×844, [classes](https://www.thirdspace.london/classes/), and [personal training](https://www.thirdspace.london/personal-training/). Third Space opens with full-stage movement imagery, then separates class, facility and personal training pathways into strong visual modules. Its dark club, pool, spa, elite academy and broad workout catalog are its own facts, not Soul's.

## Composition map before coding

1. Compact public navigation and identity.
2. Practice opening: one large action frame as the visual subject; a separate solid field carries the Vietnamese proposition and consultation action. No text on a dimmed photograph.
3. Two clearly differentiated class paths, linked directly to Soul's real group/private formats.
4. Method as a second human action scene; the temporary conceptual image is plainly labeled and cannot serve as evidence of Soul's actual trainer or room.
5. Studio/place evidence as a third, bounded scene.
6. Practical schedule and first-visit path; final conversion.

Key journey: Home → trainers → schedule → consultation. Trainer roster remains API-driven. If it lacks a supplied portrait, a neutral empty portrait frame remains empty; the practice photograph must never become a surrogate trainer portrait.

## Image roles

| Image                                                                | Role                 | Why this position/size                              | Relationship                                                                                                |
| -------------------------------------------------------------------- | -------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Owner's `studio-15.jpg`, minimally cleaned existing derivative       | Hero action proof    | Largest first scene, full body and reformer visible | The adjacent solid-field proposition says what training format exists here.                                 |
| Temporary `hero-coaching.webp` from `codex/image-language-from-main` | Coaching concept     | Secondary landscape scene in the method module      | Illustrates one-to-one attention; it does not depict Soul's trainer or room and cannot publish as evidence. |
| Owner's `studio-17.jpg`, minimally cleaned existing derivative       | Physical place proof | Bounded room module, after class routes             | Shows the actual room, without invented luxury amenities.                                                   |

Only the generated coaching frame carries a discreet `Hình minh họa` disclosure; the real photographs have no caption labels. The first and third photographs were cleaned earlier with the built-in `image_gen` tool solely to remove tiny former `J` marks; originals remain in `docs/thiet-ke/anh-studio/`. Exact prompts and visual review will be recorded below after implementation.

## Translation limits

There is no confirmed trainer portrait, name, biography, equipment count, class capacity, pool, spa, nutrition practice, recovery service, or membership program to copy. Third Space's high-performance vocabulary may be inspirational; Soul's public claims must stay within the confirmed Group/Private reformer offer.

## Image provenance and temporary status

`reformer-action-clean.webp` derives from the owner's `studio-15.jpg`; `room-architecture-clean.webp` derives from the owner's `studio-17.jpg`. They were previously edited with the built-in `image_gen` tool solely to remove the old `J` equipment marks, then encoded to WebP. Both originals remain unchanged. Their final edit prompts were:

> Use case: precise-object-edit. Input image: the supplied real Pilates studio photograph is the edit target. Remove only the small circular 'J' logo stamped on the wooden reformer carriage near the lower center of the image. Reconstruct plain matching wood grain and the same natural shading in that tiny area. Preserve every other pixel-level scene element as faithfully as possible: the same woman, body and face, clothing, exact exercise pose, reformer structure and straps, room, curtains, window light, camera angle, crop, color, sharpness, and photographic texture. Do not add a replacement logo or text. Do not stylize, beautify, retouch the person, alter equipment, or change composition. This is a minimal brand-mark removal for use as an authentic studio website photograph.

> Use case: precise-object-edit. Input image: the supplied real vertical Pilates studio photograph is the edit target. Remove only the small circular 'J' logo printed on the wooden front reformer near the lower center-right of the photograph, and any other tiny visible 'J Pilates' marks on equipment. Reconstruct matching plain wood grain and natural lighting in those tiny areas. Preserve the same actual room, every machine, placement, camera angle, framing, color, window light, floor, curtains, and photographic texture. Do not redesign, beautify, add amenities, insert people, add text, or replace any equipment. This is a minimal old-brand removal for an authentic studio website photograph.

`hero-coaching.webp` is a generated concept reused from `codex/image-language-from-main`. Its original documentation records the scene brief as “quiet Vietnamese reformer coaching in a warm daylight studio,” with documentary/editorial photography, natural skin and material texture, no logos or text, and restrained warm neutral colors. The exact image-generation prompt text was not preserved on that branch, so this is the available prompt record rather than a reconstructed quotation. It is labeled `Hình minh họa` in the UI and must be replaced or approved before publication; its people and room are fictional.

## Review after implementation

Captures in [`reference-variant-captures/`](reference-variant-captures/) cover Home, Trainers, Schedule and Consultation at 1440, 1024, 768 and 390, with first viewport captures at 1440 and 390. The clean main baseline is on `codex/reference-comparison`.

- The full-stage real reformer photograph and dark proposition panel create one opening scene. The two class paths are large, direct and legible. Coaching and place become distinct later chapters instead of unrelated images stacked after the intro.
- Mobile recomposes the opening into action frame → concise dark statement → consultation button, all within the first 844px viewport. The generated coaching chapter is labeled inside its frame, not followed by a long gallery caption.
- The source's pool, spa, scale of facilities and performance-coaching claims were rejected. The actual Soul room remains a bounded place proof. The trainer route uses API data; missing trainer portraits remain neutral empty frames rather than borrowing the coaching concept image.
- **Candid judgment:** The first impression is strong, but Third Space's club scale is not a natural fit for a small Pilates studio. The conceptual coaching photograph visually differs from the real room. Until Soul supplies real coaching photography and verified trainer profiles, this branch should be treated as a design study, not a client-ready version.
- Release is also blocked by unconfirmed address, phone, opening hours, Zalo and map link, and by the demo schedule/roster seen in local development. Do not export these screenshots as evidence of real business operations.

`npm run verify` passed (66 tests, production build, nine pre-rendered public routes). A Playwright matrix of four routes × four widths found no horizontal overflow or broken images, and the 390px menu opened. The consultation route no longer repeats its own CTA in the header or mobile menu. `npm run check:release` remains red on five missing business facts and independently on the generated coaching asset.

## Soul palette transfer · 2026-09-30

This variant now uses the observed [Soul Đà Nẵng homepage](https://soulpilates.com.vn/) colour roles: cream #fff5ec, peach #fce5d1, copper #c97b4b, amber #d4a574 and chocolate #2c2319. Small action text uses #9a4e2d for legibility. The reference-specific layout and image sequence remain this variant's own experiment. This is a palette study for the owner's beige preference, not a brand/name transfer from the Đà Nẵng studio.
