# Reference variants: independent branches

The owner requested one branch per reference website. The earlier `codex/image-language-from-main` commit is a mixed image pass and **does not count as a reference variant**. These experiments branch independently from `main` (`9d64fb3`); none inherits another variant's layout or generated pictures.

The reference's color, words, photographs, trademarks, offers and amenities are never copied. Soul keeps its existing palette, Vietnamese content rules, API contracts and business facts. A branch translates a reference's **page composition, type hierarchy, visual rhythm, image role, navigation and mobile recomposition**. A changed photograph or a few CSS values cannot pass as a completed variant.

## Candidate branches

The first seven came from the cross-category shortlist in `codex/ui-screen-audit:docs/ui-audit/cross-category-inspiration.md`; the remaining five came from the later luxury/sport review. Equinox, BXR, KXU and THE WELL were screened but had weak captured first views or poor fit and are counterchecks rather than design candidates.

| Reference | Branch | Distinct structural hypothesis | Key public journey |
| --- | --- | --- | --- |
| [BLOK](https://www.bloklondon.com/) | `codex/ref-blok` | Full-bleed action-led opening, assertive sans proposition, rapid progression from activity to room to class choice. | Home → formats → schedule |
| [Surrenne](https://www.surrenne.com/en) | `codex/ref-surrenne` | Destination-first, architectural opening frame, sparse text revealed after the place. | Home → studio → contact |
| [Third Space](https://www.thirdspace.london/) | `codex/ref-third-space` | Performance and coaching evidence in separate strong scenes, with clear direct paths to a class. | Home → trainers → schedule |
| [Othership](https://www.othership.us/) | `codex/ref-othership` | Experience-first sequence, tactile atmosphere followed by an explanation of the visit and choices. | Home → services → first visit |
| [Barry's](https://www.barrys.com/studio/newport-beach) | `codex/ref-barrys` | Practical arrival and class information treated as premium trust content rather than footer metadata. | Studio → contact → consultation |
| [Pvolve Studios](https://studios.pvolve.com/) | `codex/ref-pvolve` | Method-first information architecture, then plainly differentiated session formats. | Home → method → services |
| [Tracksmith](https://www.tracksmith.com/) | `codex/ref-tracksmith` | Editorial story of a practice, alternating action, material detail and restrained copy. | Home → studio → services |
| [Remedy Place](https://www.remedyplace.com/) | `codex/ref-remedy-place` | The physical place anchors the offer; reservation is one unmistakable action. | Home → studio → contact |
| [Pillar Wellbeing](https://www.pillarwellbeing.com/clubs/raffles-london-at-the-owo) | `codex/ref-pillar` | Architectural symmetry, proportion and quiet reveal; room proof before a service claim. | Home → studio → services |
| [On Culture](https://www.on.com/en-us/explore/off-stories/culture) | `codex/ref-on` | Bold but clear text hierarchy plus action photography whose mobile crop retains its story. | Home → services → trainers |
| [1Rebel Clubs](https://www.1rebel.com/en-gb/clubs) | `codex/ref-1rebel` | Offerings are visually distinct and immediately scannable, with direct booking paths. | Services → schedule → consultation |
| [SATISFY Foundations](https://satisfyrunning.com/pages/foundations) | `codex/ref-satisfy` | A craft/material narrative: close-up evidence interrupts wide movement scenes with purpose. | Home → studio → method |

This is a comparison set, not a recommendation to publish 12 brands. Every candidate must preserve Soul's service truth and be rejected when its source grammar depends on facilities or imagery Soul does not have.

## Shared evaluation protocol

1. Before coding, save a branch-local brief: reference screenshots or live observations at 1440/390, composition map, page hierarchy, image roles, mobile changes, and prohibited source-specific claims. Explain why this is a materially different hypothesis from the other branches.
2. Implement the public shell and the relevant home/interior journey. Keep booking, schedule, auth and API behavior intact. Update functional pages only where navigation or visual continuity requires it. A one-page image swap fails.
3. Capture first viewport and full page at 1440, 1024, 768 and 390 for the home and changed interior routes. Check menu, consultation form, loaded/empty schedule and meaningful long text. Compare each branch against both its reference and the clean `main` baseline.
4. In a branch-local review, record what matched the source's design grammar, what was rejected for Soul, what still looks awkward, and whether the owner could truthfully send that page to a customer. Fix structural defects before calling the branch ready for comparison.
5. Run `npm run verify`. Keep temporary generated imagery visibly disclosed and blocked by `check:release` until approved studio photos replace it. Do not claim business launch readiness from visual tests.

**Reject a branch** when it differs from another mostly by colors, spacing, type size or image choice; when images do not prove adjacent copy; when the mobile composition is only a narrower desktop stack; or when the source's identity replaces Soul's.

## Clean `main` baseline

Nine public routes were captured at 1440 and 390 before creating any variant. The full-page captures are under [`baseline/`](baseline/). They show honest empty image slots, demo API data, and the starting hierarchy. Examples: [home desktop](baseline/home-1440.jpg), [home mobile](baseline/home-390.jpg), [services desktop](baseline/services-1440.jpg), [services mobile](baseline/services-390.jpg). All 18 baseline captures had no horizontal document overflow. This baseline is visual evidence, not an accepted final design.
