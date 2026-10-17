# ADR 0005 — Warm beige and copper public composition

**Status:** Accepted · 2026-10-03 · supersedes the colour
decision (item 3) of ADR 0004; the rest of 0004 stands.

## Context

The owner approved the current warm beige/copper/brown palette and public
composition. These decisions are retained for J Pilates Nha Trang.

## Decision

1. **Palette.** Token _names_ keep their roles; values change. `sand` #fff5ec
   (cream), `sand-deep` #f8e9da (linen), `chalk` #fffaf5, `ink` #2c2319,
   `ink-deep` #1a1410, `ink-2` #64503e, `rule` #ead8c6, `rule-2` #d3baa1.
   The brand colour is renamed `lacquer` → **`copper`** (#9a4e2d, 5.58:1 on
   sand; white on it 6.00:1). Two decorative tokens are added and documented as
   non-text: `copper-bright` #c97b4b (3.04:1 — display
   numerals ≥ 40px and accent strokes only) and `amber` #d4a574 (accents on the
   ink field, 8.19:1). Status hues are unchanged except `success`, warmed to
   olive #3c6a3b (5.89:1) in the 03/10 public audit.
2. **Composition.** One twelve-column grid; every public section is a 4/8 split
   (`SectionRail` + content). Photographs are the only elements allowed to leave
   the grid, through the `bleed-*` utilities, and only in three declared places:
   the homepage hero (right), the homepage method frame (left, for a Z reading),
   the Studio room (full width). Pages without a photograph: packages, schedule,
   trainers, consultation, promotions, sign-in.
3. **The frozen H1 size is decided:** `--text-d1` tops out at 78px (was 100px).
   The hero title shares its row with a photograph; at 100px "Không tập nhiều
   hơn." broke across three lines in a six-track column.
4. **Concept photographs** stay in `public/images/concept/` for review. The public
   footer discloses them once; no image overlay captions are used, and
   `npm run check:release` fails while any concept file is referenced. No concept
   person appears on the trainers page.
5. **One ask, honestly named.** "Đặt lịch tư vấn" becomes "Nhận tư vấn"
   everywhere: the form creates a call-back lead, not an appointment. Context
   (`?tu=goi-tap`, `?tu=lich-tap`, `?tu=khuyen-mai`) travels into the lead's
   `need` text. The homepage ends with the two required fields of the same form.
   The public schedule and the sign-in screen both offer the newcomer's path.

## Consequences

- Every operational screen inherits the warm palette through the tokens; the
  app's primary button stays `ink`, and `copper` and `danger` still never share
  a context.
- Pill buttons remain rejected; controls keep the 3px radius.
- `<PendingFact>` retains the existing honest-content behavior (P3).
- Before launch: replace all six concept frames, re-check focal points at 1440,
  1024, 768 and 390px, and resolve the open items in `docs/RELEASE_CHECKLIST.md`
  (studio content, provisional policies and contact facts).
