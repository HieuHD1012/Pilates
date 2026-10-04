# Review M2 (F02 + F03 + F04) — Backend Pilates Studio

Ngày: 2026-09-14 · Reviewer: `code-reviewer` subagent · Trạng thái: DONE_WITH_CONCERNS
Phạm vi: 11 file app mới + 3 file sửa + 6 file test (~3.060 LOC).
Mọi phát hiện được tái hiện bằng request thật (TestClient + DB test 5434).

## Phát hiện và cách xử lý

| # | Mức | Phát hiện | Xử lý |
|---|---|---|---|
| C1 | Critical | `trainer.full_name` không sanitize, không kiểm P3 → XSS lưu trữ trên trang marketing công khai **và** "Chứng chỉ Polestar" lọt qua bằng cách nằm trong tên | Đã vá: `_PUBLIC_PROFILE_FIELDS` gồm cả `full_name`; 2 test âm |
| H1 | High | P3 vòng qua bằng markup hợp lệ: `Lớp tối đa <strong>3</strong> người` → 201, trang hiện nguyên câu bị cấm | Đã vá: `_as_reader_sees_it()` bóc thẻ trước khi đối chiếu; 3 test tham số hoá |
| H2 | High | P3 vòng qua bằng ZWSP, soft hyphen, word joiner, tổ hợp NFD | Đã vá: chuẩn hoá NFC + xoá ký tự vô hình + giải mã thực thể; 4 test tham số hoá |
| H3 | High | `lead.phone` không sanitize → `<svg onload=alert(1)>` lưu được, nhân viên mở danh sách lead | Đã vá: `PHONE_PATTERN` ở schema cho `LeadCreate`/`StudentCreate`/`StudentUpdate` |
| H4 | High | Chuỗi rỗng sau sanitize → `None` → NotNullViolation → **500** | Đã vá: `clean_public_text(allow_empty=False)` cho trường NOT NULL → 422 `EMPTY_AFTER_SANITIZE` |
| H5 | High | `assigned_to` không kiểm → ForeignKeyViolation → 500; `status=CONVERTED` đặt tay được | Đã vá: `_assert_assignable()`; `LeadUpdate.status` dùng `Literal` loại `CONVERTED` |
| H6 | High | `nh3` escape `&`/`<` kể cả khi bóc hết thẻ → `Reformer & Mat` **lưu** thành `Reformer &amp; Mat`, mỗi lần sửa escape thêm một lớp | Đã vá: `html.unescape` sau `nh3.clean` ở `sanitize_plain_text` (chỉ plain, không áp cho rich) |
| M1 | Medium | `file.file.read()` nuốt toàn bộ body trước khi kiểm size → DoS bộ nhớ | Đã vá: `read_upload()` kiểm `file.size` rồi đọc `limit + 1` byte |
| M2 | Medium | `price` NOT NULL → không diễn đạt được "chưa có giá"; nhánh `null` là mã chết | Đã vá (migration 0005): `price` nullable, CHECK thành `price IS NULL OR price >= 0`. Đây là **thực hiện** yêu cầu "trạng thái rỗng có nhãn" của plan, không phải đảo quyết định |
| M3 | Medium | Ghi/xoá tệp nằm ngoài biên transaction → ảnh mồ côi, hoặc `photo_key` trỏ tệp đã xoá | Đã vá: tách `prepare_image`/`write_prepared`; kiểm ảnh → flush/commit → mới chạm đĩa |
| M4 | Medium | `db.rollback()` trong service phá hợp đồng "một transaction một request" | Đã vá: `db.begin_nested()` (SAVEPOINT) ở `lead_conversion` và `students` |
| M5 | Medium | Chặn trùng lead sót: không chuẩn hoá số, không so với hồ sơ học viên đã có | Đã vá: `normalize_phone()` khai ở `domain/rules.py`, dùng chung; thêm phép so với `student.phone` |
| M6 | Medium | Quyền xoá ảnh tiến trình bằng quyền xem → HLV/học viên xoá vĩnh viễn được | Đã vá: `DELETE` chỉ ADMIN, ghi vào `docs/business-rules.md` là mặc định chờ khách chốt |
| M7 | Medium | `conftest` dùng `setdefault` cho `STORAGE_DIR` → có thể ghi vào thư mục thật | Đã vá: gán thẳng |
| L1 | Low | `_get_or_404` chạy trước kiểm quyền → 403 vs 404 là bộ đếm số HLV | Đã vá: ghim phạm vi vào truy vấn, cả hai trường hợp trả 404 |
| L2 | Low | `_client_ip` chép hai bản (auth.py, leads.py) | Đã vá: `client_ip()` về `core/rate_limit.py` |
| L3 | Low | Tệp mất → 422 trên endpoint công khai | Đã vá: trả 404 |
| L4 | Low | Assert thừa trong `test_overview_counts_only_active_packages` | Đã xoá |
| L5 | Low | Docstring nói `extra="forbid"` là lớp chặn, thực tế không phải | Đã sửa docstring: lớp chặn thật là chọn cột tường minh + test khoá tập trường |
| L6 | Low | `float(price)` cho tiền tệ | Đã vá: trả chuỗi thập phân |

## Quan sát (reviewer ghi rõ không phải lỗi)

- Không có N+1 nào trong M2.
- `balance_cached` không bị ghi ở đâu trong `app/` — tiêu chí 7 đạt sạch.
- Upload guard chống được cả ba thứ nhắm tới: polyglot/HTML-đổi-tên, decompression bomb 144 MPx, EXIF/GPS.
- Không có regression lên M1; thứ tự router không gây shadow.
- `_LEDGER_SUM.correlate()` đúng với cả hai nơi gọi hiện tại.

## Trạng thái sau khi vá

`ruff check .` sạch · `alembic check` không còn thao tác mới · `pytest -q` = **210 passed** (trước review: 189).
Migration: 5. Bốn tiêu chí trượt (2, 3, 4, 15) đã đạt.

## Câu hỏi chưa giải quyết

1. Ai được **xoá** ảnh tiến trình? Đang chạy mặc định an toàn "chỉ ADMIN". Đáp án câu 15 của khách chỉ nói quyền xem.
2. FE render `announcement.body` bằng `innerHTML` hay như text? Nếu innerHTML thì whitelist `nh3` là lớp chặn duy nhất.
3. PROD chạy mấy uvicorn worker, và có reverse proxy không? (còn nợ từ M1)
