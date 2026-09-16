# Design direction — "Measure"

## How this was arrived at

The brief deliberately did not name a style. What follows is the reasoning, so
that a future agent can tell the difference between a decision and a habit.

### 1. What Soul already is

The existing site (soulpilates.com.vn) is the **Đà Nẵng** studio. Its brand DNA,
read honestly:

- warm, not clinical — a warm off-white ground and a warm accent;
- a serif with presence, set large, with an italic second line;
- the word _Soul_, and Pilates framed as care rather than performance;
- boutique scale, personal attention, premium price positioning.

That much deserves continuity. What does not:

- a single-page anchor site (`#why-pilates`, `#pricing`) with no real
  information architecture — it cannot carry a public schedule, packages,
  trainers, promotions and a consultation funnel, let alone SEO;
- the sequence hero → 4 cards → 4 cards → 3 milestones → 2 cards → pricing
  cards → testimonials → CTA, which is the default component-library rhythm;
- transformation copy ("You will be transformed", "Real people. Real results.")
  and emoji used as interface iconography;
- English-first copy for a Vietnamese studio;
- **Syne**, used for the largest numerals on the page, which ships **no
  Vietnamese subset** — verified against the Google Fonts API. The existing
  site's most prominent typography cannot set the language of its own market.

The last point matters: it makes replacing the type system an evidence-based
decision, not a matter of taste.

### 2. What the product actually is

A small studio in Nha Trang, one location, Group and Private classes only, one
trainer per class, selling packages measured in sessions with an expiry, and an
operational application where staff count seats, sessions, money and time.

Pilates itself is not about exertion. It is about **precision under control** —
alignment, breath, small ranges, calibrated spring resistance. It is practised
on a rail. Everything about it is measured and repeatable.

### 3. Directions considered and rejected

| Direction                                                              | Why rejected                                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Coastal Nha Trang — turquoise, light, wave motifs                      | Illustrates the location instead of interpreting it. Resort branding for a studio whose customers live there.                             |
| Quiet-luxury cream + elegant serif + sage + large wellness photography | The current default for the entire category. Would read as competent and anonymous, and depends on photography we do not have.            |
| Dark editorial fashion-film (cf. Heartcore)                            | Genuinely strong work, but its motion-blur, high-energy register argues the opposite of controlled movement — and it needs a film budget. |
| Clinical / rehabilitation-led, medical whites and blues                | Truthful about Pilates' rehab lineage, but it sells caution rather than care, and it kills the warmth that is real Soul DNA.              |
| Soft organic — rounded everything, warm gradients, blob shapes         | The house style of AI-generated wellness. Fails rule 21 of the brief on sight.                                                            |

### 4. The direction

> **Measure.** The design is built from ruled lines and aligned figures. Its
> luxury comes from proportion, restraint and exactness — the same qualities the
> studio sells.

Three concrete consequences, and they are the whole system:

1. **The hairline rule is the structural unit.** Content is ruled into rows and
   columns, not boxed into cards. The public site, the calendar, the session
   ledger and the booking screen are all the same object at different densities.
2. **Numerals are a design element.** Session balances, capacities, prices,
   times and report values are set in the display serif with tabular figures and
   optical sizing. This was forced by evidence — the UI sans has proportional
   digits and no `tnum`, and cannot align a column — and then adopted as the
   product's signature.
3. **One chromatic mark.** The page is paper, ink, photography and a single
   oxidised lacquer red. There is no second accent and no gradient.

_Measure_ also names the typographic measure: long-form text never exceeds
`--container-measure`. The constant is in the tokens.

### 5. Where Nha Trang appears

In light and material, not iconography. The ground is bleached plaster rather
than cream, the ink is a green-black shadow, and the accent is the dark red of
Vietnamese lacquer (`sơn mài`) rather than a wellness terracotta. There are no
waves, palms, shells or turquoise gradients anywhere in the system, and there
should never be.

### 6. Why this is right for this business

A studio that caps its class size is selling attention and exactness. A design
made of measured lines and precise figures argues the same thing before a word
is read — and it is the only direction of the five that translates without
distortion into a staff calendar, a session ledger and a payment record, which
is where most of this product lives.
