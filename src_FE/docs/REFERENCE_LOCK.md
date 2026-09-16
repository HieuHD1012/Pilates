# Reference Lock

Accepted. Changing anything here requires the process in §"Reconsideration"
below — not a preference.

## Primary inspiration

Contemporary editorial and architectural print practice: content ruled into
fields, a strong text serif set light at display size, generous quiet, and small
tracked labels carrying the structure. Not a website genre — a printed one.

## Secondary references and what each solved

| Reference                                                               | Taken                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heartcore (weareheartcore.com) — SangBleu Sunrise + a tracked wide sans | Confirmation that a distinctive text serif plus disciplined micro-type reads premium in boutique fitness without decoration. Their photographic register was rejected. |
| Editorial/architectural layout practice                                 | Hairline rules and offset column structure as the composition system.                                                                                                  |
| Premium transactional products (booking, reservations)                  | State the transaction's consequence before the commit; never optimistically confirm a seat.                                                                            |
| Vietnamese lacquerware (`sơn mài`)                                      | The accent: a deep oxidised red against near-black and pale ground.                                                                                                    |
| Donny Trương, _Vietnamese Typography_                                   | Diacritic quality as a primary type-selection criterion, and the case against all-caps Vietnamese.                                                                     |

## Preserve from Soul

Warmth in the ground; a serif with presence; an italic line as a rhetorical
gesture; the word _Soul_ set light with open tracking; Pilates framed as care.

## Evolve

The serif moves from heavy display drama to a light editorial register. Warmth
moves from tan/terracotta to plaster + lacquer. The single page becomes a real
information architecture.

## Reject

Anchor-only navigation · card-grid section rhythm · transformation copy ·
invented testimonials and star ratings · emoji as iconography · Syne and any
face without a Vietnamese subset · pill buttons · gold · glassmorphism ·
decorative shadow · English-first copy.

## Media strategy

Authentic Nha Trang photography only: the studio's own room, equipment, trainers
and students. Every slot is specified as a brief in `app/content/photography.ts`
before a picture exists, and renders a quiet placeholder that reserves the exact
frame. **The layout must look finished with the placeholders in place** — if a
composition needs a photograph to work, the composition is wrong.

Never: yoga stock, AI-generated people, transformation before/after, tropical
tourism imagery, influencer fitness photography, or another branch's pictures.

## Type strategy

- **Newsreader** (variable, `opsz` 6–72) — display, editorial passages, and every
  tabular figure. Verified: Vietnamese subset, `tnum`, monospaced lining digits.
- **Be Vietnam Pro** — all text and UI. Verified: Vietnamese subset with `locl`,
  `ccmp`, `mark`/`mkmk` for correct stacked diacritics. Verified to have **no**
  `tnum` and proportional digits, which is why numerals live in the serif.
- Display weights are 300–400. Weight is never how importance is signalled.
- **No all-caps Vietnamese.** Micro-labels are sentence case with open tracking.

## Colour strategy

Ground `--color-sand` (public) / `--color-chalk` (app). Ink `--color-ink`, a
green-black. Hairlines `--color-rule`.

**One BRAND mark: `--color-lacquer`.** It is the only decorative colour, and it
appears at most once per page as an action, plus as the "today"/active marker.

