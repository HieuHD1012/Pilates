# Pearl reference variant — structural brief

Branch: `ref/pearl-atmospheric`, created directly from `main` (`9d64fb3`). It does not inherit
any layout from the twelve `ref/*` branches or from Codex's `ref/pearl` study; it
copies only the four already-cleaned owner photographs from `ref/tracksmith`.

Reference: [Pearl Pilates Nitra](https://www.pearlpilatesnitra.sk/), first-view captures at
1440 and 390 plus computed styles in
`ref/comparison:src_FE/docs/reference-variants/source-research/pearl-*`. This is a study of
Pearl's _atmosphere and page grammar_, not of its brand, pearl emblem, class menu, team,
prices, parking offer or booking provider.

## What carries across

- **Light before photography.** Pearl opens on an almost empty, pale satin field with very
  soft diagonal light, not on a photograph. The first impression is calm material, and the
  photographs are kept for the chapters that need proof.
- **Ruled micro-labels.** Two stacked eyebrow lines, each led by a thin horizontal rule, then
  a widely tracked values line and a soft pill note. The headline is quiet; spacing does the
  work.
- **Frosted, very round surfaces.** Cards are translucent cream with a soft inner highlight and
  a ~40px radius, sitting on a warm ground. Chocolate is the single solid accent (buttons,
  quote panel, selector, booking band, footer).
- **A guided choice.** Pearl asks three questions to point a visitor at a class. For a studio
  with exactly two formats and a consultation step, a small guide is a genuinely useful
  translation, as long as it only routes to pages that exist and promises nothing.
- **Long, calm page rhythm.** Introduction → place → offer → team → quote → guide → practical
  booking and contact, with generous negative space between chapters.

## How it differs from the other twelve branches

Every earlier branch opens with a photograph or a type masthead over a ruled ground. This is
the only study whose first fold carries **no image at all**: the brand is a CSS light field,
type and two actions. Its surfaces are rounded and translucent where the repository's
"Measure" system is square and ruled, and it is the only branch with an interactive,
client-side format guide. That makes it a real alternative hypothesis — "tactile calm" — not
a re-skin. The risk, recorded honestly below, is that it moves toward the "soft organic"
wellness look that `docs/DESIGN_DIRECTION.md` rejected.

## Composition before imagery

1. **Header** — transparent over the light field, larger `SOUL` wordmark with a small Latin
   sub-line, small centred nav, solid chocolate rounded "Đặt lịch tư vấn" on the right.
   On Home the header ask appears only after the hero leaves the viewport (P2: one ask per
   viewport). Phone: wordmark, booking pill once scrolled, hamburger.
2. **Hero (~100vh desktop, 844px phone)** — layered radial/linear gradients in cream, peach
   and white with two soft diagonal "satin folds" and one blurred warm light pool on the
   right. No pearl, no sphere, no image file. Left column: two ruled eyebrows
   ("Studio Pilates reformer tại Nha Trang", "Lớp nhóm nhỏ · Lớp riêng"), a display-serif
   `h1` from the existing voice ("Không tập nhiều hơn. Tập đúng hơn."), the tracked values
   line taken from the existing method notes (**Hơi thở — Căn chỉnh — Kiểm soát**), a pill
   with a true system fact (first step needs no account), a solid chocolate primary and an
   outlined secondary ("Xem lịch tập").
3. **Orientation strip** — a translucent frosted strip overlapping the hero's lower edge with
   two counted facts that the app already defines: the number of formats in
   `CLASS_FORMATS` (2) and one responsible trainer per class (stated on the Studio and
   Trainers routes). No invented metric.
4. **Về studio** — asymmetric two-image collage: the tall real room on the left, the real
   reformer practice frame offset lower on the right and overlapping; display-serif heading,
   two short paragraphs drawn from the existing Studio copy, and two text links (Studio,
   Huấn luyện viên).
5. **Hình thức tập** — eyebrow + heading + right-aligned text link; two frosted 40px-radius
   cards for Group and Private only (confirmed formats). Each opens on a small satin "light
   swatch" carrying the Latin format name rather than a photograph, because no photograph
   shows a group class or a private lesson. Tag chips (format, apparatus), the existing body
   copy, "Phù hợp với" lines, the confirmed cancellation window in `<Figures>`, and an outlined
   "Xem chi tiết" button.
6. **Tìm hình thức phù hợp** — dark chocolate full-width guide: eyebrow, heading, "Ba câu hỏi
   ngắn" subtitle, step dots, one question at a time with three stacked outlined answers. The
   result names Group, Private or "trao đổi trước" with neutral reasoning quoted from
   `CLASS_FORMATS.forWho`, and links only to `/dich-vu` sections and `/dat-tu-van`.
7. **Bảy ngày tới** — the existing live schedule (loading / error / empty / loaded) inside a
   frosted rounded panel.
8. **Huấn luyện viên** — rounded cards fed by `GET /public/trainers`; API photo or a neutral
   empty frame, name and API bio only. Loading, error and empty states kept.
9. **Quote panel** — dark rounded panel inside the cream page: a short, widely published
   Joseph Pilates line in Vietnamese with honest attribution, and the real chair movement
   pair (fold → extend) as a quiet illustration of control.
10. **Buổi đầu tiên** — the four real first-visit steps as frosted cards (replaces Pearl's
    testimonials and price cards, which have no truthful source here).
11. **Booking band** — dark full-width band, one statement, one outlined light button.
12. **Liên hệ** — Pearl's info list with round icon chips, fed by `studio.ts` with
    `<PendingFact>` for every unknown fact, and a text link to the consultation form.
13. **Footer** — dark chocolate, large wordmark.

Interior routes reached from Home receive the same chrome: the shared `PublicPageHeader`
becomes a short satin light field with ruled eyebrow (so every public page opens the same
way), **Services** becomes two frosted format chapters with real photographs plus the same
guide, and **Studio** becomes the collage + frosted principles. Schedule, packages,
consultation, contact and trainers keep their behaviour and states inside the new chrome.

## Image role register

| Source                                             | Role                          | Position and scale                                               | Relation to adjacent content                                                                                                                                      |
| -------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _none_ (CSS gradients)                             | Hero atmosphere               | Full first fold                                                  | Carries mood only. It asserts nothing about the room, so no claim needs proving.                                                                                 |
| `room-architecture-clean.webp` (studio-17, J mark removed) | Place proof           | Tall portrait, left of the Về studio collage; Group chapter on Services; Studio route | Shows the actual rows of reformers beside copy about machines set side by side. Not presented as a spa or a large club.                                         |
| `reformer-action-clean.webp` (studio-15, J mark removed)   | Practice proof        | Offset landscape overlapping the room image; Private chapter on Services | One person, one reformer, real window light. Copy never says the person is a trainer, a client result or a private lesson in progress.                         |
| `practice-fold.jpg` / `practice-extend.jpg` (studio-11/12) | Illustration of control | Small matched pair inside the dark quote panel; Studio route collage | The quote is about coordination and control; the pair shows one chair movement from flexion to extension. Alt text says chair, not reformer, and no trainer is implied. |

Rejected frames: every raw archive photo with the baked-in "J Pilates · 35 Hồng Bàng"
caption (studio-01…09), the opening-party table (studio-10), the logo/flyer files (16, 18),
studio-19…21 (logo bag, "J PILATES" decals, "Something new is coming" text) and the
cadillac shots 13/14 (acrobatic inversions would advertise a difficulty level the copy
cannot back up). No trainer portraits exist; the trainer cards never borrow a practice
photo.

## Mobile rule (390)

- First fold (390×844) must hold both eyebrows, the `h1`, the values line and the primary
  action. The light pool moves to the upper right so it sits behind empty space, not text.
- The orientation strip becomes two stacked cells divided by a horizontal hairline.
- The collage keeps its asymmetry: the room image takes ~80% width, the practice frame
  overlaps its lower right corner rather than becoming a second full-width stack.
- Format cards, team cards and first-visit cards become a single column with 28px radius;
  the guide's answers become full-width 48px targets.
- The quote panel keeps the chair pair side by side at reduced size beneath the quote.
- No horizontal overflow at 390 / 768 / 1024 / 1440; menu sheet must open.

## Honest limits

- **Caps.** Pearl sets all labels and headings in uppercase. P5 forbids caps on Vietnamese,
  so every Vietnamese label, triad and heading here is sentence case with open tracking.
  Only the Latin wordmark lock-up (`SOUL`, `PILATES · NHA TRANG`) uses capitals.
- **No numbers invented.** The strip uses two counts the code already defines; durations,
  capacities and prices are not shown.
- **Blur budget.** `backdrop-filter` is limited to the header after scroll and the strip;
  cards use translucent fills and inset highlights without live blur, so long pages stay
  cheap to scroll on mid-range phones.
- **Identity.** The app still says Soul Pilates Nha Trang; the photo archive says J Pilates.
  This branch does not resolve that.

## Rejected source claims

Pearl emblem / sculptural pearl, "prémiové" positioning, Mat and Barre classes, free parking
chip, Booqme booking, named team with roles and tag chips, testimonials, star ratings, price
cards (single entry vs. pass), the "0 % stress" figure and any class duration. Pearl's own
fonts (Abramo, DM Sans) are not imported.

## Review after implementation

Screenshots: [`reference-variant-captures/`](reference-variant-captures/). Full pages of Home,
Services (`dich-vu`), Studio (`gioi-thieu`), Trainers, Schedule and Consultation at 1440,
1024, 768 and 390, plus first-fold captures for each at 1440×900 and 390×844
(`*-first-1440.png`, `*-first-390.png`). Captured against the dev server with MSW fixtures,
so schedule rows and the single trainer are labelled demo data. `scripts/shoot.mjs` now
takes `--first`, shoots 1024 and scrolls lazy images (skipping ones hidden at the current
breakpoint) before the full-page capture.

- **What translated.** The first fold is the clearest departure from every other branch:
  no photograph, a CSS satin field with two blurred diagonal folds and a light pool, ruled
  eyebrows, a tracked values line, a pill with a true system fact, and a solid chocolate +
  outlined pair. The translucent strip under it carries two counts the code defines. The
  collage, frosted 40px cards, dark quote panel, dark guide, dark booking band, icon-chip
  contact list and dark footer follow Pearl's order and materials. At 390×844 the eyebrows,
  `h1`, values line, chip and both actions are inside the first fold; the strip sits just
  below the actions.
- **Header behaviour.** Transparent over the light field, frosted once the page moves. The
  header "Đặt lịch tư vấn" stands down whenever a page's own ask (hero actions, booking band,
  contact aside) is on screen, and never shows on `/dat-tu-van`, so P2 holds while keeping
  Pearl's persistent header button. Below 1280px the nav collapses into the menu sheet:
  at 1024 the centred six-item nav wrapped onto two lines beside the larger wordmark.
