# Review M1 (F00 + F01) — Backend Pilates Studio

Ngày: 2026-09-14 · Reviewer: `code-reviewer` subagent · Trạng thái: DONE_WITH_CONCERNS
Phạm vi: 33 file Python (~3.851 dòng) + 3 migration + CI/compose.
Mọi phát hiện đều được tái hiện bằng script chạy thật trên DB test (5434) + TestClient.

## Phát hiện và cách xử lý

| # | Mức | Phát hiện | Xử lý |
|---|---|---|---|
| C1 | Critical | `decode_access_token` không kiểm claim `typ` → refresh token dùng được làm access token; `logout`/đổi mật khẩu không chạm tới nó | Đã vá: thêm `typ: "access"` khi phát và bắt buộc kiểm; test âm `test_refresh_token_cannot_be_used_as_access_token` |
| C2 | Critical | `JWT_SECRET` mặc định chạy được ở PROD, không lỗi không cảnh báo | Đã vá: `model_validator` từ chối secret mặc định và secret <32 ký tự khi `environment == "prod"`; `tests/test_config_guards.py` |
| H1 | High | `login_limiter.reset(ip_key)` sau đăng nhập thành công → rải mật khẩu qua nhiều tài khoản vòng qua được (59/59 lần không bị chặn) | Đã vá: tách `assert_allowed`/`register`; chỉ tính lần **thất bại** cho IP, chỉ reset bộ đếm **tài khoản**; test `test_ip_throttle_survives_a_successful_login` |
| H2 | High | `RateLimiter._buckets` tăng vô hạn; key đến từ body ẩn danh → OOM | Đã vá: `_prune_if_needed` dọn bucket nguội khi vượt ngưỡng 10.000 key |
| H3 | High | `/auth/forgot-password` không giới hạn tần suất; gửi mail đồng bộ lộ email qua thời gian phản hồi | Đã vá: `password_reset_limiter` theo IP + email; gửi mail qua `BackgroundTasks` |
| M1 | Medium | `rotate_refresh_token` không khoá hàng → hai refresh song song đá người dùng khỏi mọi thiết bị | Đã vá: `.with_for_update()` + **cửa sổ ân hạn 10s** cho lần gửi trùng (chuẩn Auth0/Okta); ngoài cửa sổ vẫn thu hồi sạch |
| M2 | Medium | `consume_password_reset` đọc-rồi-ghi → hai reset song song cùng thành công | Đã vá: `UPDATE ... WHERE used_at IS NULL RETURNING` + kiểm rowcount; `tests/test_concurrency_auth.py` |
| M3 | Medium | `btrim()` chỉ cắt dấu cách → `note = '\n'`/U+00A0 qua được CHECK "bắt buộc lý do" | Đã vá (migration 0004): `requires_meaningful_text()` dùng lớp ký tự phủ cả khoảng trắng Unicode; áp cho `credit_ledger.note` và `payment.void_reason` |
| M4 | Medium | `BOOKING_DEDUCT`/`CANCEL_REFUND` cho phép `booking_id` NULL → hai partial unique index mù | Đã vá (migration 0004): CHECK bắt buộc `booking_id IS NOT NULL` cho hai reason đó |
| M5 | Medium | `TRUNCATE` vòng qua trigger append-only | Đã vá (migration 0004): trigger `BEFORE TRUNCATE ... FOR EACH STATEMENT` |
| M6 | Medium | `conftest.py` chép tay `CREATE TRIGGER` → schema test có thể lệch PROD mà không gì báo | Đã vá: conftest chạy **chính chuỗi migration** (`alembic upgrade head`) |
| M7 | Medium | `create_account` check-then-insert → 500 khi tạo trùng email đồng thời | Đã vá: bắt `IntegrityError` → 422 `EMAIL_TAKEN` |
| M8 | Medium | `_client_ip` không xử lý proxy → cả studio dùng chung một bucket IP | Đã vá: cờ `trust_proxy_headers`, mặc định **không** tin header |
| L2 | Low | `is_refresh_token_live` không nơi nào dùng | Đã gỡ. `require_staff`/`scope_*` giữ lại — M2 dùng ngay |
| L3 | Low | Chú thích dẫn `docs/deployment.md` chưa tồn tại; docs hứa file của F02/F05 | Đã sửa: dẫn `business-rules.md §12`, đánh dấu rõ file nào dựng ở phase nào |
| L4 | Low | `GET /accounts` không phân trang | Đã thêm `limit`/`offset` |
| L5 | Low | Email gửi trước commit → link trỏ token không tồn tại | Đã vá: commit trước, gửi qua `BackgroundTasks` |
| L6 | Low | `for _ in range(1)` vô nghĩa; `today() == now().date()` gần tautology và nhấp nháy quanh nửa đêm | Đã vá cả hai |
| L7 | Low | `waitlist_entry` thiếu `cancelled_at`; `announcement` thiếu `updated_at/by` | Đã thêm ở migration 0004 — tránh ALTER ở phase sau |
| L1 | Low | `scope_students`/`scope_class_sessions` chưa nơi nào gọi | Giữ nguyên; **bắt buộc dùng ở M2** khi mở endpoint học viên/lớp đầu tiên |
| L8 | Low | `/docs`, `/openapi.json` mở công khai | Chủ ý (contract cho FE); quyết định lại ở bước triển khai F10 |

## Quan sát, không phải lỗi (reviewer ghi rõ)

- Bất biến #7 không được CSDL cưỡng chế cho dòng ledger: composite FK chỉ bảo vệ hàng `booking`. Plan đã xếp #7 vào nhóm đối soát → F05 phải lấy `student_package_id` từ chính booking, và script đối soát phải kiểm mệnh đề này.
- Khoá theo tài khoản là DoS có chủ đích (5 lần sai → chặn tới 900s). Đánh đổi plan đã chọn.
- Rate limit trong bộ nhớ tiến trình chỉ đúng khi chạy **một worker** — đã ghi thành ràng buộc triển khai ở `docs/business-rules.md §12`.

## Đã kiểm chứng là hoạt động

- Chống trừ đôi buổi qua hai lớp khác giờ: hai transaction song song → transaction thứ hai vỡ ở commit nhờ constraint trigger DEFERRED; kết quả 1 booking, `balance_cached = 0 = SUM(delta)`.
- Exclusion constraint chặn hai lớp chồng giờ chèn song song; mệnh đề `WHERE status='SCHEDULED'` đúng cả chiều "hồi sinh" lớp đã hủy.
- Khoá tài khoản: access token và refresh token đều chết ngay.
- `test_db_constraints.py` là test âm thật, kèm test khẳng định ràng buộc **không** chặn nhầm.

## Trạng thái sau khi vá

`ruff check .` sạch · `alembic check` không còn thao tác mới · `pytest -q` = **105 passed** (trước review: 85).
Chuỗi migration chạy lại được từ `base` → `head` (4 migration).

## Câu hỏi chưa giải quyết

1. PROD chạy mấy uvicorn worker? Quyết định này thay đổi kết luận về rate limit trong bộ nhớ.
2. Có reverse proxy trước API không? Quyết định giá trị `trust_proxy_headers`.
3. Cổng CI kiểm DOM P3 thuộc F00 hay dời sang F02 cùng FE? `ci.yml` hiện chỉ có job backend.