Separately, four **semantic** hues (`success` / `warning` / `danger` / `info`)
carry status and nothing else. They are data, not decoration — a schedule row
legitimately shows three of them at once. Do not describe this system as
"single-accent": it is one brand mark plus a status palette, and the two never
share a context (which is why the app's primary button is `ink`, not `lacquer`).

Full palette and measured contrast ratios: `docs/DESIGN_SYSTEM.md`.

## Composition principles

1. Rules, not cards. A border-box needs a reason beyond "grouping".
2. Sections open on a hairline with a numeral and a sentence-case label.
3. Twelve-column grid; content is offset, not centred, unless centring is the point.
4. Long-form text is capped at the measure.
5. Repetition is the rhythm. Not every section gets its own invention.
6. Square corners for structure; 2–3px only on controls; pills only for avatars
   and status dots.
7. Elevation only for dialog, popover and sheet.

## Interaction principles

One easing curve (`--ease-measure`), 120–560ms. Rules draw in; nothing bounces,
nothing parallaxes, nothing hijacks scroll. The public surface may reveal; the
operational surface responds instantly and gets out of the way.
`prefers-reduced-motion` is honoured globally in `app/styles/app.css`.

## Public → application translation

|                | Public                                                                 | Application        |
| -------------- | ---------------------------------------------------------------------- | ------------------ |
| Ground         | `sand`                                                                 | `chalk` / `paper`  |
| Display serif  | Headlines and editorial                                                | Figures only       |
| Density        | Editorial, generous                                                    | Compact, scannable |
| Primary action | `lacquer`                                                              | `ink`              |
| Motion         | Reveals allowed                                                        | Feedback only      |
| Shared         | Rules, tokens, figures, micro-labels, status vocabulary, form language |

## Reconsideration

Revisit only on evidence: real brand assets contradict it, real studio
photography fails in the system, testing exposes comprehension problems, the
public direction will not translate operationally, the system needs repeated
exceptions, Vietnamese typography fails, or accessibility cannot be maintained.

Then: research → critique → update this file → update tokens → update the three
reference screens → propagate. Never screen-by-screen drift.

---

## What actually reads as premium (externally anchored, 2026-08-18)

The first review of this design compared it only against one other candidate,
using criteria written by its own author — which pre-decided the answer. It was
re-run with the two candidates hidden among three real trading businesses
(Aman/Amanoi, Equinox, Heartcore) plus the Đà Nẵng ancestor, blind-labelled, and
with **no checklist supplied**. Four judges ranked the six on perceived price
tier, a named customer's likelihood to make contact, execution craft, and
memorability.

Two findings are worth more than the ranking, because they are countable rather
than a matter of taste.

**1. Perceived price tracks the number of separate solicitations on the first
screen — almost exactly.**

| First screen  | Asks                                          | Price-tier rank |
| ------------- | --------------------------------------------- | --------------- |
| Amanoi        | 1 (`Reserve`)                                 | 1               |
| This design   | 1 sentence + 1 button                         | 2               |
| Heartcore     | modal + cookie bar + `BOOK CLASS`             | 3               |
| Equinox       | 1 button, but a dollar figure in the headline | 4               |
| Sibling build | 2 buttons, the louder one says _miễn phí_     | 5               |
| Đà Nẵng       | `BOOK NOW` ×2 + Pricing tab + rating strip    | 6               |

> "Effort to convert reads as need, and need reads as negotiable price."

So: **one ask per screen.** Keep the header CTA or the hero CTA, not both.

**2. The things this system treats as premium signals are not what separates the
set.** In the judges' words: _"What does not produce it: cream, serifs, thin
all-caps letterspacing, generous whitespace. [The sibling] has all four and reads
mid-market. [Equinox] has none of them and reads top-tier."_

What did separate it: whether **one element is allowed to own the screen with
nothing layered over it**. Amanoi gives a photograph the fold and adds no
headline. Equinox bleeds an image to all four edges and drops one axis of type
onto a region cropped to receive it. This design gives one sentence a size
nothing else competes with. Every page below that line interposes something —
Đà Nẵng dims its own studio so a headline can sit on it, which _"stops being a
photograph and becomes a texture."_

### The honest caveat about this design

It placed 2nd, 2nd, 3rd and 2nd — the only page top-three on all four questions —
**with half its hero missing**. The judges were explicit that this flattered it:

> "The empty well is drawn to the same precision as everything else… so it reads
> as a considered void rather than a hole; a real photograph would have competed
> with the type, and its absence let the sentence run at a size that is the
> single best thing on the page. Absence bought it calm it has not earned."

Two consequences for whoever fills those slots:

- **The calm may not survive the photograph.** When real imagery lands, re-run
  the hero at full width and be prepared to reduce the display size rather than
  assume the composition still holds.
- **Emptiness flatters only the aesthetic questions.** On the customer question
  this design placed _second_, behind the sibling, and the stated reason was the
  blank grey box — _"exactly the sloppiness I've been burned by."_ A missing
  photograph of your own studio makes a visitor doubt the schedule is real too.

### The tension the studio owner has to resolve, not us

Đà Nẵng is the only page in the set carrying hard evidence of a business that is
open today — its own floor, countable reformers, daylight, an accumulated rating
— and it ranked **last** on perceived price. _"Proof of trading cost it status."_
Restraint and reassurance pull in opposite directions here. This repository
optimises for restraint; that is a defensible default for a premium boutique, but
it is a business decision and should be put to the studio rather than assumed.

---

## Direction v1 — what is locked, and the one thing that is frozen

### Five locked foundations

True regardless of what the photo shoot returns. That is the only bar for being
locked here.

1. **Two typefaces split by role**, editorial voice against operational UI. The
   _requirement_ is that comparable numbers use a face with `tnum` and uniform
   digit widths; that the display serif currently carries them is an
   implementation and **is revisable if the sans is replaced**.
2. **No all-caps Vietnamese.** Carve-out: the Latin wordmark.
3. **Contrast comes from size and tone, not weight.** Three weights (300/400/500)
   is the default, not a permanent ban — dense operational UI is exactly where
   weight can carry meaning faster. Plus the diacritic weight floor.
4. **The 4px spacing scale**, plus the declared 2px optical tier.
5. **Content honesty**, meaning all of P3 including the build gate.

### Provisional — re-derive after the hero is decided

Two things below were measured on a first viewport that is 37.5% empty
placeholder. The discipline holds; the numbers do not yet.

- **One chromatic colour per viewport.** A photograph is a colour event. The
  question after the shoot is whether `#8a3324` survives beside a warm frame, and
  how the four semantics behave over an image. Worth asking too: the brand colour
  appears about once a page and is deliberately not the product UI's primary
  button — what job is it doing?
- **Hairline as the sole structural device.** `0` cards is a measurement, not a
  reason, and it is the one keep that fought the evidence: stating offer,
  location, capacity and first step as a legible unit needs a boundary. The rule
  is now **no decorative elevation and no soft rounded fills** — not "no
  containers".

### Frozen: one item

**The final H1 display size, and with it the hero type-to-image balance.** The rag
defect (`435 / 436 / 547px`) is deliberately left unfixed because rag follows
size. Everything else that was previously frozen is not blocked: image aspect
ratios and the 21/9 band height are already declared in
`app/content/photography.ts` and reserved by `ArtDirectedImage`, so an arriving
frame cannot move the geometry.

### Hero: A ships, B is a challenger with a written win condition

Direction A (typography-led) is the decision. Confidence medium-high.

Not because B might not be better, but because B's premise did not hold. "Trust
is the weakest measured dimension" was never measured — the four rated axes were
price tier 2nd, likelihood-to-contact 2nd, **craft 3rd**, memorability 2nd. And B
is the wrong pattern by this document's own table: the price-tier winner gives a
photograph the fold and adds _no headline at all_, which Soul cannot use because
Soul needs the sentence to say what, where and how many; the configuration Soul
would actually build — image bled to four edges, one axis of type dropped into a
cropped region — ranks 4th of 6. Both 91–93% benchmarks are also Latin script
with no stacked marks, so their fold geometry does not transfer to `ế ộ ữ ằ` at
56–72px over photographic detail.

B becomes eligible only after that test passes on a real frame. And the hard part
of image-led is the composition, not the asset: the predecessor holds the best
real photograph in the sample and finished last on price tier.
