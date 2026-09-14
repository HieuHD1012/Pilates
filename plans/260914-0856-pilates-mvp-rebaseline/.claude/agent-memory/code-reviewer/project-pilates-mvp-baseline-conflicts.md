---
name: project-pilates-mvp-baseline-conflicts
description: Pilates MVP source docs disagree on whether a Soul-1 UI build already exists and on what the 527h estimate assumed — check both before trusting any plan baseline
metadata:
  type: project
---

Two load-bearing conflicts between the Pilates MVP source documents in `docs/`:

1. `soul-doi-chieu.html` (25.08.2026) and `brief-thiet-ke-soul-1.html` describe Soul-1 and Soul-2 as two builds measured live via DOM/CSSOM + axe-core on two parallel dev servers, six screens each; the brief states "hệ đã có và đang chạy". The internal `.xlsm` (last saved 24.08.2026) still marks all 58 items "Chưa bắt đầu", and `src_BE/` + `src_FE/` are empty. Any plan claiming "0 dòng code" is resting on a stale status column, not on an observation.
2. `.xlsm` sheet "Phạm vi & giả định" row 8: the 527h / FE 195h estimate assumed a ready-made admin page for simple internal content ("Chỉ React hóa luồng dùng thường xuyên"), and warns a full custom admin adds 90–130h. Any stack choice without a built-in admin (FastAPI) invalidates that estimate; scope-locking to 58 items does not recover the hours.

Document recency: `docs/nguon/pham-vi-xac-nhan.xlsx` internal timestamps are 13.09.2026, `.xlsm` 24.08.2026 — the .xlsx is the newer source for business rules.

**Why:** both conflicts were used to justify schedule and stack decisions in the 260914 re-baseline plan without being resolved.
**How to apply:** when reviewing or re-planning this project, verify the prototype question and the admin-assumption question first; every effort number downstream depends on them.
