# Design system

The token layer is `app/styles/app.css`. It is the single source; there are no
Tailwind config files and no second palette.

## The namespace reset

```css
@theme {
  --color-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --font-*: initial;
}
```

Tailwind's stock palette, radii and shadows are deleted. `bg-blue-500`,
`rounded-2xl` and `shadow-lg` do not exist in this repository. This is
deliberate: it converts three prose rules from AGENTS.md into things the build
can catch. If a utility you want does not exist, that is the system telling you
the answer is a token, not an exception.

## Colour

| Token       | Value     | Contrast on `sand` | Use                                                             |
| ----------- | --------- | ------------------ | --------------------------------------------------------------- |
| `sand`      | `#f2f0ea` | —                  | Public canvas                                                   |
| `sand-deep` | `#e9e6dd` | —                  | Recessed public field, hover                                    |
| `chalk`     | `#fbfaf7` | —                  | Application canvas                                              |
| `paper`     | `#ffffff` | —                  | Application surfaces: tables, panels, dialogs                   |
| `ink`       | `#1b1e19` | 14.79 : 1          | Primary text, primary buttons                                   |
| `ink-deep`  | `#101210` | —                  | Dark full-bleed fields, footer                                  |
| `ink-2`     | `#5c6057` | 5.64 : 1           | Secondary text                                                  |
| `ink-3`     | `#767a6e` | 3.86 : 1           | **Non-text only**: disabled, decorative, ≥24px display numerals |
| `rule`      | `#dedace` | —                  | The hairline                                                    |
| `rule-2`    | `#c3bfb1` | —                  | Emphasised hairline, control borders                            |
| `rule-dark` | `#33362e` | —                  | Hairline on dark fields                                         |
| `lacquer`   | `#8a3324` | 7.14 : 1           | The brand mark, focus ring, "today", the one public CTA         |
| `lacquer-2` | `#6d2718` | —                  | Hover / pressed                                                 |
| `success`   | `#2f6a4f` | 5.59 : 1           | Status only                                                     |
| `warning`   | `#8a6212` | 4.80 : 1           | Status only                                                     |
| `danger`    | `#b3261e` | 5.74 : 1           | Status and destructive actions only                             |
| `info`      | `#2b5673` | 6.87 : 1           | Status only                                                     |

White on `lacquer` is 8.14 : 1; white on `ink` is 16.85 : 1.

**Two colour rules that matter**

1. `ink-3` fails AA for body text. Use `ink-2` for anything readable.
2. `lacquer` and `danger` are adjacent hues. They must never appear in the same
   context. In the application the primary button is `ink`, precisely so a
   lacquer button never sits beside a danger badge.

## Type

```
--font-sans:    "Be Vietnam Pro"      text, UI, labels
--font-display: "Newsreader Variable" display, editorial, ALL tabular figures
```

Both are self-hosted through Fontsource — no third-party font runtime.

### Why numerals are set in the serif

Measured with `fontTools` against the shipped web fonts:

|                | Vietnamese subset            | `tnum`  | Digit widths     |
| -------------- | ---------------------------- | ------- | ---------------- |
| Be Vietnam Pro | yes (`locl`, `mark`, `mkmk`) | **no**  | **proportional** |
| Newsreader     | yes                          | **yes** | **monospaced**   |

A product built on session balances, capacities, prices and times cannot align a
column in Be Vietnam Pro. So every comparable number goes through `<Figures>`,
which switches to Newsreader with `tnum` and an optical size appropriate to the
context. A bare `{count}` inside a table cell, metric or price is a bug.

```tsx
<Figures>{booked}/{capacity}</Figures>          // inline, opsz 16
<Figures display>{sessionsRemaining}</Figures>  // metric, opsz 40, weight 300
```

### Vietnamese typography

- **Never set Vietnamese in all caps.** Stacked marks on capitals crowd the line
  above and the hook/horn shapes lose their distinction. The eyebrow label in
  this system is the `label-micro` utility: sentence case, `0.11em` tracking.
- Display leading is set per token and is loose enough that `ế ễ ộ ự` never clip.
- `font-feature-settings: "locl" 1` is on globally for correct localised forms.

