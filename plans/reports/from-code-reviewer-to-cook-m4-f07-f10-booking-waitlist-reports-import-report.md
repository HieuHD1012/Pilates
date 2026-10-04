# Review M4 (F07 + F08 + F09 + F10 — phần backend)

Ngày: 2026-09-14 · Reviewer: `code-reviewer` subagent · Trạng thái: **DONE_WITH_CONCERNS**

Phạm vi: 6 service (~1.600 LOC) + 5 module API + 3 schema + 2 script + 12 file test + CI.
Phương pháp: đọc mã đối chiếu `docs/business-rules.md`, **6 probe chạy thật** trên DB test
(5434), và **34 đột biến** áp vào mã sản xuất rồi chạy test. Mọi đột biến đã được khôi phục
và đối chiếu byte-by-byte với bản sao lưu (xem mục "Khôi phục nguyên trạng").

---

## Tóm tắt điều hành

Phần logic **đúng** ở những chỗ khó nhất: thứ tự khoá, trừ buổi, hủy idempotent, ngưỡng
HOẶC, biên kỳ theo giờ studio, trung hoà công thức, chống nhập trùng. Tôi đã cố phá từng
chỗ đó bằng đột biến và **tất cả đều bị test bắt**.

Vấn đề nằm ở ba chỗ khác:

1. **Script nhập liệu chết bằng traceback** khi một dòng đụng `UNIQUE` — đúng kiểu hỏng mà
   toàn bộ thiết kế idempotent sinh ra để ngăn, và `main()` (dry-run, `--commit`, dòng
   `import_run`) **không có một test nào**.
2. **Bốn cơ chế được tài liệu gọi là bắt buộc lại không có test nào chứng minh** — khoá
   trước hai buổi lớp ở `change_booking`, SAVEPOINT ở `promote`, mốc `confirmed_at` của
   doanh thu, và bộ lọc màn hình gia hạn. Đột biến xoá chúng đi, bộ test vẫn xanh.
3. **Tiêu chí "mọi con số mở ra được danh sách chi tiết khớp với nó" chưa đạt** — tôi đã
   tái hiện: báo cáo nói 1 lớp, `detail_path` của chính nó trả về 0 lớp.

---

## Phát hiện

### Critical

Không có. Không tìm thấy đường mất buổi, số dư âm, vượt sức chứa, vượt quyền, hay rò PII
trong mã M4.

---

### High

#### H1 — Nhập liệu: một dòng đụng `UNIQUE` giết cả lần chạy bằng traceback

`scripts/import_initial_data.py::_import_students` (dòng 253–254) `db.add()` + `db.flush()`
**không nằm trong savepoint và không bắt `IntegrityError`**. Mọi va chạm ràng buộc ném
exception ra khỏi `run_import` → `main()` không bắt → traceback, session vỡ, không dòng
`problems` nào, không dòng `import_run` nào.

Kịch bản hỏng (đã tái hiện, hai probe):

| Dữ liệu vào | Hành vi | Hậu quả |
|---|---|---|
| Hai dòng `hoc_vien` dùng chung số điện thoại (mẹ và con — rất thường ở studio VN): `0900 111 222` và `0900111222` | `UniqueViolation: student_phone_key` | Tiến trình chết ở dòng đó. Người vận hành 12/11 nhìn thấy traceback Python, không biết dòng nào hỏng |
| Hai dòng `hoc_vien` dùng chung email | `UniqueViolation: student_user_id_key` (hai học viên cùng trỏ một `user_account`) | Như trên |

Đây đúng là kịch bản mà `docs/business-rules.md` §16 viết ra để ngăn: *"Dòng đã có khoá
ngoài thì bỏ qua; ràng buộc `UNIQUE` là phán quyết cuối, phép kiểm ở script chỉ là đường
nhanh."* Hiện tại `UNIQUE` không phải "phán quyết cuối" — nó là **dấu chấm hết**.
`normalize_phone` chỉ vá đúng biến thể khoảng trắng; mọi va chạm khác vẫn giết cả file.

Cách vá đề xuất: bọc mỗi dòng trong `db.begin_nested()` và dịch `IntegrityError` thành một
dòng `report.problems` kèm `row_ref`, đúng như `booking_service._translate_booking_conflict`
đã làm cho luồng đăng ký.

#### H2 — `main()` của script nhập liệu hoàn toàn không có test

`tests/test_import_idempotency.py` chỉ gọi `run_import(...)`; `main()` không xuất hiện ở
bất kỳ file test nào (grep toàn `tests/`). Hai đột biến sống sót:

| Đột biến | Kết quả |
|---|---|
| `if not args.commit: db.rollback()` → `db.commit()` (chạy thử ghi thật) | 8 passed — **xanh** |
| Xoá hẳn `db.add(ImportRun(...))` | 8 passed — **xanh** |

Nghĩa là hai tính chất chống đỡ ngày go-live — *"mặc định là chạy thử rồi rollback"* và
*"mỗi lần chạy ghi một dòng `import_run` kèm `file_hash`"* — không có gì giữ.

Kèm theo là một **lệch giữa mã và tài liệu**: ở nhánh chạy thử, `db.rollback()` cuốn theo
cả dòng `ImportRun` vừa `add`. Vì vậy cột `dry_run` **không bao giờ có giá trị `True` trong
CSDL** — nó là mã chết. Hậu quả vận hành: yêu cầu *"Diễn tập import đầy đủ trên bản sao
giống PROD trước 12/11"* không để lại dấu vết nào để chứng minh đã diễn tập.

