# Reference variants: independent branches

## Soul palette pass across all 12 branches (2026-09-30)

The owner's approved direction is the warm beige, orange and brown language of [Soul Pilates Đà Nẵng](https://soulpilates.com.vn/). We read the homepage's computed tokens, documented the exact source values and accessible adaptations in [SOUL_THEME_TRANSFER.md](SOUL_THEME_TRANSFER.md), and applied them to all 12 separate branches. The shared tokens now use cream `#fff5ec`, peach `#fce5d1`, chocolate `#2c2319`, copper accents `#c97b4b` and legible action copper `#9a4e2d`. Branch-specific purple, green, gray and red color literals were mapped to the same family. Layout, image role and mobile composition remain specific to each reference study.

The [visual gallery](gallery.html) and [overview boards](GALLERY.md) now show newly captured 1440 px and 390 px first folds. Each branch also has a new full-page home capture at those widths. Browser captures found no horizontal overflow at either width. `npm run verify` passed on Tracksmith, the shared-token representative. The previous beige ranking below remains useful for composition, but its notes about *old colors* describe the 2026-09-27 state. Strong chocolate fields still make On, 1Rebel, Barry's and similar branches less beige-led than Tracksmith, Pillar and Pvolve.

This is a color-language pass, not a final J Pilates identity pass. The screenshot wordmark still reads Soul; the owner-supplied Nha Trang image archive says J Pilates. Studio facts and final name need confirmation before any branch becomes client-facing.

## Earlier brand correction and beige-first review (2026-09-27, before palette pass)

