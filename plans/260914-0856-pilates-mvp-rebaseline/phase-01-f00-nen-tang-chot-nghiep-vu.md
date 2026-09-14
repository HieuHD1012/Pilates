---
phase: 1
title: "F00 Nền tảng & chốt nghiệp vụ"
status: pending
priority: P1
effort: "54h hợp đồng (BA 18 · BE 22 · FE 14) + 20h FE hệ token + 4h BE email + rework 15%"
dependencies: []
---

# Phase 1: F00 — Nền tảng & chốt nghiệp vụ

## Overview

Chốt quy định nghiệp vụ thành tài liệu, dựng mô hình dữ liệu + API contract để BE/FE chạy song song, và khởi tạo hai dự án với cổng CI đo được ngưỡng Soul-1. **Phase này chặn toàn bộ phần còn lại.**

Cửa sổ BE: 14/09 → 18/09.

> **Cảnh báo quá tải — red team finding #1.** Hợp đồng cho dòng "Khởi tạo dự án, CI/CD & bộ giao diện chung" là 18h (BA 2 / BE 8 / FE 8). Phase này nạp vào đó: hai scaffold, docker-compose, CI, DEV, hệ token, specimen tiếng Việt, bộ primitive, **6 cổng CI**, spike lịch, lời giải bảng 400px, cộng thêm hạ tầng auth và validate mà 58 hạng mục không hề tính. Cộng thêm sau phiên validate: **+20h FE** cho hệ token/specimen/đặc tả chip (FE tự làm) và **+4h BE** cho transactional email. Thực tế ~70h trong một dòng 18h.

**Đây là chỗ dễ trượt nhất của cả kế hoạch, và là lý do FE thành critical path.** Theo chính sách "phạm vi cố định, thời gian là biến số": nếu hết 18/09 mà chưa xong, **dự báo lại ngày và báo ngay**, không tự cắt cổng CI hay cắt phạm vi.

## Requirements

**Chức năng**
- Quy định booking/số buổi được viết thành tài liệu và khách xác nhận.
- ERD + API contract được review, đủ để FE mock dữ liệu.
- Môi trường DEV chạy được cho cả BE và FE.

**Phi chức năng (red team bổ sung — chưa có trong 58 hạng mục, phải tính giờ)**
- Múi giờ, chống brute-force, thu hồi session, kênh gửi mật khẩu, CORS/CSP, giới hạn độ dài và sanitize đầu vào, validate upload.

## Architecture

### Múi giờ — quyết định trước mọi migration

Toàn hệ thống `Asia/Ho_Chi_Minh`. **Mọi mốc thời gian là `timestamptz`.** `class_session` lưu `starts_at` / `ends_at`, **không** lưu `date` + `start_time` rời và naive.

Lý do (red team finding #6): container chạy UTC theo mặc định. Việt Nam UTC+7. Ngưỡng hủy là 4h (Group) và 1h (Private) — **độ lệch 7 giờ vượt cả hai**, nên mọi lần hủy muộn sẽ được hoàn buổi sai, trên mọi lớp, vĩnh viễn. Test biên viết trên cùng phép quy đổi sai sẽ pass.

Cấm naive datetime ở tầng lint. Test biên phải chạy với cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` và cho kết quả giống nhau.

### Mô hình dữ liệu (PostgreSQL)

```
user(id, email, phone, password_hash, role, is_active, created_at)
      role ∈ {ADMIN, STAFF, TRAINER, STUDENT}

refresh_token(id, user_id, jti, issued_at, expires_at, revoked_at?, replaced_by?)
password_reset(id, user_id, token_hash, expires_at, used_at?, created_at)

student(id, user_id?, full_name, phone UNIQUE, email, dob, note, status, created_at)
trainer(id, user_id?, full_name, phone, bio, photo_key, specialties, is_public, is_active)
lead(id, full_name, phone, need, source, status, assigned_to, converted_student_id?, created_at)

package_type(id, name, price, credits, duration_days, class_type, is_selling)
student_package(id, student_id, package_type_id,
                name_snapshot, price_snapshot, credits_snapshot, class_type_snapshot,
                start_date, end_date, status)
      UNIQUE(student_id, id)          -- để booking tham chiếu composite FK

credit_ledger(id, student_package_id, delta, reason_code, note,
              booking_id?, actor_user_id, created_at)      -- APPEND ONLY
      reason_code ∈ {PACKAGE_SOLD, PACKAGE_RENEWED, BOOKING_DEDUCT,
                     CANCEL_REFUND, ADMIN_ADJUST, PAYMENT_VOID}

payment(id, student_package_id, amount, method, status,
        recorded_by, recorded_at,
        confirmed_by?, confirmed_at?, voided_by?, voided_at?, void_reason?, note)
      method ∈ {CASH, TRANSFER} · status ∈ {PENDING, CONFIRMED, VOID}

class_session(id, starts_at timestamptz, ends_at timestamptz, trainer_id, class_type,
              capacity, status, recurrence_id?, created_by,
              slot tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at)) STORED)
      class_type ∈ {GROUP, PRIVATE} · status ∈ {SCHEDULED, CANCELLED}