Hai phương án, cần người quyết:
- Ghi `import_run` bằng một session/transaction riêng, commit trước khi rollback phần dữ
  liệu — đúng phát biểu của `business-rules.md` §16.
- Hoặc sửa tài liệu thành "chỉ lần chạy `--commit` mới ghi `import_run`" và bỏ cột `dry_run`.

#### H3 — Con số trên báo cáo không mở ra được danh sách khớp với nó (đã tái hiện)

Probe: một buổi lớp lúc 07:00 ngày 30/09 giờ studio.

```
GET /reports/classes?period_start=2026-09-01&period_end=2026-09-30
  → scheduled_sessions = 1, detail_path = "/classes?starts_from=2026-09-01&starts_to=2026-09-30"
GET /classes?starts_from=2026-09-01&starts_to=2026-09-30
  → 0 buổi
```

Hai nguyên nhân cộng dồn, cả hai ở `app/api/reports.py`:

1. `period_bounds` đóng đầu/mở cuối và **cộng thêm một ngày** cho cuối kỳ, còn
   `/classes` dùng `starts_at < starts_to` với đúng `end` → cả ngày cuối kỳ biến mất khỏi
   danh sách chi tiết.
2. `/classes` nhận `starts_from`/`starts_to` kiểu `datetime`; chuỗi `2026-09-30` trở thành
   **datetime naive**, so với cột `timestamptz` theo `TimeZone` của kết nối (UTC) → lệch
   thêm 7 giờ ở hai đầu kỳ. Rule `DTZ` của ruff không phủ tham số query nên không có gì báo.

`/reports/dashboard` hỏng cùng kiểu, nặng hơn: `sessions_today` trỏ `"/classes"` và
`bookings_today` trỏ `"/bookings"` — **không bộ lọc nào**, nên hai đường dẫn đó trả về toàn
bộ bảng chứ không phải các dòng tạo nên con số. Ngoài ra nhãn `"Lượt đăng ký hôm nay"`
thực chất đang đếm *số ghế đã đặt của các lớp diễn ra hôm nay*, không phải số lượt đăng ký
phát sinh hôm nay — hai đại lượng khác nhau.

Tiêu chí F09 *"Mọi con số trên bảng tổng hợp mở ra được danh sách chi tiết khớp với nó"*:
**không đạt**.

#### H4 — Chống deadlock của `change_booking` không có test nào chứng minh

`docs/business-rules.md` §9 gọi phép khoá trước hai `class_session` là *"cách duy nhất
không phải trông vào việc PostgreSQL gỡ deadlock"*. Hai đột biến:

| Đột biến | `test_booking_rules` + `test_booking_concurrency` |
|---|---|
| Xoá vòng khoá trước hai `class_session` (dòng 451–456) | 30 passed — **xanh** |
| Xoá `credit_ledger.lock_packages(db, sorted(candidate_ids))` (dòng 449) | 30 passed — **xanh** |

`test_cancelling_and_booking_in_opposite_order_do_not_deadlock` đo luồng **hủy lớp × đăng
ký**, không đụng `change_booking`. Không có test nào cho hai người đổi chéo A→B và B→A.

Test cần có: hai thread, học viên X đổi từ lớp 1 sang lớp 2, học viên Y đổi từ lớp 2 sang
lớp 1, chạy lặp vài lần; khẳng định **không** lần nào nhận `DeadlockDetected`/409
`CONCURRENT_CONFLICT`. Với bản có khoá trước thì xanh; bỏ khoá trước thì phải đỏ.

#### H5 — SAVEPOINT của `waitlist_service.promote` không có test nào chứng minh

Đột biến: bỏ hẳn `with db.begin_nested():`, giữ nguyên phần ghi `failure_reason`.
Kết quả: `test_waitlist.py` + `test_permission_matrix.py` + `e2e` = **41 passed**.

Lý do nó sống sót: cả ba test chuyển-chờ-thất-bại đều dùng `SESSION_FULL`, mà nhánh đó
`book()` raise **trước khi ghi bất cứ hàng nào**. SAVEPOINT chỉ có việc khi có hàng đã ghi
cần lùi lại — và không test nào dựng được tình huống đó.

Tình huống thật mà SAVEPOINT đang gánh: trong `book()`, hàng `booking` được flush (dòng
302–307) **trước** khi `credit_ledger.record()` chạy. Nếu `record()` raise
`INSUFFICIENT_CREDITS` (gói bị một transaction khác rút cạn giữa `_select_package` và
`record`), thì không có savepoint, request sẽ commit **một booking không có bút toán
`BOOKING_DEDUCT`** — vỡ bất biến #3 và #5, học viên có ghế miễn phí, và
`balance_cached = SUM(delta)` vẫn đúng nên constraint trigger không chặn.

Test cần có: monkeypatch/gài một `credit_ledger.record` raise `BusinessError` sau khi
booking đã flush, rồi khẳng định sau `promote` **không có hàng `booking` nào** và entry ở
`PROMOTION_FAILED` kèm lý do. Bỏ savepoint thì test đó phải đỏ.

#### H6 — Doanh thu không được ghim vào `confirmed_at`

Đột biến: `Payment.confirmed_at >= / <` → `Payment.recorded_at >= / <` trong
`_confirmed_in_period`. `tests/test_reports.py` = **11 passed, xanh**.

Test `test_a_payment_confirmed_at_studio_dawn_belongs_to_that_day` đặt `recorded_at` và
`confirmed_at` gần nhau nên không phân biệt được hai cột.