The linked [Soul Pilates website](https://soulpilates.com.vn/) identifies itself as the **Đà Nẵng** studio. Its current opening is a darkened room photograph with warm apricot type and actions; it is brand ancestry, not a beige template. The repository's owner-supplied [Nha Trang photo archive](../../../docs/thiet-ke/anh-studio/README.md) is labeled **J Pilates**. The earlier code brief nevertheless names `Soul Pilates Nha Trang`, so all 12 implemented screenshots show the wrong wordmark for the target studio. Preserve them as composition evidence, **not** as J Pilates brand-ready pages. Do not silently transfer Soul's name, Da Nang contact facts or class claims. The archive also mentions an address, while the app's studio-facts model calls the Nha Trang address unconfirmed; that conflict needs owner confirmation before public copy changes.

The owner favors beige. Reordering the **actual screenshots** by how well their composition lets warm beige, wood and skin tones carry a premium Pilates story gives:

| Order | Variant | Beige fit in the 2026-09-27 implementation | Decision at that time |
| --- | --- | --- | --- |
| 1 | Tracksmith | Large warm cream fields, ink type and controlled movement; the wood photograph belongs in the same palette. | Lead J Pilates composition candidate. |
| 2 | Pillar | Quiet cream architecture and deliberate proportion. | Strong beige study if the room can be photographed better. |
| 3 | Pvolve | Beige ground and restrained brown-red contrast. | Useful method clarity; simplify its report-like principle chapter. |
| 4 | Surrenne | Beige frame and calm spacing. | The utilitarian room image currently dominates; needs stronger real place proof. |
| 5 | Othership | Warm, inviting sequence. | Previous overall favorite falls here under the owner's beige preference because plum currently dominates; a palette change would be a new iteration, not what the screenshot already proves. |
| 6 | Remedy Place | Clear place-to-choice journey. | Dark panel and room image push beige to the edge. |
| 7–12 | On, SATISFY, Third Space, BLOK, 1Rebel, Barry's | Dark split fields or large black overlays dominate the first fold. | Keep their crop, image-scale, format-choice or arrival patterns as structure references, not the beige visual lead. |

Open the [beige-ranked visual gallery](gallery.html) or [two overview PNGs](GALLERY.md) to compare desktop and phone screenshots in that order. Beige should carry **space and warmth**, with enough dark ink to keep hierarchy legible; washing every surface into the same pale tone would lose the deliberate grid and the real photographs. Before a selected composition can become a J Pilates deliverable, update the global brand name, wordmark, metadata and copy, then recapture every public route. That rebrand has not been performed in the 12 reference branches.

The owner requested one branch per reference website. The earlier `codex/image-language-from-main` commit is a mixed image pass and **does not count as a reference variant**. These experiments branch independently from `main` (`9d64fb3`); none inherits another variant's layout or generated pictures.

The reference's color, words, photographs, trademarks, offers and amenities are never copied. The variants share the owner's requested Soul palette while preserving Vietnamese content rules, API contracts and business facts. A branch translates a reference's **page composition, type hierarchy, visual rhythm, image role, navigation and mobile recomposition**. A changed photograph or a few CSS values alone cannot pass as a completed variant.

## Candidate branches

The first seven came from the cross-category shortlist in `codex/ui-screen-audit:docs/ui-audit/cross-category-inspiration.md`; the remaining five came from the later luxury/sport review. Equinox, BXR, KXU and THE WELL were screened but had weak captured first views or poor fit and are counterchecks rather than design candidates.

| Reference | Branch | Distinct structural hypothesis | Key public journey |
| --- | --- | --- | --- |
| [BLOK](https://www.bloklondon.com/) | `ref/blok` | Full-bleed action-led opening, assertive sans proposition, rapid progression from activity to room to class choice. | Home → formats → schedule |
| [Surrenne](https://www.surrenne.com/en) | `ref/surrenne` | Destination-first, architectural opening frame, sparse text revealed after the place. | Home → studio → contact |
| [Third Space](https://www.thirdspace.london/) | `ref/third-space` | Performance and coaching evidence in separate strong scenes, with clear direct paths to a class. | Home → trainers → schedule |
| [Othership](https://www.othership.us/) | `ref/othership` | Experience-first sequence, tactile atmosphere followed by an explanation of the visit and choices. | Home → services → first visit |
| [Barry's](https://www.barrys.com/studio/newport-beach) | `ref/barrys` | Practical arrival and class information treated as premium trust content rather than footer metadata. | Studio → contact → consultation |
| [Pvolve Studios](https://studios.pvolve.com/) | `ref/pvolve` | Method-first information architecture, then plainly differentiated session formats. | Home → method → services |
| [Tracksmith](https://www.tracksmith.com/) | `ref/tracksmith` | Editorial story of a practice, alternating action, material detail and restrained copy. | Home → studio → services |
| [Remedy Place](https://www.remedyplace.com/) | `ref/remedy-place` | The physical place anchors the offer; reservation is one unmistakable action. | Home → studio → contact |
| [Pillar Wellbeing](https://www.pillarwellbeing.com/clubs/raffles-london-at-the-owo) | `ref/pillar` | Architectural symmetry, proportion and quiet reveal; room proof before a service claim. | Home → studio → services |
| [On Culture](https://www.on.com/en-us/explore/off-stories/culture) | `ref/on` | Bold but clear text hierarchy plus action photography whose mobile crop retains its story. | Home → services → trainers |
| [1Rebel Clubs](https://www.1rebel.com/en-gb/clubs) | `ref/1rebel` | Offerings are visually distinct and immediately scannable, with direct booking paths. | Services → schedule → consultation |
| [SATISFY Foundations](https://satisfyrunning.com/pages/foundations) | `ref/satisfy` | A craft/material narrative: close-up evidence interrupts wide movement scenes with purpose. | Home → studio → method |

This is a comparison set, not a recommendation to publish 12 brands. Every candidate must preserve Soul's service truth and be rejected when its source grammar depends on facilities or imagery Soul does not have.

## Final comparison (2026-09-27)

All 12 hypotheses were implemented as separate branches from the clean `main` ancestor, not as successive CSS skins. Each branch contains `src_FE/docs/reference-variant.md` with its structural brief, image roles, rejected source claims and candid post-implementation review, plus full-page captures at 1440/1024/768/390 and desktop/mobile first folds. The branch screenshots, rather than the source sites' marketing, are the evidence for these judgments. `npm run verify` and route/viewport browser checks passed for each branch. These results prove build and visual mechanics; they do **not** make the business facts or demo API data real.

Open the [visual gallery](gallery.html), its [two PNG overview boards](GALLERY.md), or individual screenshots before reading the verdicts below.

| Branch | What the structure contributed | Judgment for a small, premium Pilates studio |
| --- | --- | --- |
| `ref/blok` | Immediate, full-stage movement; fast path to classes. | Keep the image/body integration; the gym-like intensity is too forceful for Soul's calm coaching promise. |
| `ref/surrenne` | A deliberate room reveal and sparse destination rhythm. | Keep the restraint; the actual room and missing address cannot sustain a luxury-property opening. |
| `ref/third-space` | Separate scenes for movement and coaching with direct class paths. | Useful hierarchy, but scale implies a larger club; its fictional coaching picture is labeled and blocks release. |
| `ref/othership` | One enveloping opening, then visit orientation and clear formats. | **Strongest complete visual candidate** for a warm, calm first impression. Temper the retreat-like plum/peach styling and verify the pictured location. |
| `ref/barrys` | Arrival and first-visit information made prominent. | Keep its practical information architecture; hard black energy and missing place facts make it a poor luxury visual lead. |
| `ref/pvolve` | Method explanation before session choice. | Keep concise coaching language; its principle chapter approaches the report-like feeling the owner rejected. |
| `ref/tracksmith` | Editorial movement sequence connected to a real room and actionable formats. | **Strongest practice-story candidate**. The chair frames do not prove reformer coaching and the room photo needs a better shoot. |
| `ref/remedy-place` | Room-to-choice path with unambiguous reservation actions. | Sound conversion structure; the honest functional room photograph is not currently premium enough to anchor the whole brand. |
| `ref/pillar` | Symmetrical statement, architectural room frame, then movement. | Best quiet proportion study, conditional on stronger approved room photography and verified place facts. |
| `ref/on` | Short navigable stories and a robust mobile action crop. | Keep the crop discipline; three image cards resemble an apparel editorial and delay the class decision. |
| `ref/1rebel` | Group and Private as large, quickly scannable destinations. | Strong format navigation; hard black and repeated action image make it a structure reference, not a luxury lead. |
| `ref/satisfy` | Wide body → apparatus detail → real room, each image with a teaching role. | Strongest image-scale experiment, but the detail is a labeled generated concept. Use the pattern only after a real apparatus-detail shoot. |

### Recommendation for the next design decision

Under the owner's beige preference, start with **Tracksmith** and **Pillar** for the owner review; keep **Pvolve** as the more instructional option. Othership remains a useful warm sequence, but its current plum field is not a beige-led execution. Borrow the immediate Group/Private choice from **1Rebel** and the practical arrival content from **Barry's** only after selecting one page grid and image language. Test a single J Pilates prototype against the same screenshot gate. Do not spend more time polishing a branch whose main image cannot truthfully carry its headline.

Before a client-facing release, the studio must confirm address, phone, hours, Zalo and map URL; approve every old-mark cleanup and crop; provide a real trainer/lesson shoot and current operational data; and replace the labeled concept images on Third Space and SATISFY with approved studio photography. The concept-image release gate prevents accidental publishing of those two experiments. Captured demo schedules and trainer names are not proof of actual operations.

### Where to inspect the evidence

On each `ref/*` branch, read `src_FE/docs/reference-variant.md` and open `src_FE/docs/reference-variant-captures/home-first-1440.png`, `home-first-390.png`, `home-1440.png`, and `home-390.png`. BLOK, Surrenne and Barry's use `home-fold-*.png` for first folds. Home captures were renewed for the palette pass; interior-route captures still show the prior palette. Compare each full page to the baseline below. The captures reveal image roles, grid continuity, service choice position, mobile reflow and any visual debt much faster than CSS inspection.

## Shared evaluation protocol

1. Before coding, save a branch-local brief: reference screenshots or live observations at 1440/390, composition map, page hierarchy, image roles, mobile changes, and prohibited source-specific claims. Explain why this is a materially different hypothesis from the other branches.
2. Implement the public shell and the relevant home/interior journey. Keep booking, schedule, auth and API behavior intact. Update functional pages only where navigation or visual continuity requires it. A one-page image swap fails.
3. Capture first viewport and full page at 1440, 1024, 768 and 390 for the home and changed interior routes. Check menu, consultation form, loaded/empty schedule and meaningful long text. Compare each branch against both its reference and the clean `main` baseline.
4. In a branch-local review, record what matched the source's design grammar, what was rejected for Soul, what still looks awkward, and whether the owner could truthfully send that page to a customer. Fix structural defects before calling the branch ready for comparison.
5. Run `npm run verify`. Keep temporary generated imagery visibly disclosed and blocked by `check:release` until approved studio photos replace it. Do not claim business launch readiness from visual tests.

**Reject a branch** when it differs from another mostly by colors, spacing, type size or image choice; when images do not prove adjacent copy; when the mobile composition is only a narrower desktop stack; or when the source's identity replaces Soul's.

## Clean `main` baseline

Nine public routes were captured at 1440 and 390 before creating any variant. The full-page captures are under [`baseline/`](baseline/). They show honest empty image slots, demo API data, and the starting hierarchy. Examples: [home desktop](baseline/home-1440.jpg), [home mobile](baseline/home-390.jpg), [services desktop](baseline/services-1440.jpg), [services mobile](baseline/services-390.jpg). All 18 baseline captures had no horizontal document overflow. This baseline is visual evidence, not an accepted final design.
