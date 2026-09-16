# Soul Pilates Nha Trang

Public website and studio-management application for a boutique Pilates studio
in Nha Trang. React 19 · React Router v8 (framework mode, `ssr: false`) ·
Vite 8 · TypeScript 6 strict · Tailwind CSS 4 · TanStack Query 5.

## Start here

|                                                      |                                              |
| ---------------------------------------------------- | -------------------------------------------- |
| **[AGENTS.md](AGENTS.md)**                           | The contract. Read before changing anything. |
| [AI_PLAYBOOK.md](AI_PLAYBOOK.md)                     | The loop to run for every feature.           |
| [docs/PRODUCT.md](docs/PRODUCT.md)                   | What this product is and what is confirmed.  |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)         | Stack, rendering model, layers.              |
| [docs/DESIGN_DIRECTION.md](docs/DESIGN_DIRECTION.md) | Why the design looks like this.              |
| [docs/REFERENCE_LOCK.md](docs/REFERENCE_LOCK.md)     | The visual governance document.              |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md)     | What the studio has not answered yet.        |

## Develop

```bash
npm install
npm run dev
```

There is no backend yet. Mock Service Worker boots automatically in development
and serves clearly-marked demo fixtures. To review a role-gated screen:

```js
localStorage.setItem("soul:demo-role", "staff"); // or "trainer"; reload
```

## Verify

```bash
npm run verify   # typecheck · lint · test · build · build-contract
npm run e2e      # Playwright against the real build artifacts
```

Nothing is done until `npm run verify` passes.

## Other scripts

```bash
npm run check:content    # studio facts and photography still outstanding
node scripts/shoot.mjs http://localhost:5188 ./shots "/" "/studio/lich@staff"
```

## Deploy

`build/client` is the entire artifact. Rewrite unmatched paths to
**`/__spa-fallback.html`** — not `index.html`. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Honesty policy

The Nha Trang studio has not supplied its address, phone number, opening hours,
prices, trainer profiles or photography. This repository does not invent them
and does not reuse the Đà Nẵng branch's. Unknown facts render as "Đang cập nhật"
and are tracked in [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md).
