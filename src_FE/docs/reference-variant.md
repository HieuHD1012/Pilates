# Reference variant — Barry's studio / arrival clarity

Branch: `codex/ref-barrys` (independent from `main` at `9d64fb3`). This is a
comparison experiment for Soul Pilates Nha Trang, not a proposal to copy Barry's
brand, names, copy, services or visual assets.

## Source observations before coding

Checked the current official [Newport Beach studio page](https://www.barrys.com/studio/newport-beach)
at 1440px and 390px, and the [Barry's homepage](https://www.barrys.com/),
27 September 2026. Local source captures: `barrys-ref-1440.png` and
`barrys-ref-390.png` (research files; excluded from the branch commit).

- The studio page names the *place* immediately over a location photograph, then
  offers the two plausible next actions for a first-time or returning visitor.
- A short, visible route bar follows the hero. Its location information is early:
  address, hours and parking precede the workout explanation.
- The later page shifts to a high contrast workout explainer, specific class
  structure, reassurance for beginners, amenities, and repeated booking paths.
- On a narrow screen these become a direct vertical sequence; the giant content
  volume and repeated booking prompts make the original page lengthy. Soul should
  retain the information ordering and reduce repetitions.

## Structural translation for Soul

```text
PUBLIC SHELL
  compact wordmark / six destinations / one consultation entry
HOME
  real movement photograph and studio identity in one edge-to-edge opening
  three direct route choices: studio / formats / first visit
  concise orientation with a direct contact path
  class formats: group and private, explained before schedule
  first visit: practical four-step path, with one practice photograph
  live schedule (real data states retained)
  final consultation entry
STUDIO
  real room opening + practical orientation
  what we know, what still needs confirmation
  contact route
CONTACT
  clear reachable consultation path before unresolved channels and location
CONSULTATION
  form retained, with context on what happens after submitting
```

Desktop: broad practice photo and typographic identity share the opening frame;
the route bar has three equal destinations. Below it, structured facts and
decisions use a consistent wide grid. Mobile: the home action photo and Studio
room photo each follow their own title in a bounded ratio; route choices stack
as full-width rows, facts become one column,
and the form remains a single-column transaction.

## Image decisions

| Image | Role | Why here / size | Relationship to adjacent content |
| --- | --- | --- | --- |
| `studio-15.jpg`, minimally cleaned derivative | Practice / emotional anchor | Large on home: a real person on a real reformer gives life to the opening and leads to the route choices. | Carries the first-visit proposition; the route bar immediately answers where to go next. |
| `studio-17.jpg`, minimally cleaned derivative | Place evidence | Large only on Studio, where the room itself is the visitor's question. | Leads into practical arrival information and contact. |
| `studio-12.jpg` | Practice evidence | Moderate portrait with the first-visit explanation; depicts a real person using a Pilates chair, not a reformer claim. | Shows the scale and posture of practice while the steps explain how to begin. |

The derivatives of `studio-15.jpg` and `studio-17.jpg` remove only the old J
marks on wooden equipment. They were generated with the built-in image editor
on earlier independent branches (`codex/ref-blok` and `codex/ref-surrenne`),
then reused here as cleaned versions of the same owner-supplied originals.
No facilities or people were added. The exact built-in edit prompts from those
branches were:

> `studio-15.jpg`: Use case: precise-object-edit. Input image: the supplied real Pilates studio photograph is the edit target. Remove only the small circular 'J' logo stamped on the wooden reformer carriage near the lower center of the image. Reconstruct plain matching wood grain and the same natural shading in that tiny area. Preserve every other pixel-level scene element as faithfully as possible: the same woman, body and face, clothing, exact exercise pose, reformer structure and straps, room, curtains, window light, camera angle, crop, color, sharpness, and photographic texture. Do not add a replacement logo or text. Do not stylize, beautify, retouch the person, alter equipment, or change composition. This is a minimal brand-mark removal for use as an authentic studio website photograph.

> `studio-17.jpg`: Use case: precise-object-edit. Input image: the supplied real vertical Pilates studio photograph is the edit target. Remove only the small circular 'J' logo printed on the wooden front reformer near the lower center-right of the photograph, and any other tiny visible 'J Pilates' marks on equipment. Reconstruct matching plain wood grain and natural lighting in those tiny areas. Preserve the same actual room, every machine, placement, camera angle, framing, color, window light, floor, curtains, and photographic texture. Do not redesign, beautify, add amenities, insert people, add text, or replace any equipment. This is a minimal old-brand removal for an authentic studio website photograph.

`studio-12.jpg` has no old signage. No captions are added to the page: meaningful alt text carries
accessibility while copy explains the experience.

## Claims deliberately rejected

No RED ROOM, treadmill, HIIT, showers, locker rooms, parking, towel service,
retail, nutritional bar, celebrity coaches, class duration, reviews, usage
metrics or Barry's prices. No old J address or phone crosses into the Soul
content model. Studio street address, opening hours, Zalo, map and phone remain
unconfirmed in `app/content/studio.ts`. This is an honest design limitation for
an arrival-oriented reference and will be evaluated after captures.

## Review after implementation

First desktop capture exposed a weak opening: using the room photograph on both
Home and Studio made the home hero look like an equipment showroom and repeated
the same visual. The actual practice photograph now opens Home; the room remains
the route subject on Studio. The first Studio capture also let the portrait source
expand the entire hero to an excessive height; the frame is now fixed to a
legible desktop stage. A story grid initially separated its heading and copy
into different rows; the final two-column composition keeps them together.

The final capture set is in `docs/reference-variant-captures/`: Home, Studio,
Contact, Consultation and Services at 1440, 1024, 768 and 390 pixels, plus
first-fold captures at 1440 and 390 for every route. At these 20
route/viewport combinations, Playwright found no horizontal overflow or broken
images. The 390px menu opened, navigated to Studio and closed; the empty
consultation form displayed validation. `npm run verify` passed (typecheck,
lint, tests, build, build contract, code content gate). The live schedule in
development remains explicitly marked as demo data.

**Fit verdict:** Barry's arrival-first information hierarchy is useful for
Soul: three clear next paths, an early route to Studio, and a practical first
visit explanation. The hard black visual language makes Soul feel more like a
high-energy gym than a calm, precise Pilates studio. More seriously, the
arrival-oriented Studio and Contact pages expose five unresolved real-world
facts (address, phone, hours, Zalo and map), which damages trust. Keep this
branch as a structure reference; do not recommend it as the lead luxury visual
direction or a release candidate until those facts are supplied and verified.
