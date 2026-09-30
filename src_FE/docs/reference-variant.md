# 1Rebel reference experiment — choose a session

Branch: `codex/ref-1rebel`, cut from `main` at `9d64fb3`.

## Observed source, 2026-09-27

- [1Rebel Workouts](https://www.1rebel.com/en-gb/concepts) presents six session concepts as distinct image-led choices, each with a short explanation and an action.
- [1Rebel Clubs](https://www.1rebel.com/en-gb/clubs) makes destination selection scannable with a filter, a visual card, and direct booking/detail actions.
- Desktop and 390px mobile captures of the Clubs page were reviewed after its cookie banner was dismissed. The useful principle is **make the choice visible before asking for a commitment**. The original high-intensity voice, multi-club inventory, offers, amenities and workout names do not describe Soul.

## Structural hypothesis before code

```text
OPENING      Short promise + real movement photograph in one split stage
DECISION     Two large visual destinations: Group / Private, with different reasons to choose
CLARITY      A direct comparison of coaching attention, sharing and first step
CONFIDENCE   Real studio room and an honest first-visit path
ACTION       Live schedule state / consultation
```

Unlike the main branch's long editorial sequence, this variant puts the service decision immediately after the opening. The same two destinations lead on the Services route. The visitor can choose without reading a method essay. One studio is shown; no invented location filter.

## Image contract

| Frame | Role | Placement | Truth limit |
| --- | --- | --- | --- |
| Real reformer action, owner supplied, old equipment mark minimally cleaned | Emotional anchor and evidence of reformer practice | Hero's right half, same stage as the proposition | One practicing person, not evidence of a group or named trainer. |
| Real reformer action, owner supplied, alternate crop | Movement evidence for private-format card | Tall card beside private explanation | One person practicing, not proof of a 1:1 coaching service. Repetition is a limitation of the available archive. |
| Real room, owner supplied | Physical environment evidence for group-format card and trust section | Card image and place panel | The related owner's prior studio; exact future Soul room/address is unconfirmed. |

No generated crowd, fictional instructor, testimonial or facility. The same-owner source relationship makes these images useful but does not prove a specific class service or new address. Alt text describes what the photo actually shows. No science-style captions in the interface.

## Mobile translation and acceptance

At 390px the opening has a short type stage followed immediately by its movement image. The two destinations become stacked, full-width choices with the action inside each. The format title, distinction and link must be visible without interpreting a photo. Navigation, schedule data states and consultation form remain functional. Inspect full pages at 1440/1024/768/390 and first folds at 1440/390; reject if a photograph becomes a floating section, the card images imply unsupported class claims, the text becomes illegible, or a viewport overflows.

## Review after implementation

Full-page screenshots cover Home, Services, Schedule and Consultation at 1440/1024/768/390; 1440 and 390 first folds are also saved (24 PNGs). The desktop opening combines its sentence and real reformer action in one split stage. Both formats are immediately visible after it as large image-led destinations. At 390px the opening sentence and action lead directly into the full-width movement image; each format becomes a complete vertical choice.

The first Services capture exposed a severe contrast bug: a broad `header` CSS selector painted the Services hero cream while its text remained white. The selector is now restricted to the public navigation header, and the Services first fold was recaptured and inspected. An unnecessary image label was removed from the Home hero because it read like a figure caption. The branch-local Playwright sweep then passed 16 route/viewport combinations: no overflow, broken image or duplicate H1, and the 390px menu opens, navigates and closes. `npm run verify` passed after moving the work back to the clean-main branch; a final run followed the stylesheet naming cleanup.

**Fit decision:** 1Rebel's quick offer selection translates well to Soul. The hard black field is energetic, and the same real reformer action has to appear both in the opening and the private card because the supplied truthful archive has no second compatible format photograph. That repetition limits polish. The group room image proves equipment and setting, not an actual class; the private photo proves a person practicing, not one-to-one instruction. This is a strong navigation reference, not the lead luxury direction or a release candidate while the five business facts remain unconfirmed.

### Asset provenance

The room and Pilates chair frames copy the same owner's source archive (`docs/thiet-ke/anh-studio/studio-17.jpg` and `studio-12.jpg`); the reformer action is a minimally cleaned derivative of `studio-15.jpg` from the BLOK experiment. Its edit removed only the previous tiny J mark on the reformer carriage and reconstructed the wood grain; pose, equipment, room and light stayed intact. The original photograph remains untouched. The group card uses the room frame, while the private card and opening reuse the real reformer action at different crops. No generated picture is used in this variant.

## Soul palette transfer · 2026-09-30

This variant now uses the observed [Soul Đà Nẵng homepage](https://soulpilates.com.vn/) colour roles: cream #fff5ec, peach #fce5d1, copper #c97b4b, amber #d4a574 and chocolate #2c2319. Small action text uses #9a4e2d for legibility. The reference-specific layout and image sequence remain this variant's own experiment. This is a palette study for the owner's beige preference, not a brand/name transfer from the Đà Nẵng studio.