- **Format guide.** Three questions, one at a time, three outlined answers, step dots, back
  and reset, focus moved to the new question/result, `aria-live` on the stage. Outcomes were
  exercised in a browser: first-time + posture + 1:1 → Lớp riêng with two quoted
  `forWho` lines; regular schedule answers → Lớp nhóm; an even split → "Trò chuyện với
  studio trước". Injury always routes through a consultation. Nothing is sent or stored.
- **Fixed after looking at captures.** (1) The mobile menu sheet collapsed to nothing: the
  frosted header's `backdrop-filter` became the containing block of the fixed sheet; the
  header now drops the blur while the menu is open. Earlier the sheet's satin class had also
  overridden `position: fixed`. (2) The Services photo column grew to the portrait image's
  natural height (~900px); it now fills its row. (3) The collage's offset frame floated
  beside, not over, the tall frame at 1024/1440; it now overlaps the corner, and on phones
  a separate instance overlaps the tall frame instead of waiting below the text. (4) A lone
  trainer without a portrait produced a tall empty field that outweighed the page; cards
  without a photo are now compact. (5) The satin base was too close to white for the folds
  to read; it is a step deeper and fades to cream at the bottom so no seam shows against the
  next section. (6) Format swatches were reduced from 16:7 to 3:1 on desktop.
