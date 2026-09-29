# Soul palette transfer · 30 September 2026

The owner likes the warm beige, orange and brown language of [Soul Pilates Đà Nẵng](https://soulpilates.com.vn/). We inspected the live homepage's computed custom properties and saved the evidence in `soul-source-theme.json` and `soul-source-home.png`. The `--hp-*` values are the public site's visual palette; its separate `--sp-*` app colors do not describe the homepage.

| Source role | Observed value | Use in these variants |
| --- | --- | --- |
| Background | `#fafaf8` | Quiet app and alternate section background |
| Cream | `#fff5ec` | Main public canvas |
| Peach | `#fce5d1` | Recessed fields and soft section breaks |
| Copper | `#c97b4b` | Decorative accent and large marks |
| Amber | `#d4a574` | Warm highlight |
| Dark | `#2c2319` | Primary text and deep sections |
| Deep dark | `#1a1410` | High contrast full bleed fields |
| Border | `#e8e5e0` | Hairlines |

The source copper gives only about 3.3:1 contrast against white. For small action text and solid buttons, the variants use deeper copper `#9a4e2d` (about 6:1 against white); the observed `#c97b4b` remains an accent. This is an accessibility adaptation, not a claim that the source website uses the deeper shade.

Be Vietnam Pro and Newsreader remain the local UI and display fonts. The source also loads Inter, Syne and Fraunces, but changing all 12 typography systems would obscure the composition comparison and risk Vietnamese rendering. Image roles, grids and page sequence stay distinct per branch. The scripted color mappings are in `apply-soul-theme.mjs`.

These are J Pilates composition studies. The source site's Soul wordmark and Đà Nẵng facts are not license to name the Nha Trang studio Soul. Existing screenshots may still show the old Soul placeholder and require a separate approved identity/content pass before client release.