Kịch bản mà nó cần bắt: nhân viên ghi nhận tiền mặt ngày **28/10** (PENDING), quản lý xác
nhận ngày **03/11**. Doanh thu phải thuộc tháng 11. Test hiện tại không phát biểu điều đó.
Bù thêm: dựng một `payment` có `recorded_at` tháng trước và `confirmed_at` tháng này, khẳng
định nó nằm trong kỳ tháng này và **không** nằm trong kỳ tháng trước.

---

### Medium

#### M1 — Studio hủy lớp không dọn entry `PROMOTION_FAILED` (đã tái hiện)

`scheduling.cancel_session` (dòng 343–350) chỉ huỷ entry `WaitlistStatus.WAITING`.
`PROMOTION_FAILED` là trạng thái **mới ở M4** và nằm trong `waitlist_service.OPEN_STATUSES`,
nên sau khi lớp bị huỷ, entry đó vẫn "đang trong hàng chờ".

Probe: người chờ bị chuyển hỏng (`SESSION_FULL`) → studio huỷ lớp → entry vẫn ở
`PROMOTION_FAILED` và vẫn xuất hiện trong `entries_for_session()`.

Hậu quả: màn hàng chờ của một lớp đã huỷ vẫn hiện tên người đang đợi, và nhân viên bấm
"chuyển" lần nữa sẽ nhận `SESSION_CANCELLED` mãi. Sửa: dùng `waitlist_service.OPEN_STATUSES`
ở `cancel_session` thay cho `== WAITING`, và cập nhật `business-rules.md` §8 cho khớp
(hiện §8 cũng chỉ nói "entry `WAITING`").

#### M2 — Cờ ân hạn hoàn buổi cho một lớp **đã diễn ra xong** (đã tái hiện)

`cancel_booking` không kiểm buổi lớp đã qua; `MyScheduleItem.can_cancel` cũng chỉ hỏi
`status is BOOKED`. Với `has_reschedule_grace = True`, `in_time` luôn đúng.

Probe: đặt lớp → studio dời giờ (cờ ân hạn bật) → lớp diễn ra hôm qua → học viên bấm "Hủy"
→ `CANCELLED_INTIME`, **hoàn 1 buổi**.

Kịch bản thật: studio dời lớp sáng sang chiều; học viên không đến; chưa ai điểm danh (hệ
thống không có job nền); ba ngày sau học viên mở "Lịch của tôi", thấy nút Hủy kèm dòng chữ
"còn hoàn buổi", bấm, và lấy lại một buổi của một lớp đã dạy. Studio mất doanh thu một buổi
và không có dấu hiệu nào trên đối soát (sổ vẫn cân).

Đây chạm quyết định sản phẩm nên tôi **không đề xuất sửa thẳng**, mà nêu đánh đổi:

| Phương án | Được | Mất |
|---|---|---|
| Cấm hủy sau `starts_at` (`can_cancel = BOOKED và starts_at > now()`) | Đóng lỗ; khớp trực giác | Học viên vắng mặt không tự "đóng" được lượt đăng ký; nhân viên phải điểm danh |
| Cờ ân hạn hết hiệu lực tại `starts_at` | Giữ nguyên khả năng hủy muộn (không hoàn) | Vẫn cho hủy một lớp đã dạy, chỉ là không hoàn |
| Giữ nguyên | Không đổi gì | Mỗi lần dời lịch mở một cửa sổ hoàn buổi vô thời hạn cho người vắng mặt |

#### M3 — Bấm hai lần "vào danh sách chờ" trả 500 (đã tái hiện)

`waitlist_service.join` kiểm `existing is None` rồi `INSERT`, **không bắt `IntegrityError`**.
Probe ép hai transaction xen nhau (A flush chưa commit, B vào, A commit):

```
request thứ hai: IntegrityError (psycopg.errors.UniqueViolation) ... "uq_waitlist_..."
```

Đường HTTP: `get_db` rollback rồi re-raise → **500**, trong khi cùng thao tác ở luồng tuần
tự trả 409 `ALREADY_WAITING`. `book()` đã làm đúng việc này bằng
`_translate_booking_conflict`; `join()` bị bỏ sót. Cùng một cú double-click, hai mã lỗi khác
nhau tuỳ vận may về thời điểm.

#### M4 — Bộ lọc của màn hình gia hạn không có test, và lọc **sau** `LIMIT`

Đột biến vô hiệu hoá `max_credits` (biến nó thành no-op): `test_renewal_reminders.py` =
**12 passed, xanh**. `max_days` cũng không có test. Đây là một hạng mục nghiệm thu của F08
(*"Danh sách học viên sắp hết gói — lọc theo số buổi, hạn và trạng thái liên hệ"*).

Ngoài ra `candidates()` áp `LIMIT` **trong SQL** rồi mới lọc `max_credits`/`max_days`/
`contacted` **bằng Python**: lọc "còn ≤2 buổi" trên một studio có 300 người cần liên hệ sẽ
lọc trong 200 dòng đầu chứ không phải toàn bộ. Và `summary()` gọi `candidates()` với
`limit=500`, nên `needing_contact` âm thầm chặn trần ở 500.

#### M5 — Lượt test múi giờ ở CI bỏ sót đúng hai file mới của M4

`.github/workflows/ci.yml` chạy lượt `TZ=Asia/Ho_Chi_Minh` trên
`test_timezone_boundaries`, `test_timezone_rules`, `test_booking_rules`, `test_classes_api`
— **không có `test_reports.py` và `test_renewal_reminders.py`**, tức là đúng hai file chứa
logic biên ngày mới của M4 (`period_bounds`, `month_bounds`, ngưỡng 15 ngày).

