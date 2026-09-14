# API Pilates Studio — tổng quan theo tính năng

Tài liệu này là **mục lục và quy ước chung** của toàn bộ API. Mỗi tính năng có
một thư mục riêng; mỗi endpoint có một trang chi tiết với đầy đủ tham số, kiểu
dữ liệu, ví dụ request/response.

Có hai cách đọc bộ tài liệu này, tuỳ việc đang làm:

| Câu hỏi | Đọc ở đâu |
|---|---|
| "Màn hình này gọi những endpoint nào?" | [`../api-cho-frontend.md`](../api-cho-frontend.md) — sắp theo màn hình |
| "Endpoint này nhận gì, trả gì?" | Thư mục tính năng bên dưới — sắp theo API |
| "Vì sao quy tắc lại như vậy?" | [`../business-rules.md`](../business-rules.md) |
| "Dự án có những tài liệu gì?" | [`../README.md`](../README.md) — mục lục chung |

Trang chi tiết của từng endpoint được **sinh tự động từ chính ứng dụng**
(`uv run python -m scripts.gen_api_docs`) và được ghim bằng
`tests/test_api_docs.py` — thêm, xoá hay đổi kiểu một trường mà quên sinh lại
thì CI đỏ. Khi tài liệu và mã nguồn nói khác nhau thì **mã nguồn đúng**, nhưng
ở bộ tài liệu này hai bên không lệch được lâu.

Bản máy đọc luôn có sẵn nếu cần sinh client:

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts
```

---

## Chạy backend cục bộ

```bash
docker compose up -d db mailpit        # PostgreSQL cổng 5433, Mailpit 8025
cd src_BE
uv sync
uv run alembic upgrade head
SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... uv run python -m scripts.seed_admin
uv run uvicorn app.main:app --reload    # http://localhost:8000
```

`CORS_ORIGINS` mặc định cho phép `http://localhost:5173` — cổng dev của Vite.
Chạy FE ở cổng khác thì phải thêm vào biến đó, không thì trình duyệt chặn mọi
request trước khi chúng rời máy.

Email đặt lại mật khẩu đi vào Mailpit (`http://localhost:8025`), không ra
Internet.

---

## Quy ước xác thực

Gắn `Authorization: Bearer <access_token>` vào mọi request cần đăng nhập.

Cột **Quyền** trong bảng là các vai được đi qua dependency. Service còn kiểm
quyền sở hữu: POST /bookings và hủy/đổi chỉ nhận STUDENT, chỉ hồ sơ của chính
học viên đó. HLV chỉ điểm danh lớp mình dạy sau giờ kết thúc. Trang chi tiết
mô tả điều kiện của từng endpoint.

**Xoay refresh token có cửa sổ ân hạn 10 giây.** Mỗi lần `/auth/refresh` thu
hồi token cũ và phát token mới; trình bày lại token đã dùng **sau** 10 giây bị
coi là token bị đánh cắp và **thu hồi toàn bộ phiên của người đó**.

Hệ quả cho FE: **chỉ được có một lần refresh đang bay**. Nhiều request 401 cùng
lúc phải xếp hàng sau một promise refresh chung, không phải mỗi request tự gọi
refresh. Làm sai thì người dùng bị đăng xuất khỏi mọi thiết bị.

`GET /auth/me` là nguồn duy nhất cho vai và cho `student_id` / `trainer_id` của
người đang đăng nhập — **đừng đọc chúng từ payload JWT**.

---

## Quy ước lỗi

Mọi lỗi nghiệp vụ trả về cùng một hình dạng:

```json
{ "detail": { "code": "SESSION_FULL", "message": "Buổi lớp đã hết chỗ." } }
```

`message` viết sẵn bằng tiếng Việt cho người dùng cuối — **hiện thẳng nó**,
đừng dịch lại theo `code`. `code` dùng để rẽ nhánh khi FE cần làm gì đó khác
ngoài hiện thông báo.

| Mã HTTP | Nghĩa | FE làm gì |
|---|---|---|
| 401 | Chưa đăng nhập hoặc token hết hiệu lực | Refresh một lần, hỏng thì về trang đăng nhập |
| 403 | Đăng nhập rồi nhưng không có quyền | Hiện thông báo, **không** refresh |
| 404 | Không tìm thấy — hoặc có nhưng không thuộc về người này | Như nhau, cố ý |
| 409 | Vi phạm quy tắc nghiệp vụ | Hiện `message` |
| 422 | Sai định dạng đầu vào | Gắn lỗi vào đúng ô nhập |
| 429 | Quá nhiều lần thử | Đọc header `Retry-After` |

Riêng `409 CONCURRENT_CONFLICT` nghĩa là hai người vừa tranh chấp cùng một bản
ghi — **thử lại được**, và FE nên mời người dùng bấm lại thay vì hiện lỗi đỏ.

