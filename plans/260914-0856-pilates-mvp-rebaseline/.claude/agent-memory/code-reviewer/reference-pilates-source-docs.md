---
name: reference-pilates-source-docs
description: Where Pilates MVP scope, effort, business-rule answers and design thresholds actually live, and how to read each file
metadata:
  type: reference
---

- `docs/nguon/pham-vi-xac-nhan.xlsx` — sheet "Chức năng" (51 client-facing functions with acceptance conditions) and sheet "Phạm vi xác nhận" (15 confirmation questions WITH the client's written answers). Authoritative for business rules. Read with openpyxl `data_only=True`.
- `docs/nguon/ke-hoach-mvp-noi-bo-2026.xlsm` — sheets "Tổng quan" (58 items / 527h / BA 117 · BE 215 · FE 195), "Chi tiết màn hình" (per-item BA/BE/FE hours), "Timeline", "Phạm vi & giả định" (team, stack and admin assumptions, confirmation deadlines).
- `docs/thiet-ke/brief-thiet-ke-soul-1.html` — design brief addressed to an external design party: P1–P5 invariants, measurable Soul-1 thresholds, P3 content bans, 3 blocking questions, and the list of deliverables expected FROM the designer.
- `docs/thiet-ke/soul-doi-chieu.html` — 1.3MB, mostly base64 screenshots. Strip tags with python3 `re`/`html` and read text only; never cat it raw.