- **Checks.** No horizontal overflow and no broken images on eight public routes at 390,
  768, 1024 and 1440; mobile menu opens and closes; no console errors.
  `npm run verify` passed (66 tests, build, nine pre-rendered routes, build contract,
  content gate). On this machine Node 22.12 needs `NODE_OPTIONS=--experimental-strip-types`
  for the `.ts`-importing check scripts; that is an environment issue, not a code change.
- **What still feels weaker.** The light field is convincing at 1440 but the right half
  is empty by design; without Pearl's pearl it relies on a soft light pool that some
  viewers will read as a blur rather than satin. Uppercase was the backbone of Pearl's
  luxury register; in sentence case (P5) the tracked Vietnamese labels are calmer but less
  distinctive, and very wide tracking on diacritic-heavy words ("Hơi thở") looks slightly
  loose. The format cards open on a light swatch rather than a photograph, which is honest
  but less tactile than Pearl's class photos. The page is long (≈7,700px at 1440, ≈9,400px
  at 390) and repeats dark fields; Services has two dark fields separated only by a short
  cream pause. Functional routes (schedule, consultation, packages) inherit the chrome but
  keep copper `lacquer` actions, so chocolate and copper both appear as solid action colours
  across the site.
- **Design-system tension.** This variant uses rounded, translucent surfaces, soft shadows
  and gradients that `docs/DESIGN_DIRECTION.md` explicitly rejected ("soft organic") and that
  the token resets were built to prevent. They live only in `app/styles/pearl.css` under
  `.pl-site`, so staff and student surfaces are untouched, but adopting this direction would
  require the Reference Lock reconsideration process, not just a merge.
- **Customer/owner judgment.** It is the calmest, most "premium wellness" first impression of
  the set and the only one that needs no photograph above the fold — which helps while the
  photo archive is thin. It is **not ready to send to customers**: address, phone, hours,
  Zalo and map are still "Đang cập nhật", the identity (Soul vs. J Pilates) is unresolved,
  the schedule and trainer are demo data, and there are no trainer portraits.

## Soul palette

Built directly on the owner-approved Soul palette (no later colour pass): cream `#fff5ec`
canvas, peach `#fce5d1`, chalk `#fafaf8`, chocolate ink `#2c2319` / `#1a1410`, secondary ink
`#5a4b40` / `#806f61`, rules `#e8e5e0` / `#d4c5b6` / `#6b4b39`, action copper `#9a4e2d`
(hover `#7c391f`), plus `cream`, `peach`, `copper #c97b4b`, `amber #d4a574` and `walnut`
tokens; `theme-color` is `#fff5ec`. Pearl's chocolate accent maps to the palette's
`#2c2319`; its satin light is built from the same cream/peach family with white
highlights, so no new hue was introduced. Small action text (links, tags) uses `#9a4e2d`;
decorative copper `#c97b4b` appears only at display size (step and principle numerals) and
in hairline accents. Be Vietnam Pro and Newsreader remain the fonts; Pearl's Abramo and DM
Sans were not imported.