Tôi đã chạy thử: `TZ=Asia/Ho_Chi_Minh uv run pytest -q tests/test_reports.py
tests/test_renewal_reminders.py` → **23 passed**. Thêm hai file vào lượt hai không tốn gì.

#### M6 — Bảy endpoint của M4 nằm ngoài ma trận phân quyền

`READ_MATRIX` phủ 11 đường dẫn nhưng thiếu: `/my-schedule`, `/my-schedule/bookable`,
`/waitlist/sessions/{id}`, `/reports/revenue/detail`, `/reports/trainers/export`,
`POST /renewals/contacts`, `/renewals/students/{id}/contacts`.

Bằng chứng đây là lỗ thật của bộ test, không phải của mã: đột biến **xoá
`assert_can_read_student` khỏi `/my-schedule/bookable`** → `test_permission_matrix` +
`test_booking_rules` + `test_waitlist` + `test_permissions` = **81 passed, xanh**. Mã sản
xuất đúng; không có test nào nói nó phải đúng.

Tiêu chí F10 *"Ma trận F01 × mọi endpoint, khẳng định cả cho phép và từ chối"*: chưa đạt.

#### M7 — `book` trả số dư từ `balance_cached`, `cancel` trả từ `SUM(delta)`

`booking_service.py:330` → `credits_remaining=locked_package.balance_cached`
`booking_service.py:410` → `credits_remaining=credit_ledger.balance_of(...)`

`app/services/credit_balance.py` mở đầu bằng đúng lý do không được làm vậy: *"Nếu màn hình
cũng đọc `balance_cached` thì hai biểu diễn hợp lại làm một, và một sai lệch — nếu bằng cách
nào đó xảy ra — sẽ hiển thị đúng bằng chính giá trị sai."* Hai endpoint anh em đang trả lời
cùng một câu hỏi từ hai nguồn. Sửa một dòng: dùng `credit_ledger.balance_of` ở cả hai.

Kèm theo, `ChangeBookingResult.cancelled.credits_remaining` là số dư **giữa chừng** (sau
hoàn, trước trừ) — một con số chưa bao giờ là trạng thái cuối. Nếu giao diện hiện nó thì
học viên thấy số dư nhảy hai nấc.

#### M8 — `promote` bắt cả `ForbiddenError` và `NotFoundError`

`NotFoundError`/`ForbiddenError` kế thừa `BusinessError` (`app/core/errors.py:22, 27`), nên
`except BusinessError` ở `promote` nuốt luôn chúng: một lỗi phân quyền sẽ được **ghi thành
`failure_reason` trên hàng chờ** và trả **200**.

Hôm nay chưa với tới được vì endpoint là `require_staff` và `assert_can_act_on` cho
STAFF/ADMIN đi thẳng. Nhưng nó cách một dòng routing: nếu sau này HLV được chuyển chờ cho
lớp mình dạy (một yêu cầu hoàn toàn hợp lý), thì một HLV bấm nhầm entry của lớp khác sẽ
nhận 200 và **lật trạng thái hàng chờ của người khác** sang `PROMOTION_FAILED`.

Sửa: `except BusinessError as exc:` → thêm `if isinstance(exc, ForbiddenError | NotFoundError): raise`,
hoặc bắt theo tập mã lỗi nghiệp vụ đã biết.

---

### Low

| # | Phát hiện | Ghi chú |
|---|---|---|
| L1 | `db.refresh(entry)` ở nhánh thành công của `promote` là **load-bearing nhưng không có test** — đột biến bỏ nó đi: 12 passed, xanh. Thiếu nó, hàng entry giữ lại `cancelled_at`/`cancelled_by_user_id` do `_release_own_waitlist` ghi (`synchronize_session=False` nên identity map không biết), thành một dòng vừa `PROMOTED` vừa đóng dấu "đã huỷ bởi X lúc T" | Probe xác nhận mã hiện tại đúng: `cancelled_at IS NULL` |
| L2 | Ba cơ chế khác không có test: `db.expire(booking)` sau UPDATE hủy; `FOR SHARE` khi đọc `starts_at` lúc hủy (chống đua với dời lịch); `_assert_session_bookable` chạy lại dưới khoá ghế. Cả ba đột biến đều xanh | `_assert_session_bookable` còn lớp thứ hai là trigger `trg_booking_requires_live_session`; `FOR SHARE` **không** có lớp thứ hai |
| L3 | `_select_package` đọc **không khoá**. Nếu gói được chọn bị rút cạn giữa lúc chọn và lúc `record()`, học viên nhận `INSUFFICIENT_CREDITS` ("gói chỉ còn 0 buổi") kể cả khi họ **còn gói khác dùng được**. Số dư không bao giờ âm (`record` khoá và đọc lại), chỉ là thông báo sai | Cân nhắc chọn lại gói một lần sau khi có khoá |
| L4 | `change_booking` khoá trước tập gói tính tại thời điểm đó. Nếu một transaction khác làm một gói mới "đang hoạt động" trong khe đó, `book()` sẽ lấy khoá gói **sau khi** đã giữ hai khoá `class_session` — nghịch thứ tự khoá toàn cục | Cửa sổ hẹp; đã có handler dịch `DeadlockDetected` thành 409 |
| L5 | `report_queries.unconfirmed_payments` không có `limit`; `renewal_query._base_query` gọi `LEDGER_SUM` 5 lần mỗi hàng (SELECT + 2× WHERE + 2× ORDER BY) | Không đáng lo ở quy mô một studio; `ix_credit_ledger_package` phủ được |
| L6 | `AccountCreate.phone` / `AccountUpdate.phone` / `full_name` chỉ có `max_length`, **không** `PHONE_PATTERN`, không sanitize — khác với `app/schemas/people.py` (đã vá ở M2/H3) | Chỉ ADMIN ghi được; nhưng `account.py` nằm trong phạm vi sửa của M4 nên nhắc ở đây |
| L7 | `to_xlsx` ghi thẳng ký tự `'` vào ô (openpyxl không coi nháy đầu là dấu định dạng như Excel UI), nên giá trị trong file **khác** giá trị đã lưu. An toàn nhưng docstring nói "hiển thị nguyên văn" là chưa đúng | Chính xác hơn: đặt `cell.data_type`/`quotePrefix` thay vì chèn ký tự |
| L8 | `neutralize` không phủ khoảng trắng đứng trước ký tự kích hoạt (`" =cmd..."`) | Ngoài danh sách tài liệu đã chốt; nêu để biết, không đề xuất đổi |
| L9 | `assert_can_read_student` trong `renewals.contact_history` **không với tới được**: route đã `require_staff`, mà hàm đó cho STAFF/ADMIN đi thẳng. Đột biến xoá nó đi: 40 passed, xanh (đột biến tương đương) | Phòng thủ thừa — theo tiêu chí "defensive paranoia" thì nên bỏ hoặc đổi route |
| L10 | `reports.dashboard` tra tên HLV bằng `trainer_names[...]` (KeyError → 500) trong khi `waitlist.pending` tra cùng thứ bằng `.get(..., "")` | Hai cách xử lý cùng một việc, cách nào cũng được nhưng nên thống nhất |