booking(id, class_session_id, student_id, student_package_id, status,
        booked_by_user_id, created_at, cancelled_at?, cancelled_by_user_id?,
        attendance_marked_by?, attendance_marked_at?)
      status ∈ {BOOKED, CANCELLED_INTIME, CANCELLED_LATE, ATTENDED, NO_SHOW}
      FOREIGN KEY (student_id, student_package_id)
              REFERENCES student_package(student_id, id)   -- chặn dùng gói người khác

# Bảng lịch sử: tính năng hàng chờ đã bỏ theo chốt 2026-09-14
waitlist_entry(id, class_session_id, student_id, status, created_at,
               created_by_user_id, promoted_by_user_id?, promoted_at?,
               cancelled_by_user_id?, failure_reason?)
      status ∈ {WAITING, PROMOTED, CANCELLED, PROMOTION_FAILED}

progress_photo(id, student_id, storage_key, taken_at, uploaded_by, created_at)
announcement(id, title, body, is_published, publish_at, created_by)
renewal_contact(id, student_id, contacted_at, result, next_contact_date, actor_user_id)
```

### Ràng buộc bắt buộc ở tầng DB

| Ràng buộc | Chặn điều gì |
|---|---|
| `credit_ledger` không cho UPDATE/DELETE | Sửa lịch sử; thu hồi bằng bút toán đối ứng |
| CHECK `note` khác rỗng khi `reason_code = ADMIN_ADJUST` | Điều chỉnh tay không lý do |
| Partial UNIQUE `booking(class_session_id, student_id) WHERE status IN ('BOOKED','ATTENDED','NO_SHOW')` | Đặt trùng cùng lớp, kể cả sau điểm danh (migration 0007) |
| Partial UNIQUE `credit_ledger(booking_id) WHERE reason_code = 'CANCEL_REFUND'` | **Hoàn buổi hai lần do double-click** |
| Composite FK `booking(student_id, student_package_id)` | **Dùng gói của học viên khác** |
| Partial UNIQUE `waitlist_entry(class_session_id, student_id) WHERE status = 'WAITING'` | Ràng buộc dữ liệu hàng chờ lịch sử; tính năng đã bỏ |
| `EXCLUDE USING gist (trainer_id WITH =, slot WITH &&) WHERE (status = 'SCHEDULED')` | HLV trùng giờ. **Cần `btree_gist`.** Mệnh đề `WHERE` là bắt buộc — thiếu nó thì lớp đã hủy vẫn chặn chỗ của chính nó |
| Số dư không âm — xem bên dưới | **Trừ đôi buổi qua hai lớp khác giờ** |

**Số dư không âm.** Không có cột số dư nên không CHECK trực tiếp được. Hai lựa chọn, chốt ở phase này:
- (a) Constraint trigger `DEFERRABLE INITIALLY IMMEDIATE` trên `credit_ledger`, tính `SUM(delta)` của gói và raise nếu < 0 — đơn giản, đủ nhanh ở quy mô một studio.
- (b) Cột `balance_cached` trên `student_package` với `CHECK (balance_cached >= 0)`, cập nhật trong cùng transaction với mỗi dòng ledger, kèm bất biến đối soát `balance_cached = SUM(delta)`.

**Đã chốt ở phiên validate: phương án (b)** — `balance_cached` + `CHECK (balance_cached >= 0)`. Nó tạo ra biểu diễn thứ hai độc lập, biến phép đối soát từ tautology thành mệnh đề kiểm được thật (bất biến #1 ở `plan.md`). `balance_cached` **chỉ được ghi bởi `credit_ledger.py`**, trong cùng transaction với dòng ledger.
<!-- Updated: Validation Session 1 - chốt balance_cached + CHECK -->

### Quy tắc dẫn xuất, khai báo một chỗ

```python
TIMEZONE        = ZoneInfo("Asia/Ho_Chi_Minh")
CANCEL_CUTOFF   = {ClassType.GROUP: timedelta(hours=4),
                   ClassType.PRIVATE: timedelta(hours=1)}
