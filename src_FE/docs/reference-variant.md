# On Culture — movement story experiment

Branch `codex/ref-on`, independently from `main` `9d64fb3`.

Official [On Culture stories](https://www.on.com/en-us/explore/off-stories/culture) (reviewed 2026-09-27) uses clear headline hierarchy, active images and story destinations. This is editorial navigation, not a product catalog. Translate that into a Soul story of *how movement is coached*, with routes to formats and the people page. No On athletes, shoe technology, collabs or performance claims are copied.

## Structure before implementation

```text
OPEN: emphatic statement joined to a real action photograph
STORY: three short chapters about attention, movement and first visit
PEOPLE: trainers route surfaced as a destination, with demo identity clearly marked
CHOICE: Group / Private and live schedule actions
```

This differs from BLOK's immediate physical punch and Tracksmith's long editorial practice essay: a small number of **navigable stories** must make the visitor curious enough to enter the service and people routes. The action photo crop must preserve the whole movement on a phone. Source archive photos are the same owner's earlier studio; no image identifies an unverified Soul instructor. Reject if it looks like a running apparel campaign or the story panels delay the real class decision.

## Review after implementation

Home, Services, Trainers and Consultation were captured at 1440/1024/768/390, with first-fold captures at 1440/390 (24 images). The opening joins real reformer action to a concise claim. Three navigable chapters lead to method, people and first visit, then the visitor sees Group/Private and a working schedule. At 390px, the whole body and reformer survive the hero crop, and each story becomes a complete image-plus-copy unit. The room image used for the people destination is a route invitation, not a trainer portrait. Trainer records without actual portrait keys now show a neutral empty frame; demo roster is visibly identified on that route.

Source assets are owner-supplied studio photographs with a minimally cleaned former mark in the reformer frame, originally documented on the Tracksmith branch. No athlete identity, product technology or performance promise from On appears here. There is no generated image. The movement sequence repeats the same subject; that is the archive's limit, not evidence of multiple Soul customers.

`npm run verify` passed, and the 16-combination Playwright sweep found no overflow or broken image. Its mobile menu click initially exposed the baseline header's `backdrop-filter` trapping the fixed menu in a zero-height containing block. Removing the filter fixed navigation; the sweep passed on rerun. The five required business facts still block release.

**Fit decision:** On's story navigation makes the pages inviting, but three image cards begin to resemble an apparel editorial grid and delay the actual Group/Private decision. The repeated subject and demo trainer data further reduce trust for a local studio. Keep the crop discipline and short navigable stories; do not select this as the lead conversion layout without a real Soul shoot and confirmed trainer roster.

## Soul palette transfer · 2026-09-30

This variant now uses the observed [Soul Đà Nẵng homepage](https://soulpilates.com.vn/) colour roles: cream #fff5ec, peach #fce5d1, copper #c97b4b, amber #d4a574 and chocolate #2c2319. Small action text uses #9a4e2d for legibility. The reference-specific layout and image sequence remain this variant's own experiment. This is a palette study for the owner's beige preference, not a brand/name transfer from the Đà Nẵng studio.