---

## Kiểm rồi, **không** phải vấn đề (đừng kiểm lại)

Trả lời trực tiếp 11 câu hỏi trong đề bài, kèm bằng chứng.

1. **Thứ tự khoá `book()`** — đúng: `_select_package` (đọc trần) → `lock_package` →
   `class_session FOR UPDATE`. Khe thời gian giữa chọn gói và khoá gói **có thật** nhưng
   không gây số dư âm: `credit_ledger.record()` gọi lại `lock_package` với
   `populate_existing=True` và kiểm `new_balance < 0` **dưới khoá**. Hệ quả duy nhất là
   thông báo lỗi có thể sai (L3). Đột biến bỏ `lock_package` sớm và bỏ `FOR UPDATE` đều
   chết đúng như bạn đã đo.
2. **`cancel_booking` / `db.refresh` → `db.expire`** — không có chỗ nào đọc thuộc tính hết
   hạn sai. Sau `db.expire(booking)`, các lần đọc `booking.student_package_id` (dòng 398,
   410) nạp lại từ CSDL **trong cùng transaction đã UPDATE**, nên giá trị đúng. Quy tắc
   hoàn `has_reschedule_grace or is_cancel_in_time(...)` **khớp** `business-rules.md` §4 —
   trừ trường hợp lớp đã diễn ra xong (M2).
3. **`change_booking`** — thứ tự khoá đúng (gói tăng dần → hai buổi lớp tăng dần). Tập gói
   ứng viên **đủ trong mọi trường hợp tuần tự**: gói cũ luôn có mặt qua
   `booking.student_package_id` (kể cả khi nó đang 0 buổi và không lọt `active_packages`).
   Chỉ hụt khi có transaction khác chen vào (L4).
4. **`promote` sau khi savepoint lùi** — session **sạch**. `book()` bọc riêng lần flush
   hàng `booking` trong savepoint của chính nó, nên `IntegrityError` không bao giờ thoát
   ra làm vỡ transaction ngoài; mọi đường thất bại tôi với tới được đều là `BusinessError`
   thuần ở tầng ứng dụng. 12 test hàng chờ xanh và `assert_ledger_is_sound` xanh sau mỗi
   test. **API trả 200 cho thao tác thất bại là quyết định đã chốt** (`business-rules.md`
   §8) — tôi không đề xuất đảo.
5. **`_release_own_waitlist` với `synchronize_session=False`** — identity map **có** cũ,
   nhưng nơi duy nhất đọc lại hàng đó (`promote`) đã `db.refresh(entry)` trước khi ghi
   (probe xác nhận `cancelled_at IS NULL` sau khi chuyển thành công). Đây là một cơ chế
   đúng mà không có test — xem L1.
6. **Nhập lần hai sinh thêm `PACKAGE_SOLD`?** — **Không.** Đột biến bỏ nhánh "gói đã có →
   bỏ qua" làm test đỏ ngay. `--dry-run` **rollback thật mọi thứ, kể cả dòng `import_run`**
   — đúng như bạn nghi, và đó chính là H2. Lỗi từng dòng **không** để lại trạng thái nửa
   vời (một transaction cho cả file), nhưng nó giết cả lần chạy (H1).
7. **`export.py`** — `FORMULA_TRIGGERS` khớp đúng danh sách tài liệu. **Không có đường nào
   đi vòng `neutralize`**: cả `to_csv` và `to_xlsx` đẩy mọi ô qua `_render` → `neutralize`,
   và hàng tiêu đề cũng qua. Đột biến làm `_render` bỏ qua `neutralize` → đỏ. `neutralize`
   dùng `isinstance(value, str)` nên phủ cả `StrEnum` và mọi lớp con của `str`. Tên file
   trong `Content-Disposition` dựng từ `date` đã validate — không chèn header được.