RENEWAL_THRESHOLD = {"credits": 6, "days": 15}
```

**Định nghĩa "gói đang hoạt động"** (dùng ở F03, F05, F08, F09 — hiện chưa được định nghĩa ở đâu):
`status = ACTIVE` **và** `start_date <= today <= end_date` **và** `SUM(delta) > 0`.

**Quy tắc chọn gói khi đặt lớp** (chưa có ở đâu, gây nhập nhằng khi học viên giữ 2 gói hợp lệ):
gói đang hoạt động, còn hạn ngày học, khớp `class_type_snapshot`, **`end_date` sớm nhất**; hoà thì `id` nhỏ hơn.

**Thứ tự khoá toàn cục** — mọi transaction chạm cả hai bảng phải theo cùng một thứ tự, nếu không sẽ deadlock giữa luồng đăng ký (F07) và luồng hủy lớp (F06):

> `student_package` (theo `id` tăng dần nếu nhiều gói) **trước** `class_session`.

Nhánh khó là hủy lớp: nó xuất phát từ buổi lớp nhưng phải hoàn buổi vào nhiều gói.

**Đã chốt ở phiên validate: phương án (a)** — hủy lớp đọc trước không khoá để biết tập gói → khoá gói theo `id` tăng dần → khoá `class_session` → đọc lại bookings dưới khoá. Luồng đăng ký thường xuyên (F07) không bao giờ deadlock với hủy lớp. Chi tiết ở F06.

Phương án bị loại: cho hủy lớp khoá `class_session` trước rồi retry khi `deadlock_detected` — đơn giản hơn nhưng đẩy deadlock vào luồng đăng ký, là luồng chạy nhiều nhất.
<!-- Updated: Validation Session 1 - chốt thứ tự khoá phương án (a) -->

**Gói hết hạn:** buổi chưa dùng **không** bị thu hồi. Số dư hiển thị chỉ tính gói đang hoạt động. Vì vậy `EXPIRY_FORFEIT` **bị loại khỏi enum** — nó không có chủ thể ghi, và F08 đã loại bỏ job nền. Đây là quy tắc tiền, đang chờ khách xác nhận (câu hỏi mở #3).

### Hạ tầng auth (red team finding #13 — không có trong 58 hạng mục)

- **Kênh gửi link đặt lại mật khẩu — đã chốt ở phiên validate: thêm transactional email (~4h BE).** Cần provider, config, secret, sender domain, và xử lý deliverability cơ bản. Token **không bao giờ trả trong response API**. Đổi mật khẩu ADMIN phải nhập mật khẩu hiện tại. 4h này cộng vào critical path BE (215h → 219h).
<!-- Updated: Validation Session 1 - chốt transactional email -->
- **Thu hồi session.** JWT vô trạng thái → `is_active = false` chỉ chặn lần đăng nhập sau; refresh token đang cầm vẫn phát access token tiếp. Bắt buộc lưu refresh token, xoay vòng khi dùng, phát hiện tái sử dụng, và **khoá tài khoản hoặc đổi mật khẩu thì thu hồi toàn bộ refresh token**.
- **Chặn brute-force** trên `/auth/login` theo IP và theo tài khoản, backoff luỹ tiến. (Kế hoạch hiện chỉ giới hạn form tư vấn — mục tiêu giá trị thấp hơn nhiều.)
- **Nơi giữ token ở FE:** access token trong bộ nhớ, refresh trong cookie httpOnly SameSite (kèm quyết định CSRF); hoặc ghi rõ chấp nhận rủi ro nếu chọn localStorage.

### Bảo vệ đầu vào và đầu ra (red team finding #15 — không có trong 58 hạng mục)

- Giới hạn độ dài + validate phía server cho **mọi** trường văn bản tự do.
- `announcement.body` chỉ nhận văn bản thuần hoặc một tập markup giới hạn qua sanitizer whitelist. Đường XSS lưu trữ hiện tại: khách ẩn danh gửi form tư vấn → nhân viên mở danh sách lead → token bị đánh cắp.
- Upload ảnh: kiểm content-type bằng sniff (không tin phần mở rộng), giới hạn dung lượng, **re-encode phía server để bóc EXIF** (ảnh cơ thể có toạ độ GPS nhà học viên), lưu dưới khoá ngẫu nhiên, phục vụ từ origin riêng hoặc kèm `Content-Disposition: attachment`.
- **CORS allow-list** (BE và FE khác origin) + CSP header.
- Response công khai dùng schema riêng trong `app/schemas/public.py` với allow-list trường tường minh.

### Hệ token Soul-1 (FE)

- Màu, thang chữ, thang khoảng cách, bo góc — **tối đa 3 giá trị bo góc** toàn hệ.
- `--measure: 55ch` đặt ở token. Việc rẻ nhất, tác động rộng nhất.
- Specimen tiếng Việt: ngưỡng leading an toàn từng bậc chữ với dấu chồng.
- Không tạo bộ icon mới.
- **Chế độ sáng duy nhất** — dark mode đã bị cắt khỏi MVP.

> **FE tự làm toàn bộ hệ thiết kế** (chốt ở phiên validate; brief vốn giao cho bên thiết kế). Phạm vi FE gánh thêm: hệ token, specimen tiếng Việt kèm ngưỡng leading từng bậc, 5 hạng mục thiết kế ở cả desktop và 400px, đặc tả chip lớp, trạng thái rỗng. **Cộng ~20h vào F00** — một trong ba lý do FE thành critical path. Đổi lại không phụ thuộc bên ngoài và không rủi ro chờ bàn giao.
<!-- Updated: Validation Session 1 - FE sở hữu hệ token -->

### Cổng CI

| Cổng | Ngưỡng | Cách đo |
|---|---|---|
| Card / pill / shadow | 0 (shadow chỉ dialog, dropdown) | đếm trên **DOM đã render** |
| Giá trị bo góc | ≤ 3 | computed style trên DOM |
| Bậc chữ mỗi màn hình | ≤ 6 | **computed style trên DOM đã render** |
| Độ dài dòng trung vị | ≤ 55 cpl | đo trên DOM, **loại trừ ô bảng dữ liệu** |
| axe-core serious + critical | 0 | axe-core |
| Chuỗi cấm P3 | 0 khớp | grep bundle + fixtures **và** validator phía server |

> **Cơ chế đo đã sửa (red team finding #12).** Bản trước quét CSSOM. CSSOM là **toàn cục** — nó thấy mọi rule trong stylesheet đã tải, không phải tập rule một màn hình thực sự render, nên không đo được "mỗi màn hình" và sẽ báo fail giả khi 58 màn dùng chung một file token. Phải duyệt computed style của node đã render. Tương tự, bảng 6 cột không có "độ dài dòng" có nghĩa — phải loại ô bảng khỏi phép đo trung vị, nếu không cổng sẽ fail đúng màn hình nó định bảo vệ.

> **Cổng P3 grep bundle là chưa đủ.** Nội dung công khai nằm trong DB (`announcement.body`, `trainer.bio`, `specialties`) do nhân viên studio nhập **sau khi go-live**. Grep bundle chỉ chứng minh lập trình viên không gõ chuỗi cấm. Bắt buộc thêm validator phía server khi ghi, trả 422 nêu rõ luật bị vi phạm — xem F02.

Danh sách chuỗi cấm P3: mẫu chứng chỉ/bằng cấp/"năm kinh nghiệm", "tối đa 3 người", mẫu giờ mở cửa, tên Việt thật trong fixtures.

## Related Code Files

- Create: `src_BE/app/{main.py,config.py,db.py}`, `src_BE/app/models/*`, `src_BE/app/schemas/*`, `src_BE/app/schemas/public.py`, `src_BE/alembic/`
- Create: `src_BE/app/domain/rules.py` — hằng số, định nghĩa "gói đang hoạt động", quy tắc chọn gói
- Create: `src_BE/app/core/{security.py,permissions.py,content_rules.py}`
- Create: `src_FE/src/styles/tokens.css`, `src_FE/src/components/primitives/*`
- Create: `src_FE/tests/design-gates/*`
- Create: `.github/workflows/ci.yml`, `docker-compose.yml`
- Create: `docs/business-rules.md` — nguồn chuẩn duy nhất
- Create: `docs/api-contract.md` hoặc OpenAPI sinh từ FastAPI

## Implementation Steps

1. **Gửi khách 3 câu ngay ngày đầu** (không đợi hết phase): phạm vi "HLV" ở câu 15 · giá gói công khai · cộng buổi lúc nào. Câu thứ ba chặn F05 → F07.
2. Viết `docs/business-rules.md`: ngưỡng hủy 4h/1h theo `Asia/Ho_Chi_Minh`, chỉ học viên đăng ký, bỏ hàng chờ, khóa hủy sau hạn, quyền xem ảnh tiến trình, định nghĩa "gói đang hoạt động", quy tắc chọn gói, chính sách gói hết hạn, hệ quả khi VOID thanh toán.
3. Chốt múi giờ và kiểu `timestamptz`; bật `btree_gist`; dựng ERD và migration đầu tiên với **toàn bộ** ràng buộc ở bảng trên, gồm cột `slot` và exclusion constraint (F06 chỉ việc dùng, không đổi schema trong tuần căng nhất).
4. Dựng `balance_cached` + `CHECK (balance_cached >= 0)` (đã chốt), ghi duy nhất qua `credit_ledger.py`.
4b. **Chốt thứ tự khoá toàn cục và cách hủy lớp tuân thủ nó** — (a) hay (b) ở trên. Đây là điều kiện để F06 và F07 không deadlock với nhau.
5. Sinh OpenAPI từ Pydantic schema; FE dùng làm nguồn mock.
6. Khởi tạo `src_BE`: FastAPI, SQLAlchemy 2.x, Alembic, pytest, docker-compose PostgreSQL.
7. Dựng transactional email cho luồng đặt lại mật khẩu; ghi cấu hình vào `docs/deployment.md`, secret qua biến môi trường.
8. Dựng `content_rules.py`: danh sách mẫu cấm P3 dùng chung cho validator server và cổng CI.
9. Khởi tạo `src_FE`: Vite + React + TS, router, layout, Newsreader + Be Vietnam Pro.
10. Dựng hệ token và bộ primitive: bảng hairline, badge bo 2px, thước giờ, trạng thái rỗng có nhãn.
11. Viết cổng CI đo 6 ngưỡng **trên DOM đã render**; cho fail thử một lần để chứng minh cổng hoạt động.
12. **Spike thư viện lịch** — dựng thử chip Soul-1 (chữ nhật kẻ, góc vuông, gáy 2px trái). Không override được thì đổi thư viện ngay, không đợi F06.
13. Dựng mẫu bảng 6 cột ở 400px theo phương án đã chốt: **xếp chồng theo hàng, giữ đủ 6 dữ kiện**, nhãn + giá trị phân tách bằng đường kẻ hairline. Không cuộn ngang, không giấu cột.
14. FE hoàn tất specimen tiếng Việt và đặc tả chip lớp (không còn phụ thuộc bên thiết kế).
15. Giao template Excel nhập liệu cho studio **ngay trong phase này**.
16. Đưa cả hai lên DEV; xác nhận CI xanh.

## Success Criteria

- [ ] `docs/business-rules.md` hoàn tất, gồm 6 quy tắc mới (múi giờ, chọn gói, gói đang hoạt động, gói hết hạn, VOID thanh toán, kênh đặt lại mật khẩu).
- [ ] Ba câu hỏi đã gửi khách.
- [ ] ERD + migration chạy được với **toàn bộ** ràng buộc DB ở bảng trên.
- [ ] `btree_gist` bật; exclusion constraint tạo được **kèm mệnh đề `WHERE status = 'SCHEDULED'`**.
- [ ] Không cột thời gian nào là naive; lint chặn naive datetime.
- [ ] Phương án số dư không âm đã chốt và có test chứng minh nó chặn được số dư âm.
- [ ] **Thứ tự khoá toàn cục đã chốt và ghi vào `docs/business-rules.md`**; cách hủy lớp tuân thủ nó đã xác định.
- [ ] `credit_ledger` từ chối UPDATE/DELETE — có test.
- [ ] Composite FK chặn được booking dùng gói của học viên khác — có test.
- [ ] Transactional email gửi được link đặt lại trên DEV; secret không nằm trong mã nguồn.
- [ ] Hệ token nhập được vào mã; measure ≤55 cpl trên trang mẫu.
- [ ] 6 cổng CI chạy **trên DOM đã render** và chặn được vi phạm (đã thử cho fail).
- [ ] Spike lịch chứng minh chip Soul-1 dựng được.
- [ ] Bảng 6 cột ở 400px xếp chồng theo hàng, giữ đủ 6 dữ kiện, không cuộn ngang.
- [ ] Template Excel đã giao cho studio.

## Risk Assessment

- **Phase quá tải (~50h việc trong 18h ngân sách)** — rủi ro lớn nhất. Ngưỡng kích hoạt: cổng CI vượt 20h FE → thu về 8 màn đại diện.
- **Spike lịch thất bại** → phát hiện ở F00 còn đổi được; ở F06 thì mất 33h BE.
- **Khách chậm trả lời** → câu "cộng buổi lúc nào" chặn F05 và F07. Gửi ngày đầu tiên.
- **Token đặt sai từ đầu** → sửa ở 58 màn hình.
- **Chốt sai múi giờ** → sai schema, sai mọi quy tắc hủy, phải migrate lại. Đây là lý do nó nằm ở bước 3, trước migration đầu tiên.