422 của FastAPI có hình dạng khác (`detail` là mảng `{loc, msg, type}`) — đó là
lỗi **định dạng**, gắn vào đúng ô nhập theo `loc`.

---

## Quy ước thời gian

Mọi mốc thời gian là **ISO 8601 có offset**, và quy tắc nghiệp vụ tính theo giờ
studio (`Asia/Ho_Chi_Minh`).

Tham số thời gian trên query string mà **không kèm offset** được hiểu là giờ
studio. Nên `?starts_from=2026-09-01T00:00:00` và
`?starts_from=2026-09-01T00:00:00+07:00` cho cùng kết quả.

Khoảng thời gian luôn là **nửa mở**: `starts_from <= x < starts_to`. Muốn lấy
trọn ngày 30/09 thì `starts_to` là `2026-10-01T00:00:00`, không phải
`2026-09-30`.

---

## Quy ước `null`

`null` nghĩa là **chưa có phép đo**, khác hẳn `0` nghĩa là "đã đếm và bằng
không". Ô `null` phải để **trống** trên màn hình.

Ví dụ: `fill_rate` của một kỳ không có lớp nào là `null` — hiện "0%" ở đó là
nói rằng lớp có mở mà không ai đến.

---

## Mục lục theo tính năng

<!-- muc-luc:start -->
### [Xác thực & phiên đăng nhập](auth/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `POST` | `/auth/change-password` | đăng nhập | [chi tiết](auth/post-auth-change-password.md) |
| `POST` | `/auth/forgot-password` | công khai | [chi tiết](auth/post-auth-forgot-password.md) |
| `POST` | `/auth/login` | công khai | [chi tiết](auth/post-auth-login.md) |
| `POST` | `/auth/logout` | đăng nhập | [chi tiết](auth/post-auth-logout.md) |
| `GET` | `/auth/me` | đăng nhập | [chi tiết](auth/get-auth-me.md) |
| `PATCH` | `/auth/me` | đăng nhập | [chi tiết](auth/patch-auth-me.md) |
| `POST` | `/auth/refresh` | công khai | [chi tiết](auth/post-auth-refresh.md) |
| `POST` | `/auth/reset-password` | công khai | [chi tiết](auth/post-auth-reset-password.md) |

### [Quản lý tài khoản](accounts/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/accounts` | ADMIN | [chi tiết](accounts/get-accounts.md) |
| `POST` | `/accounts` | ADMIN | [chi tiết](accounts/post-accounts.md) |
| `GET` | `/accounts/{account_id}` | ADMIN | [chi tiết](accounts/get-accounts-account-id.md) |
| `PATCH` | `/accounts/{account_id}` | ADMIN | [chi tiết](accounts/patch-accounts-account-id.md) |
| `POST` | `/accounts/{account_id}/lock` | ADMIN | [chi tiết](accounts/post-accounts-account-id-lock.md) |
| `POST` | `/accounts/{account_id}/send-password-reset` | ADMIN | [chi tiết](accounts/post-accounts-account-id-send-password-reset.md) |
| `POST` | `/accounts/{account_id}/unlock` | ADMIN | [chi tiết](accounts/post-accounts-account-id-unlock.md) |

### [Trang công khai](public/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/public/announcements` | công khai | [chi tiết](public/get-public-announcements.md) |
| `POST` | `/public/leads` | công khai | [chi tiết](public/post-public-leads.md) |
| `GET` | `/public/packages` | công khai | [chi tiết](public/get-public-packages.md) |
| `GET` | `/public/schedule` | công khai | [chi tiết](public/get-public-schedule.md) |
| `GET` | `/public/trainer-photos/{prefix}/{key}` | công khai | [chi tiết](public/get-public-trainer-photos-prefix-key.md) |
| `GET` | `/public/trainers` | công khai | [chi tiết](public/get-public-trainers.md) |

### [Khách quan tâm](leads/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/leads` | ADMIN, STAFF | [chi tiết](leads/get-leads.md) |
| `GET` | `/leads/{lead_id}` | ADMIN, STAFF | [chi tiết](leads/get-leads-lead-id.md) |
| `PATCH` | `/leads/{lead_id}` | ADMIN, STAFF | [chi tiết](leads/patch-leads-lead-id.md) |
| `POST` | `/leads/{lead_id}/convert` | ADMIN, STAFF | [chi tiết](leads/post-leads-lead-id-convert.md) |

### [Học viên](students/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/students` | đăng nhập | [chi tiết](students/get-students.md) |
| `POST` | `/students` | ADMIN, STAFF | [chi tiết](students/post-students.md) |
| `GET` | `/students/{student_id}` | đăng nhập | [chi tiết](students/get-students-student-id.md) |
| `PATCH` | `/students/{student_id}` | ADMIN, STAFF | [chi tiết](students/patch-students-student-id.md) |
| `GET` | `/students/{student_id}/overview` | đăng nhập | [chi tiết](students/get-students-student-id-overview.md) |