8. **`report_queries`** — `func.sum(<scalar subquery>)` trên outer join là **đúng**: mỗi
   `class_session` là một hàng trong nhóm nên một buổi có nhiều booking **không** bị đếm
   trùng; HLV không có lớp nào trong kỳ vẫn ra 0 chứ không biến mất.
   `class_stats` và `trainer_stats` **nhất quán**: cả hai loại lớp `CANCELLED` khỏi mẫu số
   *và* khỏi tử số. Hai đột biến bỏ bộ lọc đó sống sót, nhưng là **đột biến tương đương
   trên thực tế** — `cancel_session` đã chuyển mọi booking của lớp bị huỷ sang
   `CANCELLED_INTIME`, nên bộ lọc chỉ còn tác dụng ở ca biên (booking `ATTENDED`/`NO_SHOW`
   trên một lớp bị huỷ sau đó). Không đề nghị sửa mã.
9. **`renewal_query`** — ngưỡng là **HOẶC** thật: đột biến đổi `or_` thành `and_` làm test
   đỏ ngay. `aliased(RenewalContact, ranked)` trên subquery `row_number()` là cách dùng
   đúng và chạy **một truy vấn** cho cả danh sách (không N+1).
10. **Phân quyền** — không endpoint nào của M4 bỏ qua `assert_can_act_on`/`require_staff`.
    `my_schedule.py` ghim qua `assert_can_read_student` (đột biến bỏ nó khỏi `/my-schedule`
    → đỏ); `bookings.py::list_bookings` là `require_staff` và học viên đi đường
    `/my-schedule`. Bốn đột biến vượt quyền (học viên thao tác hộ người khác, HLV thao tác
    lớp không phải của mình, bỏ kiểm chủ sở hữu gói, bỏ ghim `/my-schedule`) **đều chết**.
    Lỗ duy nhất là **thiếu test**, không phải thiếu kiểm (M6).
11. **Rò rỉ dữ liệu** — không tái diễn lỗi M3. Mọi endpoint báo cáo/gia hạn là
    `require_staff`; `MyScheduleItem` và `WaitlistEntryResponse` không chứa gì ngoài dữ
    liệu của chính chủ; không có `booked_count`/`seats_left` nào lọt sang vai học viên
    trong M4.

Ngoài ra: **không N+1** trong M4 (mọi màn hình là số truy vấn hằng số); các index cần dùng
đã có (`ix_payment_status_confirmed_at`, `ix_booking_session_status`,
`ix_class_session_starts_at`, `ix_renewal_contact_student`, `ix_credit_ledger_package`);
**không gửi tin tự động** ở bất kỳ đâu trong luồng gia hạn (grep `smtp|httpx|requests|
send_mail` trên `renewals.py` + `renewal_query.py`: rỗng); không hardcode số 3; không bí
mật trong mã.

---

## Đột biến đã chạy (34) — bảng đầy đủ

**Chết (bộ test bắt được) — 22:**
`join()` chỉ chặn `WAITING` · `book()` không huỷ entry chờ của chính mình · ngưỡng gia hạn
HOẶC→VÀ · doanh thu bỏ lọc `CONFIRMED` · `period_bounds` theo UTC · `month_bounds` theo UTC
· bỏ nhánh bỏ-qua gói đã nhập · bỏ đối chiếu số dư với file · không chuẩn hoá số điện thoại
· đọc giờ file như UTC · tài khoản nhập có mật khẩu suy từ số điện thoại · `_render` bỏ qua
`neutralize` · hủy bỏ quy tắc ân hạn · học viên thao tác hộ người khác · HLV thao tác lớp
không phải của mình · bỏ kiểm chủ sở hữu gói · bỏ ghim `/my-schedule` · (+ 4 đột biến bạn
đã tự chạy, tôi không lặp lại) · `fill_rate` 0 thay vì `None` (đã có test sẵn).

**Sống sót (bộ test không bắt được) — 12:**

| Đột biến | Tệp | Kết luận |
|---|---|---|
| Bỏ SAVEPOINT ở `promote` | `waitlist_service.py` | H5 |
| Đánh dấu `PROMOTION_FAILED` bên trong savepoint | `waitlist_service.py` | Tương đương (handler ghi lại sau đó) — không phải lỗi |
| Bỏ `db.refresh(entry)` | `waitlist_service.py` | L1 |
| Bỏ khoá trước hai `class_session` ở `change_booking` | `booking_service.py` | H4 |
| Bỏ `lock_packages` ở `change_booking` | `booking_service.py` | H4 |
| Bỏ `db.expire(booking)` | `booking_service.py` | L2 |
| Bỏ `FOR SHARE` khi đọc `starts_at` lúc hủy | `booking_service.py` | L2 |
| Bỏ `_assert_session_bookable` lần hai dưới khoá | `booking_service.py` | L2 (có trigger đỡ) |
| Doanh thu theo `recorded_at` | `report_queries.py` | H6 |
| Bỏ lọc `PENDING` ở `unconfirmed_payments` | `report_queries.py` | Thiếu test (mã đúng) |
| `max_credits` thành no-op | `renewal_query.py` | M4 |
| Chạy thử lại `db.commit()` / bỏ dòng `import_run` | `import_initial_data.py` | H2 |
| Bỏ `assert_can_read_student` ở `/my-schedule/bookable` | `my_schedule.py` | M6 |
| `neutralize` chỉ nhận `str` chính xác (`type(v) is str`) | `export.py` | Tương đương hôm nay — không phải lỗi |
| Bỏ `assert_can_read_student` ở `contact_history` | `renewals.py` | Tương đương (route đã `require_staff`) — L9 |

