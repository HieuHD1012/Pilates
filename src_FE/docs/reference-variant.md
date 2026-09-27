# Tracksmith reference variant — structural brief

Branch: `codex/ref-tracksmith`, created directly from `main` (`9d64fb3`).

Reference: [Tracksmith home](https://www.tracksmith.com/pages/home), [about](https://www.tracksmith.com/pages/about), and [journal](https://www.tracksmith.com/journal/stories), inspected 27 September 2026 at desktop and mobile. This is a study of editorial pacing around an actual practice, not a copy of its retail catalog, running claims, logo, or people.

## What carries across

- A brand is shown through people doing the activity, not through equipment alone.
- Opening image, short proposition, and chapter-like sequences keep a clear narrative path.
- Sport heritage comes from considered typography, a restrained palette, and evidence of routine. It does not require decorative race graphics or a fake heritage claim.
- The journal treats mundane repetition as meaningful. Soul can explain the movement and attention of a session with two real sequential frames, without asserting a personal story that was never supplied.

## Composition before imagery

1. Header: compact identity and clear route navigation.
2. Opening spread: type masthead, one large real reformer practice frame, adjacent specific proposition and one consultation action.
3. Practice chapter: two sequential real frames (same exercise, compressed and extended) with one explanation of control. They must read as a single visual sentence.
4. Format decision: group/private as two legible routes, followed by the live schedule in its existing four data states.
5. Studio chapter: actual room as evidence of where practice happens, with honest facilities copy.
6. First visit: practical steps and final consultation path.

Home → Hình thức tập → consultation and Home → Studio → consultation are the journeys to verify.

## Image role register

| Source                                                | Role                        | Position and scale                                     | Relation to adjacent content                                                                                                                                                 |
| ----------------------------------------------------- | --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `studio-15.jpg`, minimally cleaned derivative         | Hero / emotional anchor     | Wide image across opening spread, subject kept central | Immediately shows reformer practice; the adjacent sentence explains the small-format instruction. No caption.                                                                |
| `studio-11.jpg` and `studio-12.jpg`                   | Instructional sequence      | Equal-sized portrait pair in one chapter               | Same performer and apparatus moving from flexion to extension. Text explains control, without claiming the person is a Soul trainer or that this is a reformer. No captions. |
| `studio-17.jpg`, minimally cleaned derivative if used | Atmosphere / place evidence | One bounded studio chapter, never a second hero        | Shows the actual room while the adjacent copy explains its size and arrangement.                                                                                             |

The real source photos belong to the same owner/studio under the former name. The cleaned derivatives only remove the former J mark. This branch uses the same previously cleaned reformer asset as a shared source photograph; no layout or component is inherited from the BLOK branch. The original remains untouched. We reject `studio-04.jpg` because both its old logo and old street address are baked into the frame, and `studio-10.jpg` because an opening party cannot prove an ordinary class experience.

## Mobile rule

Keep masthead, action frame and consultation ask as one opening story. The two movement frames remain a pair with matched crops; they may stack only if each can be read without cutting off the body. Format links and booking states remain usable without hover.

## Honest limits

No quote, named trainer, membership club, community program, review, studio address, current phone number, price, or result claim is inferred from Tracksmith. The public operational routes and their API states remain intact. The final review below will record screenshot findings and suitability, rather than assume the reference succeeds.

## Source image provenance

The two derivatives were produced earlier with the built-in `image_gen` tool for the same owner photographs, then reused here as shared cleaned source assets. No image was generated from a written scene and no human, machine, or room was changed for this branch. The originals remain at `docs/thiet-ke/anh-studio/studio-15.jpg` and `studio-17.jpg`.

Final prompt for `reformer-action-clean.webp`:

> Use case: precise-object-edit. Input image: the supplied real Pilates studio photograph is the edit target. Remove only the small circular 'J' logo stamped on the wooden reformer carriage near the lower center of the image. Reconstruct plain matching wood grain and the same natural shading in that tiny area. Preserve every other pixel-level scene element as faithfully as possible: the same woman, body and face, clothing, exact exercise pose, reformer structure and straps, room, curtains, window light, camera angle, crop, color, sharpness, and photographic texture. Do not add a replacement logo or text. Do not stylize, beautify, retouch the person, alter equipment, or change composition. This is a minimal brand-mark removal for use as an authentic studio website photograph.

Final prompt for `room-architecture-clean.webp`:

> Use case: precise-object-edit. Input image: the supplied real vertical Pilates studio photograph is the edit target. Remove only the small circular 'J' logo printed on the wooden front reformer near the lower center-right of the photograph, and any other tiny visible 'J Pilates' marks on equipment. Reconstruct matching plain wood grain and natural lighting in those tiny areas. Preserve the same actual room, every machine, placement, camera angle, framing, color, window light, floor, curtains, and photographic texture. Do not redesign, beautify, add amenities, insert people, add text, or replace any equipment. This is a minimal old-brand removal for an authentic studio website photograph.

## Review after implementation

Screenshots: [`reference-variant-captures/`](reference-variant-captures/). There are full-page captures of Home, Services, Studio and Consultation at 1440, 1024, 768 and 390, plus first-viewport captures for all four routes at 1440 and 390. The clean `main` baseline is in `codex/reference-comparison`.

- **What translated:** The opening is a single image-and-statement spread, not a photo dropped below introductory copy. The two same-person Pilates chair photographs form a movement sequence in one chapter. Services is a readable choice page without a decorative photo pretending to explain group versus private training. Studio has one room image used as evidence of place.
- **Consultation continuity:** The consultation route keeps its practical form layout. Its header and mobile menu no longer repeat a consultation link to the page already open.
- **Distinct from other branches:** BLOK treats action as a bold campaign poster, and Surrenne asks the room to carry the opening. This branch uses an editorial masthead, practice spread, sequential movement, then decisions and practical information. Its mobile composition is deliberately re-ordered and shortened so the consultation button appears within the first 844px viewport.
- **What was rejected:** Tracksmith's clothing catalog, films, running culture copy, club/community claims, and old-world sport emblems. Soul does not have those products or evidence. The room is not presented as a luxury spa; it is shown only on the Studio route.
- **What still feels weaker:** The actual room photograph is useful proof but visually ordinary. At full mobile height it looked like an equipment listing, so its frame was reduced to 21rem. The chair sequence is truthful as a Pilates movement but cannot prove reformer coaching or trainer interaction. A commissioned shoot of a real lesson could improve that chapter.
- **Trainer identity:** If the API has no portrait for a named trainer, the trainer route shows a neutral empty frame. It must not reuse a movement photograph as if it identified that person.
- **Customer/owner judgment:** The branch is a credible visual direction for comparison and stronger than `main` for an initial prospective-customer impression. It is **not ready to send as a finished commercial site** until the studio supplies address, phone, hours, Zalo/map links and approves the old-mark cleanup. The visible demo schedule also needs a live backend before launch.

`npm run verify` passed: 66 tests, production build and nine pre-rendered public routes. A 16-combination Playwright check (four routes × four widths) found no horizontal overflow or broken images; the 390px mobile menu opened. The content gate still identifies five unresolved launch facts, which code cannot invent.
