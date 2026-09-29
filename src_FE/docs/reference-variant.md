# Reference variant — Othership / Soul Pilates

Branch: `codex/ref-othership`, created directly from `main` (`9d64fb3`). This is an independent exploration, not a release candidate.

## Research before implementation

Source reviewed on 2026-09-27: [Othership home](https://www.othership.us/), at desktop and 390px mobile. The desktop opening is an immersive warm architectural field with a large serif promise, simple booking entry, then a distinct statement of the experience. Service choices are presented as substantial destinations with imagery and generous text, followed by a practice explanation. Mobile retains the immersive opening and turns booking into a persistent bottom path. The site also uses saturated accents and abundant social proof. Its sauna, cold bath, review count, press logos, benefits, durations, passes, retail and locations are specific to Othership and must not transfer to Soul.

The useful design language is **an arrival and a guided choice**: the visitor first imagines a session, then understands the two ways to participate, then sees how to begin. Soul needs a calmer, more precise version of this mood. Dark plum and warm cream create the atmospheric field; one restrained apricot accent identifies the next action. Vietnamese labels remain sentence case with readable diacritics. The brand and studio facts remain Soul's.

## Structural composition committed before code

```text
PUBLIC SHELL
  compact cream navigation / one consultation path / mobile menu
HOME
  immersive plum arrival: proposition + one real movement photograph in one frame
  short session journey: arriving / moving / choosing what comes next
  two substantial format destinations: group / private, each with a clear role
  practice chapter: real reformer action, adjacent explanation
  upcoming schedule: live data states remain functional
  first-visit steps and closing enquiry
SERVICES
  introduction as a choice between two experiences
  group: actual room photograph as evidence of equipment and scale
  private: single-person reformer photograph as evidence of one person's movement
  consultation route / link to live schedule
STUDIO
  room photograph as proof of the physical setting; no invented amenities
CONSULTATION
  functional form intact, stylistically part of the same public shell
```

## Image contract

| Frame                           | Role                              | Why here and at this size                                                                                   | Adjacent content                                   | Source / truth limit                                                                                                                                                   |
| ------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrival, `studio-12`            | Emotional anchor / body in motion | A large vertical subject completes the opening composition rather than landing below the introduction       | Proposition and enquiry                            | Owner supplied photo of a person on a Pilates chair. Do not call the apparatus a reformer or identify the person.                                                      |
| Group, `studio-17`              | Service explanation               | Room-scale image supports the description of a small-class setting                                          | Group format, capacity controlled by real schedule | Owner supplied image of the real same-owner studio, edited only to remove old equipment marks; it does not prove this is the final Soul room or a specific group size. |
| Private / practice, `studio-15` | Service / movement explanation    | Wide action frame shows one body using a reformer; does not pretend to depict a trainer or a private lesson | Private format and method explanation              | Owner supplied photo of a reformer exercise, edited only to remove the old equipment mark; alone it cannot prove 1:1 coaching.                                         |

No fabricated interior, coach, member, class crowd, testimonial, wellness benefit or amenity. If either logo removal fails fidelity review, the image is excluded; the layout must still stand. All edited assets are derivatives; original photos in `docs/thiet-ke/anh-studio/` remain intact. Prompts and output paths will be recorded after editing.

### Asset provenance and exact built-in edit prompts

- `public/images/studio/chair-extension.jpg` copies owner supplied `docs/thiet-ke/anh-studio/studio-12.jpg` unchanged.
- `public/images/studio/reformer-action-clean.png` derives from owner supplied `studio-15.jpg` via the built-in imagegen edit tool. Generated output `C:/Users/ASUS-PRO/.codex/generated_images/01a0e103-01cf-7de3-be68-f9869db925a5/exec-ebc6a9d1-d9fc-44f6-aa58-f46ff840279b.png`. Prompt: “Use case: precise-object-edit. Input image is the edit target: an owner-supplied documentary photograph of a woman extending across a Pilates reformer in a real studio. Remove ONLY the tiny old circular J brand mark at the lower center of the wooden reformer carriage. Reconstruct the plain wood grain and lighting naturally. Preserve the entire original photograph exactly otherwise: same person, face, body, pose, clothing, apparatus, room, curtain, shadows, color, lens perspective, framing and resolution. Do not add any words, logos, decor, people or equipment; do not beautify, regrade, relight or restyle. This derivative is for a truthful studio website image.”
- `public/images/studio/room-clean.png` derives from owner supplied `studio-17.jpg` via the built-in imagegen edit tool. Generated output `C:/Users/ASUS-PRO/.codex/generated_images/01a0e103-01cf-7de3-be68-f9869db925a5/exec-a7631375-ff8b-4e76-a303-c3bef3dcabfa.png`. Prompt: “Use case: precise-object-edit. Input image is the edit target: owner-supplied documentary portrait photograph of a real Pilates studio room with a row of reformers. Remove ONLY the tiny former J logos / circular brand marks printed on the visible wooden side rails of the reformer machines (especially foreground center-right and middle-left). Rebuild plain natural wood surfaces at those tiny locations. Keep everything else unchanged: room dimensions, window, ceiling lights, machines, quantity and positions, colors, wood grain, daylight, perspective and framing. Do not add people, decor, equipment, text, logos or amenities. Do not regrade, stylize or beautify. This is a truthful brand-mark cleanup for a studio website.”

Both final derivatives were visually inspected. They preserve recognizable room geometry and movement; the old logos are not visible. They remain owner source derivatives, rather than imagined stock scenes. Photo cropping and final placement still require screenshot review.

## Mobile translation

The arrival stays a single plum composition; copy leads into a nearly full-width vertical movement image. Format destinations become a vertical sequence, with actions inside each destination. No duplicated consultation button in the first viewport. Navigation becomes a proper menu, and the enquiry route stays reachable. At 390px, headings break by intended phrase, never into orphaned syllables. At 768 and 1024px, the layout switches only when the image and copy each have enough width.

## Quality gate and release limits

Reject the branch if images feel like independent inserts, if the old mark appears, if the live schedule or form becomes hard to use, if mobile navigation obscures the screen, or if the first fold has more than one competing primary action. Inspect full pages at 1440/1024/768/390 and first folds at 1440/390, then record a candid fit decision below.

Studio address, district, opening hours, phone, Zalo, map and operational details remain unconfirmed. The source photos depict the same owner's previous studio identity; they do not verify the exact future Soul environment. Backend schedule and consultation behavior must remain authoritative. No launch recommendation until factual debts are resolved.

## Review after implementation

The capture set covers Home, Services, Studio and Consultation at 1440/1024/768/390, plus first-fold images at 1440 and 390 (24 PNGs). Desktop shows a coherent plum arrival: the chair practitioner shares a single frame with the opening message, followed by a lighter orientation strip, two large format destinations and a real reformer action chapter. On 390px, the image stays within the opening field and the consultation action remains visible before it. The room image and reformer action each sit beside relevant content, rather than dropping into an empty gap.

After a script-only ESLint repair, `npm run verify` passed: 66 tests and the static build contract. The branch-local Playwright check passed all 16 route/viewport combinations with no overflow, broken images or duplicate H1, and exercised mobile menu navigation and empty consultation validation.

**Fit decision:** The experience-first structure is a strong candidate for Soul's calm premium direction. The very warm plum/peach color can make the studio seem more like a general wellness retreat than a precise reformer practice, and the copy cannot yet answer location, hours or phone questions. Keep it for comparison, not release. The room and chair are real same-owner archive photographs but have not been confirmed as the exact new branch environment.

## Soul palette transfer · 2026-09-30

This variant now uses the observed [Soul Đà Nẵng homepage](https://soulpilates.com.vn/) colour roles: cream #fff5ec, peach #fce5d1, copper #c97b4b, amber #d4a574 and chocolate #2c2319. Small action text uses #9a4e2d for legibility. The reference-specific layout and image sequence remain this variant's own experiment. This is a palette study for the owner's beige preference, not a brand/name transfer from the Đà Nẵng studio.
