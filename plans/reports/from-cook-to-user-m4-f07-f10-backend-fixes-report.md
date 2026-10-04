# M4 — vá sau review (F07 + F08 + F09 + F10 backend)

Ngày: 2026-09-14 · Nguồn: `from-code-reviewer-to-cook-m4-f07-f10-booking-waitlist-reports-import-report.md`

## Kết quả

| | Trước review | Sau vá |
|---|---|---|
| Test | 421 | **446** |
| Đột biến sống sót (reviewer đo) | 12 | 0 trên 8 bản vá đã kiểm lại |
| Tiêu chí nghiệm thu trượt | 3 | 0 |

`ruff` sạch · `alembic check` sạch · chuỗi 6 migration replay từ `base` · 7 mệnh đề đối soát xanh.

## Đã vá

| Mã | Vấn đề | Cách vá | Test ghim |
|---|---|---|---|
| H1 | Một dòng đụng `UNIQUE` giết cả lần nhập bằng traceback | Mỗi dòng ghi trong savepoint riêng; va chạm thành một dòng `problems` chỉ đúng vị trí. Tài khoản tạo **sau** khi dòng người đã vào, nên dòng hỏng không để lại tài khoản mồ côi | `test_two_rows_sharing_a_phone_*`, `test_two_rows_sharing_an_email_*` |
| H2 | `main()` không có test; chạy thử rollback luôn dòng `import_run` nên `dry_run` là mã chết | `record_run` ghi bằng transaction riêng, commit độc lập với dữ liệu | 3 test mới cho `main()` |
| H3 | Báo cáo nói 1 lớp, `detail_path` của chính nó trả 0 lớp | `_range_query` sinh đúng khoảng nửa mở; `as_studio_time` ở biên API (mốc naive = giờ studio); `/bookings` nhận lọc theo giờ lớp; nhãn "Lượt đăng ký hôm nay" → "Lượt đến lớp hôm nay" | `test_class_report_number_matches_the_list_behind_its_own_link`, `test_every_dashboard_number_opens_a_list_of_the_same_size` |
| H4 | Khoá trước hai `class_session` ở `change_booking` không ai chứng minh | — (mã đã đúng) | `test_two_students_swapping_classes_with_each_other_do_not_deadlock` |
| H5 | SAVEPOINT ở `promote` không ai chứng minh | — (mã đã đúng) | `test_a_promotion_that_fails_after_writing_leaves_no_booking_behind` |
| H6 | Doanh thu không ghim vào `confirmed_at` | — (mã đã đúng) | `test_revenue_belongs_to_the_month_of_confirmation_not_of_recording` |
| M1 | Hủy lớp bỏ sót entry `PROMOTION_FAILED` | `OPEN_WAITLIST_STATUSES` về `domain/rules.py`, dùng chung | `test_cancelling_the_class_also_closes_entries_that_failed_to_promote` |
| M2 | Ân hạn hoàn buổi cho lớp **đã dạy xong** | Ân hạn hết hiệu lực tại `starts_at`; quy tắc hoàn gom vào `refunds_on_cancel`, màn "Lịch của tôi" gọi chung | 2 test |
| M3 | Double-click "vào chờ" trả 500 | Dịch va chạm index thành 409 `ALREADY_WAITING` | `test_double_clicking_join_returns_a_business_error_not_a_crash` |
| M4 | Bộ lọc gia hạn chạy **sau** `LIMIT`; `summary` chặn trần 500 | Đẩy `max_credits`/`max_days`/`contacted` xuống SQL; `summary` dùng `limit=None` | 4 test |
| M5 | Lượt `TZ` ở CI bỏ sót hai file mới | Thêm `test_reports`, `test_renewal_reminders` | 116 test chạy dưới giờ studio |
| M6 | 7 endpoint M4 ngoài ma trận phân quyền | Bảng thứ hai cho endpoint mang id + test riêng cho `POST /renewals/contacts` | 2 test |
| M7 | `book` trả `balance_cached`, `cancel` trả `SUM(delta)` | Cả hai dùng `credit_ledger.balance_of` | (đột biến tương đương — không test được) |
| M8 | `promote` nuốt `ForbiddenError`/`NotFoundError` | Re-raise trước khi ghi `failure_reason` | `test_a_permission_error_during_promotion_*` |
| L1 | `db.refresh(entry)` ở `promote` không ai chứng minh | — | `test_a_promoted_entry_is_not_also_stamped_as_cancelled` |
| L2 | `FOR SHARE` khi đọc giờ học lúc hủy không ai chứng minh | — | `test_cancelling_reads_the_class_time_under_a_lock` |
| L7 | Docstring `neutralize` mô tả sai hành vi | Sửa docstring, nêu rõ đánh đổi | — |
| L10 | Hai cách tra tên HLV khác nhau | Thống nhất truy cập trực tiếp (FK bảo đảm có) | — |