Ngoài đột biến, **khẳng định yếu**: không tìm thấy `assert x >= 1` hay
`status_code == 200` trần nào trong các file test M4 (grep sạch). Không thấy test nào phụ
thuộc thứ tự chạy — `pytest-randomly` đang bật và bộ test xanh qua nhiều lần xáo.
`test_two_staff_promoting_into_one_seat_fill_it_once` có nuốt exception thành `False`
(`except Exception: return False`), nên nó **không** phân biệt được "trả 200 kèm
`promoted=false`" với "ném 500"; và nó dựng hai entry khác nhau chứ không phải hai nhân
viên bấm **cùng một entry** — ca sau chưa có test.

---

## Đối chiếu tiêu chí nghiệm thu (phần backend)

### Phase 08 — F07

| Tiêu chí | Kết quả |
|---|---|
| 7 hạng mục hoàn thành | ✅ (phần BE) |
| Không lớp nào vượt sức chứa dưới tải đồng thời | ✅ |
| Không số dư âm, gồm hai lớp khác giờ cùng lúc | ✅ |
| Không trừ đôi; hủy idempotent, double-click hoàn 1 buổi | ✅ |
| Không đặt được bằng gói người khác — chặn ở tầng DB | ✅ (2 test, cả tầng app và FK) |
| Booking và bút toán luôn đi cùng nhau | ⚠️ cơ chế đúng, **nhưng SAVEPOINT giữ tính chất này ở luồng chuyển chờ không có test** (H5) |
| Hủy đúng hạn/muộn, đúng ở cả hai múi giờ | ✅ |
| Admin trả buổi thủ công, bắt buộc lý do, lưu người thực hiện | ✅ (F05) |
| DS chờ không tự đẩy; thất bại có trạng thái + lý do; entry tự huỷ khi đặt trực tiếp | ⚠️ đạt, **trừ** entry `PROMOTION_FAILED` không bị dọn khi studio huỷ lớp (M1) |
| Ba đường vào cùng kết quả; HLV không đặt thay ngoài lớp mình | ✅ |
| Học viên chỉ thấy và thao tác trên dữ liệu của mình | ⚠️ mã đúng, `/my-schedule/bookable` không có test âm (M6) |
| Bộ 7 bất biến ledger xanh sau toàn bộ test booking | ✅ |
| Trạng thái hoàn buổi hiện bằng chữ | ✅ (BE trả `refunded` / `refund_if_cancelled_now`) |

### Phase 09 — F08

| Tiêu chí | Kết quả |
|---|---|
| 3 hạng mục hoàn thành | ⚠️ "lọc theo số buổi/hạn" có mã, **không có test** (M4) |
| Ngưỡng ≤6 buổi **hoặc** ≤15 ngày, có test từng nhánh và nhánh chỉ thoả một điều kiện | ✅ |
| Chỉ gói đang hoạt động theo định nghĩa F00 | ✅ |
| Ngày biên tính đúng theo `Asia/Ho_Chi_Minh` | ⚠️ mã đúng + có test, **nhưng test không chạy trong lượt `TZ` của CI** (M5) |
| Số buổi trong danh sách khớp ledger | ✅ |
| Lịch sử liên hệ append, lưu người thực hiện | ✅ |
| Không gửi tin tự động ở bất kỳ đâu | ✅ |
| Bảng tổng hợp không có số liệu kinh doanh | ✅ (`RenewalSummary` chỉ đếm người) |

### Phase 10 — F09

| Tiêu chí | Kết quả |
|---|---|
| 4 hạng mục hoàn thành | ✅ |
| Doanh thu chỉ gồm giao dịch đã xác nhận — test với `PENDING` và `VOID` | ✅ (nhưng mốc `confirmed_at` không được ghim — H6) |
| Biên kỳ tính đúng theo `Asia/Ho_Chi_Minh` | ⚠️ mã đúng, thiếu lượt CI theo giờ studio (M5) |
| **Mọi con số trên bảng tổng hợp mở ra được danh sách chi tiết khớp với nó** | ❌ **không đạt** (H3, đã tái hiện) |
| Số lớp theo HLV khớp con số ở chi tiết HLV | ✅ (một hàm, có test đối chiếu hai màn) |
| File xuất khớp chính xác bộ lọc và dữ liệu màn hình — có test | ✅ |
| Ô bắt đầu bằng `=`, `+`, `-`, `@` được trung hoà — có test | ✅ (phủ cả tab và CR) |
| Có danh sách gói thanh toán chưa xác nhận quá hạn | ✅ |

### Phase 11 — F10 (phần backend)

| Tiêu chí | Kết quả |
|---|---|
| Luồng chính chạy đúng đầu-cuối | ✅ (`e2e/test_main_flow.py`) |
| 7 bất biến ledger xanh | ✅ |
| Không vượt sức chứa, không số dư âm dưới tải đồng thời | ✅ |
| Double-click hủy chỉ hoàn 1 buổi; hủy lớp đua đặt chỗ không mất buổi của ai | ✅ |
| Ma trận phân quyền đúng; không truy cập dữ liệu người khác bằng id | ⚠️ 7 endpoint M4 ngoài ma trận (M6) |
| Khoá tài khoản làm mất hiệu lực token đang dùng | ✅ |
| API công khai không trả PII ngoài allow-list | ✅ (M2) |
| Test biên hủy cho cùng kết quả ở hai `TZ` | ✅ |
| **Nhập dữ liệu chạy lại nhiều lần không nhân đôi số dư; số dư khớp file Excel** | ⚠️ `run_import` đạt và có test tốt; `main()` (`--commit`/chạy thử/`import_run`) **không có test** (H2) và một dòng đụng `UNIQUE` vẫn giết cả lần chạy (H1) |
| Tài khoản nhập từ Excel không có mật khẩu suy ra được | ✅ |
| Cách rollback migration chạm `credit_ledger` đã ghi vào `docs/deployment.md` | ✅ |