### Scale

`text-2xs` 11 · `text-xs` 12 · `text-sm` 13 · `text-base` 15 · `text-lg` 17 ·
`text-xl` 20 · `text-2xl` 24 · `text-3xl` 30, plus fluid display sizes
`text-d1` / `text-d2` / `text-d3` and `text-lede`.

## Radius

`none` 0 (structure) · `xs` 2px (badges) · `sm` 3px (buttons, inputs) ·
`md` 5px (dialogs) · `full` (avatars and status dots only).

## Elevation

Exactly three: `shadow-popover`, `shadow-dialog`, `shadow-sheet`. If a thing is
not floating above the page, it gets a rule or a surface change instead.

## Motion

`--ease-measure: cubic-bezier(0.2, 0.7, 0.2, 1)` is the only curve.
`rule-draw` and `fade-rise` are the only two keyframes. Reduced motion is
handled once, globally, in the base layer.

## Utilities worth knowing

| Utility                                   | Purpose                                  |
| ----------------------------------------- | ---------------------------------------- |
| `figures` / `figures-display`             | Tabular serif numerals (use `<Figures>`) |
| `label-micro`                             | The sentence-case tracked eyebrow        |
| `measure` / `measure-wide`                | Cap long-form text at the measure        |
| `gutter`                                  | The one page gutter definition           |
| `rule-t` / `rule-b` / `rule-l` / `rule-r` | Hairlines                                |
| `rule-draw` / `fade-rise`                 | The two reveals                          |

## Primitives

`app/ui/` — Button, Field/Input/Textarea/Select, Dialog, Figures, StatusBadge,
CapacityMeter, Skeleton, SkeletonRows, EmptyState, ErrorState, LiveRegion,
RefreshingRule, Section, Rule, PageHeader, FilterBar, Metric, TickRule,
PublicPageHeader, ArtDirectedImage, PendingFact.

Radix primitives are implementation infrastructure. No Radix default styling
ships. Do not add a component library.

## Two declared modulations

Both of these look like drift in an audit and are not, so they are written down
rather than left to be re-litigated.

**The 2px optical tier.** The spacing scale is 4px. A 2px step is permitted for
optical work only, and only for: hairline offset, icon optical centring, and
diacritic clearance on a bounded label. Treating 2px as a violation forces
rounding in exactly the places where 2px is the right answer, and turns the scale
into a rule people quietly break instead of one they can follow.

**Two rule roles, not three.** `rule` is the separator. `rule-2` is the control
border and emphasis stroke — inputs, secondary buttons, underline decoration,
neutral badges. The calendar's hour grid renders `rule` at 60% because a hundred
parallel lines at full strength out-weigh the content they measure; that is one
role modulated for one declared reason, not a third token.

## Tracking has four roles, not sixteen values

Sixteen inline `tracking-[…]` values existed across four real roles. The roles
are now utilities and inline tracking is not permitted:

| Utility        | Tracking | Use                                                                                                                   |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `wordmark`     | `0.22em` | "SOUL" only. The one place caps are allowed — it is Latin and carries no diacritics.                                  |
| `wordmark-sub` | `0.14em` | The city or role line beside the wordmark.                                                                            |
| `label-micro`  | `0.11em` | The sentence-case eyebrow on public sections.                                                                         |
| `label-badge`  | `0.04em` | Text inside a bounded shape — badges, markers, notices — where open tracking reads as loose rather than as structure. |

Display tracking is negative and lives in the type tokens. `text-xl` carries
`-0.01em` so the operational page title needs no inline value.

## One easing curve

`--ease-measure` is the only curve. Tailwind's stock `animate-pulse` ships its
own cubic-bezier, which is how a second curve entered a system documenting one —
so the skeleton has its own declared animation, `animate-skeleton`, on our curve.
**Never use `animate-pulse`.**

## Weight floor for diacritics

Weight 300 with stacked tone marks at 11–13px on a low-density Android screen is
the real Vietnamese risk in this system, not bold. Diacritic-bearing text does
not use weight 300 below 15px.
