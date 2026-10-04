# J Pilates project documentation

This directory contains the current backend contracts, business rules and
operating instructions. Frontend implementation documentation lives in
[src_FE/docs](../src_FE/docs/PRODUCT.md).

| Question | Current document |
| --- | --- |
| What does the application do? | [Feature specification](dac-ta-tinh-nang.md) |
| Which business rules apply? | [Backend business rules](business-rules.md) |
| Which endpoints does a screen call? | [API by workflow](api-cho-frontend.md) |
| What does an endpoint accept and return? | [Generated API contract](api/README.md) |
| How is the backend deployed and operated? | [Backend deployment](deployment.md) |
| How is the frontend installed and run? | [Frontend README](../src_FE/README.md) |
| How is the frontend deployed? | [Frontend deployment](../src_FE/docs/DEPLOYMENT.md) |
| Which design rules govern the approved UI? | [Design system](../src_FE/docs/DESIGN_SYSTEM.md), [Reference Lock](../src_FE/docs/REFERENCE_LOCK.md) |
| What must be completed before release? | [Release checklist](../src_FE/docs/RELEASE_CHECKLIST.md) |
| How does the studio provide initial data? | [Import template](templates/mau-nhap-du-lieu-ban-dau.xlsx) |

## Contracts and maintenance

The backend owns authorization, capacity, eligibility, money and session ledger
rules. Frontend behavior must follow the API response. Do not restore excluded
features from older planning documents.

`api/` is generated from the backend. Regenerate it after API changes:

```bash
cd src_BE
uv run python -m scripts.gen_api_docs
```

Backend API-document tests and frontend endpoint coverage tests enforce this
contract. The initial-data template is also checked by backend tests.

## Historical material

Research, old plans, design comparisons, source workbooks and agent memories
are retained on legacy branches. `codex/legacy-before-product-cleanup` preserves
the complete source tree before cleanup. Main contains current product files;
legacy decisions must not override current business rules or the approved UI.
