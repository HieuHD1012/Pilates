# Pvolve Studios reference variant — preimplementation brief

Branch: `codex/ref-pvolve`, created independently from `main` (`9d64fb3`). This is an experiment in **method-first explanation**, not a Soul rebrand or an imitation of Pvolve's product.

## Source observations and limits

- Official [Pvolve Studios](https://studios.pvolve.com/) opens with a direct claim, then explains its method, signature class types, and studio experience. The official [Why Pvolve](https://www.pvolve.com/pages/why-pvolve) page gives its method three repeatable pillars and follows that with class choices. Their page puts explanation between the first impression and purchase path.
- Direct automated 1440 px and 390 px browser capture of `studios.pvolve.com` timed out on 2026-09-27. The hierarchy above is confirmed from the live official page's content; precise source breakpoint, spacing and type-size observations remain unverified. We will test **our** desktop and mobile translation, not falsely claim to have copied the source pixels.
- Pvolve's clinically proven outcomes, longevity statistics, Jennifer Aniston endorsement, proprietary equipment, class names, trainer credentials, and FSA/HSA programs belong to Pvolve. None enters Soul copy.

## Composition map before code

```text
PUBLIC SHELL
  clear wordmark / method + formats + schedule / one consultation action
HOME
  HERO: huge method-led proposition on light field | working body on Pilates chair
  PRINCIPLES: three short explanations on a unified field, no borrowed medical claims
  PROOF: real reformer action image beside explanation of how group/private choices differ
  FORMATS: two large destination panels with one line each and links to detail
  SCHEDULE: live status remains functional; compact, legible rows
  FIRST VISIT: short operational sequence
  CLOSE: one consultation invitation
SERVICES
  method-led opening, then clear Group / Private comparison, cancellation rules, schedule path
SCHEDULE → CONSULTATION
  preserve data, form and transaction behavior; visual continuity only
```

The ordering is the experiment. Main starts with editorial promise, then formats. BLOK starts with action, Surrenne with room, Tracksmith with a practice story. Pvolve begins with an **explainable teaching method**, then lets the visitor select the session type.

## Image decisions, set before implementation

| Frame | Role / why it exists | Position and size | Truth constraint |
| --- | --- | --- | --- |
| `studio-12.jpg` | Emotional evidence of deliberate, controlled movement | Within the hero's second column, tall portrait, visually joined to proposition | This shows Pilates chair, so adjacent words never identify it as reformer or a Soul trainer. |
| `studio-15.jpg` | Service evidence: real person working on a reformer | Wide image beside a concrete description of choosing a session | Original carries a tiny old `J` equipment mark. A minimally edited derivative removes it. No invented identity. |
| `studio-14.jpg` | Instructional evidence: complex movement needs control, not a decorative lifestyle photograph | Narrow image in the method story, integrated with text | This shows Cadillac/trapeze work, not a reformer. Copy stays equipment-neutral. |

Each frame relates directly to the neighboring sentence. There is no generic city strip or image after a completed CTA. Photos are owner supplied from a related branch's actual place; because the location identity of the Nha Trang branch is still unverified, no image is proof of a specific new address.

## Mobile translation

- Method proposition leads. The hero image becomes a short portrait frame immediately following the headline and primary CTA, not an unbounded image below the entire introduction.
- Three principles become one readable vertical list; Group and Private become separate full-width destinations without squeezed columns.
- Real schedule state, consultation form and nav remain functional. Nav closes on route change, and the mobile menu has one consultation action.
- Image cropping must keep the body and equipment readable at 390 px; no image is reduced to texture.

## Acceptance / rejection

Full-page and first-fold screenshots are required at 1440 and 390, full pages at 1024 and 768, plus no broken images, no horizontal overflow, working mobile menu and consultation form. Reject this branch as a lead direction if three principles look like a scientific report, if a chair/Cadillac is implied to be reformer, or if the real imagery does not make the method credible.

## Review after implementation

Home, Services, Schedule and Consultation were captured at 1440/1024/768/390, plus 1440/390 first folds (24 PNGs). The hero keeps its sentence and chair movement inside one split composition at desktop; mobile makes the proposition readable before the portrait image. The method principles form a short dark chapter, while service choice and live schedule retain distinct roles. The Cadillac photo is described as controlled movement, with no reformer claim attached to that frame.

After a script-only ESLint repair, `npm run verify` passed (66 tests, static build contract). Playwright checked all 16 route/viewport combinations: no horizontal overflow, broken image or missing image placeholder. It also exercised mobile menu navigation and consultation validation.

**Fit decision:** This is the clearest method explanation among the experiments so far, but the three-principle chapter is close to the clinical/report tone the owner dislikes. The first action still takes the visitor to consultation before they know how Group differs from Private. Keep it as a reference for concise coaching explanations, not as the leading visual direction. Five required business facts still block release; all source photos come from the same owner's related studio archive, not a verified new-branch shoot.

## Soul palette transfer · 2026-09-30

This variant now uses the observed [Soul Đà Nẵng homepage](https://soulpilates.com.vn/) colour roles: cream #fff5ec, peach #fce5d1, copper #c97b4b, amber #d4a574 and chocolate #2c2319. Small action text uses #9a4e2d for legibility. The reference-specific layout and image sequence remain this variant's own experiment. This is a palette study for the owner's beige preference, not a brand/name transfer from the Đà Nẵng studio.