### [Ảnh tiến trình](progress-photos/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/students/{student_id}/progress-photos` | đăng nhập | [chi tiết](progress-photos/get-students-student-id-progress-photos.md) |
| `POST` | `/students/{student_id}/progress-photos` | đăng nhập | [chi tiết](progress-photos/post-students-student-id-progress-photos.md) |
| `DELETE` | `/students/{student_id}/progress-photos/{photo_id}` | ADMIN | [chi tiết](progress-photos/delete-students-student-id-progress-photos-photo-id.md) |
| `GET` | `/students/{student_id}/progress-photos/{photo_id}/file` | đăng nhập | [chi tiết](progress-photos/get-students-student-id-progress-photos-photo-id-file.md) |

### [Huấn luyện viên](trainers/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/trainers` | ADMIN, STAFF | [chi tiết](trainers/get-trainers.md) |
| `POST` | `/trainers` | ADMIN, STAFF | [chi tiết](trainers/post-trainers.md) |
| `GET` | `/trainers/{trainer_id}` | đăng nhập | [chi tiết](trainers/get-trainers-trainer-id.md) |
| `PATCH` | `/trainers/{trainer_id}` | đăng nhập | [chi tiết](trainers/patch-trainers-trainer-id.md) |
| `GET` | `/trainers/{trainer_id}/photo` | đăng nhập | [chi tiết](trainers/get-trainers-trainer-id-photo.md) |
| `POST` | `/trainers/{trainer_id}/photo` | đăng nhập | [chi tiết](trainers/post-trainers-trainer-id-photo.md) |

### [Thông báo](announcements/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/announcements` | ADMIN, STAFF | [chi tiết](announcements/get-announcements.md) |
| `POST` | `/announcements` | ADMIN, STAFF | [chi tiết](announcements/post-announcements.md) |
| `DELETE` | `/announcements/{announcement_id}` | ADMIN, STAFF | [chi tiết](announcements/delete-announcements-announcement-id.md) |
| `PATCH` | `/announcements/{announcement_id}` | ADMIN, STAFF | [chi tiết](announcements/patch-announcements-announcement-id.md) |

### [Gói tập & sổ buổi](packages/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/package-types` | ADMIN, STAFF | [chi tiết](packages/get-package-types.md) |
| `POST` | `/package-types` | ADMIN, STAFF | [chi tiết](packages/post-package-types.md) |
| `PATCH` | `/package-types/{package_type_id}` | ADMIN, STAFF | [chi tiết](packages/patch-package-types-package-type-id.md) |
| `GET` | `/packages` | đăng nhập | [chi tiết](packages/get-packages.md) |
| `POST` | `/packages/sell` | ADMIN, STAFF | [chi tiết](packages/post-packages-sell.md) |
| `POST` | `/packages/{package_id}/adjust` | ADMIN | [chi tiết](packages/post-packages-package-id-adjust.md) |
| `GET` | `/packages/{package_id}/ledger` | đăng nhập | [chi tiết](packages/get-packages-package-id-ledger.md) |
| `POST` | `/packages/{package_id}/renew` | ADMIN, STAFF | [chi tiết](packages/post-packages-package-id-renew.md) |

### [Thanh toán](payments/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/payments` | ADMIN, STAFF | [chi tiết](payments/get-payments.md) |
| `POST` | `/payments` | ADMIN, STAFF | [chi tiết](payments/post-payments.md) |
| `GET` | `/payments/{payment_id}` | ADMIN, STAFF | [chi tiết](payments/get-payments-payment-id.md) |
| `POST` | `/payments/{payment_id}/confirm` | ADMIN, STAFF | [chi tiết](payments/post-payments-payment-id-confirm.md) |
| `POST` | `/payments/{payment_id}/void` | ADMIN, STAFF | [chi tiết](payments/post-payments-payment-id-void.md) |

### [Lớp & lịch](classes/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/classes` | đăng nhập | [chi tiết](classes/get-classes.md) |
| `POST` | `/classes` | ADMIN, STAFF | [chi tiết](classes/post-classes.md) |
| `GET` | `/classes/my-schedule` | đăng nhập | [chi tiết](classes/get-classes-my-schedule.md) |
| `POST` | `/classes/recurrence` | ADMIN, STAFF | [chi tiết](classes/post-classes-recurrence.md) |
| `POST` | `/classes/recurrence/preview` | ADMIN, STAFF | [chi tiết](classes/post-classes-recurrence-preview.md) |
| `GET` | `/classes/trainer-stats` | ADMIN, STAFF | [chi tiết](classes/get-classes-trainer-stats.md) |
| `GET` | `/classes/{session_id}` | đăng nhập | [chi tiết](classes/get-classes-session-id.md) |
| `GET` | `/classes/{session_id}/attendance` | TRAINER (chỉ lớp mình dạy) | [chi tiết](classes/get-classes-session-id-attendance.md) |
| `POST` | `/classes/{session_id}/cancel` | ADMIN, STAFF | [chi tiết](classes/post-classes-session-id-cancel.md) |
| `POST` | `/classes/{session_id}/trainer` | ADMIN, STAFF | [chi tiết](classes/post-classes-session-id-trainer.md) |

