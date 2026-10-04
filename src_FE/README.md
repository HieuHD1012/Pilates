# J Pilates Nha Trang

Public website and studio-management application for a boutique Pilates studio
in Nha Trang. React 19 · React Router v8 (framework mode, `ssr: false`) ·
Vite 8 · TypeScript 6 strict · Tailwind CSS 4 · TanStack Query 5.

The owner confirmed the name **J Pilates** on 2026-10-03. Soul references in
research and provisional-policy provenance identify the Đà Nẵng reference site,
not this product. Existing `soul:*` session-storage keys and demo account
credentials remain compatible with previously created local sessions/accounts;
they are not public brand text.

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

## Develop on a fresh machine

Install **Node 24 LTS, version 24.15 or newer**, with npm 10 or newer. Node
22.22.2+ is also supported; older Node 22 releases and Node 23/25 are not.
`.nvmrc` selects Node 24 for version managers. Check `node --version` and
`npm --version` after opening a new terminal.

From the repository root:

```bash
cd src_FE
npm ci
npm run dev
```

After pulling changes, run `npm ci` again before `npm run dev`. It installs the
committed lockfile, including platform-specific Vite/Tailwind binaries; do not
copy `node_modules` from another machine. No global Vite, React Router, Python,
Docker, backend or `.env` file is needed to preview the frontend. Open the local
URL printed by Vite (normally `http://localhost:5173`).

The project uses a compatible ESLint 9/accessibility-plugin pair. Normal peer
resolution is enabled; `--force` and `--legacy-peer-deps` are unnecessary.
Unsupported Node versions fail with an explicit engine/runtime message instead
of failing later inside the bundler or test runner.

### Demo screens

Mock Service Worker starts automatically in development and serves clearly
marked demo fixtures. It is compiled out of production. To choose a demo role,
run this in the browser console and open the matching route:

```js
localStorage.setItem("soul:demo-role", "ADMIN"); // STAFF, TRAINER or STUDENT
location.assign("/studio/lich"); // ADMIN/STAFF
// TRAINER: /hlv/lich-day; STUDENT: /hv/lop-hoc
```

Demo mode simulates authentication; it is not proof of backend permissions.

### Connect the real backend

Optionally copy `.env.example` to `.env` in `src_FE` and configure:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_ENABLE_MSW=false
```

Restart Vite after changing environment variables. The backend must allow the
printed frontend origin in CORS. Empty `VITE_API_BASE_URL` means same-origin
`/api`, which requires a configured proxy; the default dev server does not
provide one. If a previous local `.env` disables mocks or points to an unavailable
API, adjust that file or remove those overrides to return to the default demo.

## Verify

```bash
npm run verify   # typecheck · lint · test · build · contract · bundle · content
npm run e2e:install  # one-time browser installation
npm run e2e -- --project=desktop --project=mobile --project=app
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
