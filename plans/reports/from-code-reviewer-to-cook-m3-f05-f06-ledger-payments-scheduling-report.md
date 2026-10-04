# Review M3 (F05 + F06) — Backend Pilates Studio

Ngày: 2026-09-14 · Reviewer: `code-reviewer` subagent · Trạng thái: DONE_WITH_CONCERNS
Phạm vi: 6 service (~1126 LOC) + 4 API + 4 file test (~1892 LOC).
Phương pháp: đọc mã + 5 probe chạy thật + **1 mutation test** đo chất lượng test đua.

## Phát hiện và cách xử lý

| # | Mức | Phát hiện | Xử lý |
|---|---|---|---|
| C1 | Critical | `void_payment` thu hồi **toàn bộ** số dư, gồm cả buổi từ gia hạn / điều chỉnh tay / nhập liệu — guard chỉ nhìn bảng `payment`. Đã tái hiện: gói 5+7+3 → VOID → mất 10 buổi không thuộc giao dịch bị huỷ, và **đối soát vẫn báo sạch** | Đã vá: guard mở rộng sang mọi nguồn buổi khác lần bán (`PACKAGE_HAS_CREDITS_FROM_OTHER_SOURCES`); 2 test âm |
| H1 | High | Test đua của hủy lớp là **test giả** — reviewer monkeypatch bản lỗi (không khoá `class_session`, đọc booking một lần) và test vẫn xanh | Đã viết lại: `test_cancelling_holds_the_session_lock_while_refunding` khẳng định thẳng vào phép khoá bằng `FOR UPDATE NOWAIT` từ kết nối khác. **Đã tự chạy lại mutation: test giờ đỏ đúng** |
| H2 | High | Bước đọc lại chỉ đúng nếu mọi đường ghi `booking` cũng khoá `class_session` — hợp đồng chỉ tồn tại trong docstring | Đã vá (migration 0006): trigger `trg_booking_requires_live_session` đọc trạng thái bằng **`FOR SHARE`** nên chờ transaction hủy commit rồi mới phán quyết |
| H3 | High | `create_recurring_sessions` bỏ qua kiểm HLV (lịch lặp lại tạo được lớp cho HLV đã ngừng hoạt động) và nuốt **mọi** `IntegrityError` thành "trùng giờ" | Đã vá: gọi `assert_trainer_bookable`; dùng lại `translate_overlap` (nó re-raise khi constraint không khớp) |
| M1 | Medium | `GET /classes/{id}` trả `booked_count`/`seats_left`/`cancel_reason` cho mọi học viên — phá chính quy tắc mà `/public/schedule` giữ | Đã vá: học viên nhận 404 với lớp đã hủy, và chỉ thấy "còn chỗ / hết chỗ" |
| M2 | Medium | Bất biến #6 phát biểu "không vượt số buổi đã cấp" nhưng `granted` tăng cùng nhịp với `SUM(delta)` nên không đỏ được vì lý do đó | Đã vá: đổi thành `LEDGER_6_CONSUMPTION_ENTRIES_ARE_NEGATIVE` — phát biểu đúng điều nó kiểm |
| M3 | Medium | `has_reschedule_grace` không bao giờ được gỡ → quyền hủy muộn không mất buổi vĩnh viễn | Đã vá: gỡ cờ khi lần dời mới trả lại đủ cửa sổ hủy của loại lớp |
| M4 | Medium | Assert `>= 1` cho tiêu chí 19, cộng một dòng `assert session["id"]` vô nghĩa | Đã vá: dựng buổi ở tháng cố định, assert chính xác 2/1/0 kèm nhiễu (HLV khác, tháng liền kề); thêm test biên tháng theo giờ studio |
| M5 | Medium | Không test nào cho tiêu chí 16 (hủy lớp huỷ hàng chờ) | Đã vá: 2 test — huỷ entry `WAITING` kèm người + thời điểm, và giữ nguyên entry đã `PROMOTED` |
| M6 | Medium | `reschedule`/`change_trainer` đọc trạng thái không khoá → ghi đè lên lớp vừa bị hủy | Đã vá: `_get_session(lock=True)` cho mọi đường ghi; cấm dời **mọi** lớp về quá khứ, không riêng lớp có người đăng ký |
| L1 | Low | `DeadlockDetected` ở nhánh hiếm → 500 kèm traceback | Đã vá: exception handler dịch thành 409 `CONCURRENT_CONFLICT` |
| L3 | Low | `/packages/{id}/ledger` trả 404 vs 403 → oracle dò id | Đã vá: cả hai trả 404 |
| L4 | Low | Học viên chưa nối hồ sơ nhận 404 thay vì 403 | Đã vá |
| L5 | Low | `adjust_credits` chạy thừa một `SELECT ... FOR UPDATE` | Đã vá |
| L6 | Low | Subquery của `/public/schedule` gom toàn bộ bảng `booking` | Đã vá: đẩy điều kiện ngày vào subquery |
| L7 | Low | Test "bắt buộc có lý do" chỉ chạm `min_length` của Pydantic, không tới nhánh service | Đã vá: gọi thẳng service để chạm nhánh đó |
| L8 | Low | `test_student_can_read_own_ledger_only` chỉ kiểm nửa "only" | Đã vá: kiểm cả hai vế |
| L2, L9 | Low | Quan sát về cấu trúc mệnh đề #5 và về test SAVEPOINT | Ghi nhận, không đổi |

