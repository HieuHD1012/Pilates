# UI audit, September 2026

This directory is the current design investigation. Treat older design files as evidence of how decisions were made, not as requirements. The three implementation branches and their rendered screenshots are compared in `version-comparison.md`.

| Read for | File |
| --- | --- |
| Product, sources, timeline, branch relationships | [context-map.md](context-map.md) |
| Research → decision → code → visible result | [decision-history.md](decision-history.md) |
| Baseline, states inspected, root causes | [current-ui-diagnosis.md](current-ui-diagnosis.md) |
| Design principles and three falsifiable hypotheses | [design-direction.md](design-direction.md) |
| Rendered comparison and recommendation | [version-comparison.md](version-comparison.md) |

## Reproduce the screenshots

From `src_FE`, use Node 24 or later and run the dev server with MSW enabled:

```bash
node_modules/.bin/react-router dev --port 5188 --strictPort
node scripts/ui-audit-capture.mjs http://localhost:5188 ../docs/ui-audit/screenshots/integrated
```

The capture uses 1440, 1024, 768, and 390px viewports, with demo roles in local storage. It saves full-page screenshots of the public homepage, staff dashboard/calendar, and student classes/schedule, plus a populated student list, mobile menu, and create-class dialog. `measurements.json` records document overflow. These fixtures are explicitly demo data, not evidence about the actual studio.

`screenshots/baseline` records `photos/g3-mot-khung` before the API branch was integrated. `screenshots/integrated` records the merged API-connected base before design experiments, except for the shared mobile menu bug fix documented in the diagnosis. The available Git refs do not include all 17 photography experiments named by the older report; those claims can be inspected in the report but their exact UI cannot all be reproduced from refs in this checkout.
