# ADR 0004 — "Measure" as the design direction

**Status:** Accepted · 2026-08-18

## Context

The brief deliberately refused to name a visual style and asked for a
researched, committed direction rather than an averaged one. The existing Soul
site belongs to the Đà Nẵng branch and is brand ancestry, not a specification.

## Decision

Adopt **Measure**, recorded in `docs/DESIGN_DIRECTION.md` and governed by
`docs/REFERENCE_LOCK.md`. Its three load-bearing decisions:

1. The hairline rule is the structural unit; content is ruled, not carded.
2. Numerals are set in Newsreader with tabular figures and optical sizing.
3. One chromatic mark — an oxidised lacquer red — on plaster and green-black ink.

Two of the three are evidence-driven rather than aesthetic:

- **Syne**, which sets the largest numerals on the existing site, ships no
  Vietnamese subset (verified against the Google Fonts API). The incumbent type
  system cannot set its own market's language.
- **Be Vietnam Pro** has no `tnum` and proportional digits (verified with
  `fontTools` against the shipped web font). A product built on session
  balances, capacities and prices cannot align a column in it. Hence the serif
  numeral — a constraint turned into the product's signature.

## Consequences

- The token layer deletes Tailwind's stock colour, radius and shadow namespaces,
  so the direction cannot be diluted by reaching for a default utility.
- Public and operational surfaces share tokens, rules, figures and status
  vocabulary while differing in density and pacing.
- Photography is specified as briefs before it exists, and the layouts are
  required to hold up without it.
- No all-caps Vietnamese anywhere, which rules out the conventional tracked-caps
  eyebrow and replaces it with `label-micro`.

## Rejected

Coastal Nha Trang · quiet-luxury cream/sage/serif · dark editorial fashion-film ·
clinical rehabilitation · soft organic. Reasons in `docs/DESIGN_DIRECTION.md` §3.

## Revisit if

The triggers in `docs/REFERENCE_LOCK.md` § "Reconsideration" occur. Not for
preference, and never screen by screen.