## Lỗi thật do test đua mới phát hiện (không nằm trong báo cáo review)

`lock_package` chạy `SELECT ... FOR UPDATE` và **lấy đúng khoá**, nhưng SQLAlchemy
trả về object cũ trong identity map thay vì nạp lại hàng vừa đọc. `record()` vì
thế cộng delta lên một `balance_cached` đã lỗi thời — khoá thì đúng, số thì sai.
Xảy ra thật ở luồng hủy lớp khi có người chen vào giữa chừng.

Đã vá: `execution_options(populate_existing=True)`, kèm `db.flush()` trước đó vì
session tắt autoflush và `populate_existing` sẽ nạp đè lên thay đổi chưa ghi
(phát hiện khi test gia hạn mất ngày vừa cộng).

## Quan sát của reviewer (không phải lỗi — ghi lại để không ai đảo ngược)

- Thứ tự khoá của `lock_packages` là thật: `EXPLAIN` cho `LockRows → Sort → Seq Scan`.
- `record()` đúng là cổng duy nhất — grep toàn `app/` + `scripts/`.
- Không lock-order inversion giữa `cancel_session` và luồng đăng ký F07.
- SAVEPOINT rollback ở `recurrence` để lại session dùng được, không rò bản ghi.
- Không chỗ nào hardcode 3.
- `corrupted()` khôi phục schema sạch qua nhiều lần chạy.

## Trạng thái sau khi vá

`ruff check .` sạch · `alembic check` không op mới · `pytest -q` = **286 passed** (trước review: 279).
Migration: 6. Bốn tiêu chí trượt (7, 14, 16, 19) đã đạt.

Mutation của reviewer chạy lại trên bộ test mới: **chết** — `test_cancelling_holds_the_session_lock_while_refunding` đỏ đúng bản lỗi.

## Câu hỏi chưa giải quyết

1. Gói có buổi từ gia hạn/điều chỉnh tay: `VOID` **từ chối** (đang chạy) hay **chỉ thu hồi phần thuộc lần bán đầu**? Phương án hai cần gắn `payment_id` vào bút toán ledger — đổi schema, cần khách chốt.
2. "Chi tiết HLV" (tiêu chí 19) là màn của nhân viên hay HLV tự xem? Hiện `require_staff` chặn HLV xem số của chính mình.
3. Còn nợ từ M1/M2: PROD chạy mấy uvicorn worker, có reverse proxy không, FE render `announcement.body` bằng `innerHTML` hay text.