## Kiểm chứng bằng đột biến

8 đột biến áp vào mã sản xuất, mỗi cái làm ít nhất một test mới đỏ, rồi khôi phục:

1. `change_booking` bỏ khoá hai buổi lớp → 3/3 lần lặp đỏ
2. `promote` bỏ SAVEPOINT → đỏ
3. doanh thu theo `recorded_at` → đỏ
4. `detail_path` quay về dạng ngày → đỏ
5. `max_credits` thành no-op → 2 test đỏ
6. ân hạn không hết hiệu lực tại `starts_at` → 2 test đỏ
7. hủy lớp chỉ dọn `WAITING` → đỏ
8. `promote` nuốt lỗi phân quyền → đỏ

## Không vá, có lý do

- **M7 không test được**: `balance_cached` và `SUM(delta)` luôn bằng nhau nhờ constraint trigger, nên đột biến đổi qua lại là tương đương. Sửa vì lý do thiết kế — giữ hai biểu diễn độc lập — không vì một lỗi quan sát được.
- **L3** (`_select_package` đọc không khoá → thông báo lỗi có thể sai khi học viên còn gói khác): số dư không bao giờ âm, chỉ là câu thông báo chưa tối ưu. Chưa sửa; sửa đúng cách là chọn lại gói sau khi có khoá, đáng làm khi có báo cáo thật từ người dùng.
- **L4** (khe hẹp ở `change_booking` khi một gói mới thành "đang hoạt động" giữa chừng): đã có handler dịch `DeadlockDetected` thành 409.
- **L6** (`account.py` thiếu `PHONE_PATTERN`): chỉ ADMIN ghi được, và đây là schema của M1 chứ không phải M4.
- **L8** (`neutralize` không phủ khoảng trắng trước ký tự kích hoạt): ngoài danh sách ký tự đã chốt trong tài liệu.
- **L9** (`assert_can_read_student` thừa ở `contact_history`): phòng thủ thừa, giữ lại.

## Chênh lệch số test 416 → 421 mà reviewer nêu

Do tôi: trong lúc review chạy, tôi thêm `tests/test_import_template.py` (5 test) như một phần việc F10 còn lại. Không liên quan tới thao tác nào của reviewer.

## Hiệu năng ở khối lượng thật

Đo trên CSDL tạm riêng (400 học viên · 1.200 gói · 5.841 buổi lớp · 13.184 đăng ký · 14.384 dòng sổ), đã xoá sau khi đo:

| Truy vấn | p50 |
|---|---|
| Đối soát 7 mệnh đề | 28 ms |
| Danh sách nhắc gia hạn (250 dòng) | 13 ms |
| Doanh thu chi tiết (1.000 dòng) | 4 ms |
| Đặt lớp, tuần tự | 8,4 ms (p95 11 ms) |
| Đặt lớp, 10 luồng song song | 39 ms (p95 50 ms) |

30/30 lượt đặt song song thành công; sau đó 0 vi phạm bất biến, 0 lớp vượt sức chứa, 0 gói âm số dư. Không truy vấn nào cần thêm index.

## Câu hỏi còn nợ

1. **Hủy một lớp đã diễn ra xong** — hiện cho phép nhưng không bao giờ hoàn. Phương án chặt hơn là cấm hẳn sau `starts_at`; đổi lại học viên vắng mặt không tự đóng được lượt đăng ký.
2. **HLV chuyển người chờ vào lớp mình dạy** — hiện `require_staff`. Mở cho HLV thì service đã phủ, không cần đổi gì thêm.
3. **`VOID` thanh toán của gói có buổi từ nguồn khác** — đang từ chối (nợ từ M3). Phương án "chỉ thu hồi phần của lần bán" cần gắn `payment_id` vào bút toán ledger, tức đổi schema.
4. **Thống kê tháng của HLV** — `require_staff`, nên HLV không xem được số của chính mình.
5. **Nợ từ M1/M2** — PROD chạy mấy uvicorn worker, có reverse proxy không, FE render `announcement.body` bằng `innerHTML` hay text.
6. **`docs/huong-dan-su-dung.md`** chưa viết: nó mô tả thao tác trên màn hình mà FE chưa có.