Các tiêu chí Soul-1, axe-core, 400px, rà P3 thủ công, dựng PROD/sao lưu: ngoài phạm vi
review backend này.

---

## Việc nên làm, theo thứ tự

1. **H1** — bọc từng dòng nhập liệu trong savepoint, dịch `IntegrityError` thành
   `report.problems`. Đây là thứ chặn giữa bạn và một buổi chiều 12/11 rất dài.
2. **H2** — chốt hành vi `import_run` khi chạy thử (cần người quyết: ghi ngoài transaction
   hay sửa tài liệu), rồi viết test cho `main()`: chạy thử không để lại hàng nào; `--commit`
   ghi đúng một `import_run` với `file_hash` đúng.
3. **H3** — `detail_path` phải sinh ra đúng khoảng mà con số dùng (đẩy `starts_to` sang ngày
   kế tiếp, hoặc cho `/classes` nhận `date` và tự quy đổi theo giờ studio); `dashboard` phải
   kèm bộ lọc vào hai đường dẫn còn lại.
4. **H4, H5, H6** — ba test còn thiếu cho ba cơ chế đã có (đổi lớp chéo nhau; chuyển chờ
   hỏng **sau khi** hàng booking đã ghi; doanh thu có `recorded_at` khác tháng
   `confirmed_at`).
5. **M1, M3, M7, M8** — bốn bản vá nhỏ, mỗi cái vài dòng.
6. **M5, M6, M4** — mở rộng lượt `TZ` của CI, bổ sung 7 endpoint vào `READ_MATRIX`, test
   hai bộ lọc của màn gia hạn và đẩy chúng vào SQL trước `LIMIT`.
7. **M2** — cần người quyết trước khi sửa (bảng đánh đổi ở trên).

---

## Khôi phục nguyên trạng

Tôi đã sửa mã sản xuất **34 lần** để chạy đột biến, mỗi lần sao lưu trước và khôi phục
ngay sau. 8 tệp từng bị chạm:
`app/services/{booking_service,waitlist_service,renewal_query,report_queries,export}.py`,
`app/api/{my_schedule,renewals}.py`, `scripts/import_initial_data.py`.
Ba tệp probe tạm (`tests/test_zz_probe.py`) đã xoá.

Kiểm chứng sau khi khôi phục:

- `diff` từng tệp với bản sao lưu: **giống hệt**, không tệp nào lệch.
- `uv run ruff check .` → `All checks passed!`
- `uv run alembic check` → `No new upgrade operations detected.`
- `uv run pytest -q` → **421 passed** (421 test được collect).
  *Ghi chú:* lượt đo đầu tiên của tôi, trước mọi đột biến, đếm 416 — đúng bằng số bạn nêu.
  Chênh lệch 5 bằng đúng số test của `tests/test_import_template.py`, một tệp **không** nằm
  trong danh sách phạm vi review và **không** bị tôi chạm tới. Tôi không giải thích được
  chênh lệch này bằng thao tác nào của mình; mọi tệp sản xuất đã được đối chiếu byte-by-byte
  và không tệp test nào bị thêm hay bớt. Nêu ra để bạn kiểm lại nếu con số 416 là mốc bạn
  đang theo dõi.

---

## Câu hỏi chưa giải quyết

1. **Chạy thử (`--dry-run`) có phải ghi lại dấu vết không?** `business-rules.md` §16 nói
   "mỗi lần chạy ghi một dòng `import_run`", mã hiện rollback luôn dòng đó. Ghi ngoài
   transaction, hay sửa tài liệu?
2. **Hủy một buổi lớp đã diễn ra xong có được phép không?** Và cờ ân hạn có nên hết hiệu
   lực tại `starts_at` không? (M2 — ba phương án kèm đánh đổi ở trên.)
3. **HLV có được chuyển người chờ vào lớp mình dạy không?** Nếu có thì phải vá M8 trước.
4. Còn nợ từ M3 và chưa đổi: `VOID` thanh toán của gói có buổi từ nguồn khác (đang **từ
   chối**); "Chi tiết HLV / thống kê tháng" hiện chỉ nhân viên xem được (`require_staff`) —
   HLV không xem được số của chính mình.
5. Còn nợ từ M1/M2: PROD chạy mấy uvicorn worker, có reverse proxy không, FE render
   `announcement.body` bằng `innerHTML` hay text.

```
Status: DONE_WITH_CONCERNS
Summary: Logic lõi của M4 đúng và chịu được 22/34 đột biến, nhưng script nhập liệu vẫn chết bằng traceback khi một dòng đụng UNIQUE, `main()` của nó không có test nào, và tiêu chí "mọi con số mở ra được danh sách chi tiết khớp với nó" đã được tái hiện là không đạt.
Concerns/Blockers: H1 và H2 nên vá trước buổi diễn tập nhập liệu; H3 chặn nghiệm thu F09; H4/H5/H6 là ba cơ chế đã cài đặt nhưng không có test nào chứng minh — cùng loại lỗ mà M3 đã gặp. M2 cần người dùng quyết trước khi sửa.
```