### [Đăng ký lớp](bookings/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/bookings` | ADMIN, STAFF | [chi tiết](bookings/get-bookings.md) |
| `POST` | `/bookings` | STUDENT (chỉ của mình) | [chi tiết](bookings/post-bookings.md) |
| `PATCH` | `/bookings/{booking_id}/attendance` | TRAINER (chỉ lớp mình dạy) | [chi tiết](bookings/patch-bookings-booking-id-attendance.md) |
| `POST` | `/bookings/{booking_id}/cancel` | STUDENT (chỉ của mình) | [chi tiết](bookings/post-bookings-booking-id-cancel.md) |
| `POST` | `/bookings/{booking_id}/change` | STUDENT (chỉ của mình) | [chi tiết](bookings/post-bookings-booking-id-change.md) |

### [Lịch của học viên](my-schedule/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/my-schedule` | đăng nhập | [chi tiết](my-schedule/get-my-schedule.md) |
| `GET` | `/my-schedule/bookable` | đăng nhập | [chi tiết](my-schedule/get-my-schedule-bookable.md) |

### [Nhắc gia hạn](renewals/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/renewals` | ADMIN, STAFF | [chi tiết](renewals/get-renewals.md) |
| `POST` | `/renewals/contacts` | ADMIN, STAFF | [chi tiết](renewals/post-renewals-contacts.md) |
| `GET` | `/renewals/students/{student_id}/contacts` | ADMIN, STAFF | [chi tiết](renewals/get-renewals-students-student-id-contacts.md) |
| `GET` | `/renewals/summary` | ADMIN, STAFF | [chi tiết](renewals/get-renewals-summary.md) |

### [Báo cáo](reports/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/reports/classes` | ADMIN, STAFF | [chi tiết](reports/get-reports-classes.md) |
| `GET` | `/reports/dashboard` | ADMIN, STAFF | [chi tiết](reports/get-reports-dashboard.md) |
| `GET` | `/reports/revenue` | ADMIN, STAFF | [chi tiết](reports/get-reports-revenue.md) |
| `GET` | `/reports/revenue/detail` | ADMIN, STAFF | [chi tiết](reports/get-reports-revenue-detail.md) |
| `GET` | `/reports/trainers` | ADMIN, STAFF | [chi tiết](reports/get-reports-trainers.md) |
| `GET` | `/reports/trainers/class-sizes` | ADMIN, STAFF | [chi tiết](reports/get-reports-trainers-class-sizes.md) |
| `GET` | `/reports/trainers/class-sizes/export` | ADMIN, STAFF | [chi tiết](reports/get-reports-trainers-class-sizes-export.md) |
| `GET` | `/reports/trainers/export` | ADMIN, STAFF | [chi tiết](reports/get-reports-trainers-export.md) |
| `GET` | `/reports/unconfirmed-payments` | ADMIN, STAFF | [chi tiết](reports/get-reports-unconfirmed-payments.md) |

### [Hạ tầng](meta/README.md)

| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/health` | công khai | [chi tiết](meta/get-health.md) |
<!-- muc-luc:end -->

---

## Mười chỗ dễ làm sai nhất

1. **Nhiều lần refresh song song** làm người dùng bị đăng xuất khỏi mọi thiết
   bị. Xếp hàng sau một promise chung.
2. **Tự tính lại `refund_if_cancelled_now`.** Ba quy tắc gộp lại; bản sao sẽ lệch.
3. **Tự chọn gói khi đặt lớp.** Bỏ trống `student_package_id` là đúng.
4. **Cho ADMIN/STAFF/HLV đặt hộ** — chỉ STUDENT tự đăng ký cho mình.
5. **Tự ghép `detail_path`.** Dùng chuỗi server trả về.
6. **Hiện `0` ở ô `null`.** `null` là chưa có phép đo, phải để trống.
7. **Cộng `delta` ở FE** thay vì hiện `balance_after` server trả.
8. **Để tab ảnh tiến trình hiện với STAFF** rồi nhận 403.
9. **Cho hủy/đổi khi `can_cancel=false`** — khóa thao tác và hiện hạn hủy.
10. **Hiện số chỗ trống trên trang công khai** — API công khai cố ý chỉ trả
    `is_full`.
