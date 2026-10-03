# Pearl-inspired reference variant

Branch: `ref/pearl`. Source: [Pearl Pilates Nitra](https://www.pearlpilatesnitra.sk/). This is a composition study for the Nha Trang studio, not a copy of Pearl's business claims, palette, photographs or brand. The source research and comparison with ELLA live in `ref/comparison` at `docs/reference-variants/ELLA_PEARL_BRIEF.md`.

## Structural hypothesis

Pearl's useful idea is a calm, practice-led opening with generous negative space, followed immediately by an understandable choice of class. This version uses a full-body reformer movement in a broad arch beside the invitation. The arch repeats on the Studio and Services openings, while the sections below use solid fields and a stable grid. The owner-preferred Soul cream, peach, chocolate and copper palette replaces Pearl's color direction.

1. Light compact navigation; one consultation action in the hero.
2. Practice-led split hero: statement, action and real reformer photo in one viewport on desktop and phone.
3. Group and Private as two substantial choices directly below, with no redundant image in either card.
4. Method chapter: a paired chair exercise sequence showing change in position.
5. Real room photograph in a later place-proof chapter, beside studio information.
6. Live schedule, first-visit explanation and final consultation path.

The Services and Studio routes use their own text/photo openings. The consultation form and dynamic schedule retain their contracts and states.

## Image role register

| Owner image | Role | Why it sits here |
| --- | --- | --- |
| `studio-15.jpg`, minimally cleaned derivative | Practice and service proof | Full-body reformer movement beside the offer, then on the Services route. Crops keep body and machine legible. |
| `studio-11.jpg` and `studio-12.jpg` | Movement explanation | Two phases of the same chair exercise, treated as one paired composition, without a scientific caption. |
| `studio-17.jpg`, minimally cleaned derivative | Place proof | Room photo in the studio chapter and on Studio route, where a visitor asks what the actual space looks like. |

The derivatives only remove the old small J equipment mark; the scenes remain unchanged. No Pearl photography, pricing, testimonials, team identity, self-training, Mat or Barre offerings were transferred.

## Visual quality gate

The first desktop and mobile captures were inspected as whole pages and first views. The image, copy and consultation action share the opening composition. I removed a decorative image label after review because it made the photograph feel like an exhibit. The mobile menu check exposed a real issue: backdrop blur on the sticky header made the fixed menu panel calculate zero height. Removing that backdrop blur restored the panel.

Home, Studio, Services and Consultation were captured at 1440, 1024, 768 and 390 px, with first-view captures at 1440 and 390 px. No horizontal overflow or broken image was found, and the mobile menu opens. The owner room photograph is honest but visually functional; a commissioned room photograph would improve the premium impression. Final studio name and public contact details remain unconfirmed. The app still displays the `Soul Pilates Nha Trang` placeholder while the owner archive identifies J Pilates.

`npm run verify` passed with the bundled Node 24 runtime: typecheck, lint, 66 tests, production build, nine prerendered routes, build contract and content code gate. The five unresolved business facts remain launch blockers, as reported by that gate.
