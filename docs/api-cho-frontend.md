# API cho frontend — tra theo màn hình

Tài liệu này trả lời đúng một câu hỏi: **màn hình này gọi những endpoint nào.**

Ba tài liệu, ba câu hỏi khác nhau:

| Câu hỏi | Đọc ở đâu |
|---|---|
| Màn hình này gọi những endpoint nào? | **Trang này** |
| Endpoint này nhận gì, trả gì, ai gọi được? | [`api/README.md`](api/README.md) và các thư mục con |
| Vì sao quy tắc lại như vậy? | [`business-rules.md`](business-rules.md) |

Quy ước chung — xác thực, định dạng lỗi, múi giờ, ý nghĩa của `null`, cách chạy
backend cục bộ — nằm ở [`api/README.md`](api/README.md). Đọc phần đó **trước**
khi viết request đầu tiên.

Đường dẫn tệp trong các bảng dưới đây là **gợi ý cấu trúc** cho `src_FE/`, chưa
phải mã đã tồn tại.

---

## F02 · Trang công khai

`src/pages/public/{home,about,services,trainers,schedule,announcements}.tsx`

| Màn hình | Endpoint |
|---|---|
| Danh sách HLV | [`GET /public/trainers`](api/public/get-public-trainers.md) |
| Ảnh HLV | [`GET /public/trainer-photos/{prefix}/{key}`](api/public/get-public-trainer-photos-prefix-key.md) |
| Lịch lớp công khai | [`GET /public/schedule`](api/public/get-public-schedule.md) |
| Bảng giá | [`GET /public/packages`](api/public/get-public-packages.md) |
| Thông báo | [`GET /public/announcements`](api/public/get-public-announcements.md) |
| Form tư vấn | [`POST /public/leads`](api/public/post-public-leads.md) |

Quy tắc của cả nhóm: [`api/public/README.md`](api/public/README.md).

## F01 · Đăng nhập & tài khoản

`src/pages/auth/*`, `src/pages/accounts/*`, `src/lib/auth-context.tsx`

| Màn hình | Endpoint |
|---|---|
| Đăng nhập | [`POST /auth/login`](api/auth/post-auth-login.md) |
| Quên mật khẩu | [`POST /auth/forgot-password`](api/auth/post-auth-forgot-password.md) → [`POST /auth/reset-password`](api/auth/post-auth-reset-password.md) |
| Đổi mật khẩu | [`POST /auth/change-password`](api/auth/post-auth-change-password.md) |
| Tự sửa tên/số điện thoại | [`PATCH /auth/me`](api/auth/patch-auth-me.md) |
| Nạp vai khi mở app | [`GET /auth/me`](api/auth/get-auth-me.md) |
| Danh sách tài khoản | [`GET /accounts`](api/accounts/get-accounts.md) |
| Tạo tài khoản | [`POST /accounts`](api/accounts/post-accounts.md) |
| Nối tài khoản học viên cũ chưa có hồ sơ | [`PATCH /accounts/{id}`](api/accounts/patch-accounts-account-id.md) với `student_id` |
| Admin sửa hồ sơ tài khoản | [`PATCH /accounts/{id}`](api/accounts/patch-accounts-account-id.md) |
| Khoá / mở khoá | [`POST /accounts/{id}/lock`](api/accounts/post-accounts-account-id-lock.md) · [`/unlock`](api/accounts/post-accounts-account-id-unlock.md) |
| Gửi lại link đặt mật khẩu | [`POST /accounts/{id}/send-password-reset`](api/accounts/post-accounts-account-id-send-password-reset.md) |

Hồ sơ cá nhân dùng GET /auth/me và PATCH /auth/me để tự sửa tên/số điện thoại.
Học viên/HLV đồng bộ hồ sơ liên kết; không sửa email đăng nhập hoặc quyền.

Quy tắc của cả nhóm: [`api/auth/README.md`](api/auth/README.md) ·
[`api/accounts/README.md`](api/accounts/README.md).

Học viên liên hệ studio để admin cấp tài khoản; chưa có màn tự đăng ký.
Khi cấp tài khoản STUDENT, chọn hồ sơ học viên đã tạo và gửi `student_id`
cùng email/vai. Bỏ `password` để học viên đặt mật khẩu qua liên kết email.

Liên kết hồ sơ đọc được ở **cả hai chiều**: mọi response tài khoản
(`GET /accounts`, `GET|POST|PATCH /accounts/{id}`) mang `student_id` và
`trainer_id` — cùng hình dạng như `GET /auth/me` — còn `user_id` trong hồ sơ học
viên/HLV cho biết hồ sơ đó đã có tài khoản hay chưa. Tài khoản vừa tạo hoặc vừa
nối trả về liên kết **ngay trong response đó**, không cần tải lại.

## F03 · Học viên

`src/pages/students/{list,form,detail}.tsx`, `src/pages/students/tabs/*`

| Màn hình | Endpoint |
|---|---|
| Danh sách học viên | [`GET /students`](api/students/get-students.md) |
| Thêm / sửa | [`POST /students`](api/students/post-students.md) · [`PATCH /students/{id}`](api/students/patch-students-student-id.md) |
| Chi tiết — phần đầu | [`GET /students/{id}/overview`](api/students/get-students-student-id-overview.md) |
| Tab gói tập | [`GET /packages?student_id=`](api/packages/get-packages.md) |
| Tab sổ buổi | [`GET /packages/{id}/ledger`](api/packages/get-packages-package-id-ledger.md) |
| Tab lịch sử lớp | [`GET /my-schedule?student_id=&include_cancelled=true`](api/my-schedule/get-my-schedule.md) |
| Tab ảnh tiến trình | [`GET /students/{id}/progress-photos`](api/progress-photos/get-students-student-id-progress-photos.md) |
| Xem một ảnh | [`GET .../progress-photos/{photo_id}/file`](api/progress-photos/get-students-student-id-progress-photos-photo-id-file.md) |
| Tải ảnh lên | [`POST /students/{id}/progress-photos`](api/progress-photos/post-students-student-id-progress-photos.md) |
| Xoá ảnh | [`DELETE .../progress-photos/{photo_id}`](api/progress-photos/delete-students-student-id-progress-photos-photo-id.md) — **ADMIN** |

**Tab ảnh tiến trình phải ẩn hẳn với STAFF**, đừng để nó hiện rồi nhận 403 —
[vì sao](api/progress-photos/README.md).

## F04 · Huấn luyện viên

`src/pages/trainers/{list,form,detail}.tsx`, `src/pages/trainer/my-schedule.tsx`

| Màn hình | Endpoint |
|---|---|
| Danh sách | [`GET /trainers`](api/trainers/get-trainers.md) |
| Thêm / sửa | [`POST /trainers`](api/trainers/post-trainers.md) · [`PATCH /trainers/{id}`](api/trainers/patch-trainers-trainer-id.md) |
| Chi tiết | [`GET /trainers/{id}`](api/trainers/get-trainers-trainer-id.md) |
| Ảnh đại diện | [`GET`](api/trainers/get-trainers-trainer-id-photo.md) · [`POST /trainers/{id}/photo`](api/trainers/post-trainers-trainer-id-photo.md) |
| Thống kê tháng | [`GET /classes/trainer-stats`](api/classes/get-classes-trainer-stats.md) |
| Lịch dạy của tôi | [`GET /classes/my-schedule`](api/classes/get-classes-my-schedule.md) |

## F05 · Gói tập, sổ buổi, thanh toán

`src/pages/packages/{list,form,sell}.tsx`, `src/pages/credits/{ledger,adjust}.tsx`, `src/pages/payments/*`

| Màn hình | Endpoint |
|---|---|
| Danh mục gói | [`GET /package-types`](api/packages/get-package-types.md) · [`POST`](api/packages/post-package-types.md) · [`PATCH /{id}`](api/packages/patch-package-types-package-type-id.md) |
| Bán gói | [`POST /packages/sell`](api/packages/post-packages-sell.md) |
| Gia hạn | [`POST /packages/{id}/renew`](api/packages/post-packages-package-id-renew.md) |
| Sổ buổi | [`GET /packages/{id}/ledger`](api/packages/get-packages-package-id-ledger.md) |
| Điều chỉnh tay | [`POST /packages/{id}/adjust`](api/packages/post-packages-package-id-adjust.md) — **ADMIN**, bắt buộc lý do |
| Thanh toán | [`GET`](api/payments/get-payments.md) · [`POST /payments`](api/payments/post-payments.md) |
| Xác nhận / huỷ | [`POST /payments/{id}/confirm`](api/payments/post-payments-payment-id-confirm.md) · [`/void`](api/payments/post-payments-payment-id-void.md) |

## F06 · Lớp & lịch

`src/pages/classes/{week-view,form,detail,recurrence-preview}.tsx`

| Màn hình | Endpoint |
|---|---|
| Lịch tuần | [`GET /classes?starts_from=&starts_to=`](api/classes/get-classes.md) |
| Tạo lớp | [`POST /classes`](api/classes/post-classes.md) |
| Chi tiết | [`GET /classes/{id}`](api/classes/get-classes-session-id.md) |
| Đổi HLV | [`POST /classes/{id}/trainer`](api/classes/post-classes-session-id-trainer.md) |
| Huỷ lớp | [`POST /classes/{id}/cancel`](api/classes/post-classes-session-id-cancel.md) — bắt buộc lý do |
| Xem trước lịch lặp | [`POST /classes/recurrence/preview`](api/classes/post-classes-recurrence-preview.md) |
| Tạo lịch lặp | [`POST /classes/recurrence`](api/classes/post-classes-recurrence.md) |

Studio chỉ tạo/hủy lịch lớp; không có dời giờ hoặc chuyển người sang lịch mới.

## F07 · Đăng ký, hủy, đổi và điểm danh

`src/pages/student/{class-list,class-detail,my-schedule}.tsx`, `src/pages/bookings/manage.tsx`

| Màn hình | Endpoint |
|---|---|
| Danh sách lớp cho học viên | [`GET /my-schedule/bookable`](api/my-schedule/get-my-schedule-bookable.md) rồi [`GET /classes`](api/classes/get-classes.md) |
| Đăng ký | [`POST /bookings`](api/bookings/post-bookings.md) |
| Lịch của tôi | [`GET /my-schedule`](api/my-schedule/get-my-schedule.md) |
| Hủy | [`POST /bookings/{id}/cancel`](api/bookings/post-bookings-booking-id-cancel.md) |
| Đổi lớp | [`POST /bookings/{id}/change`](api/bookings/post-bookings-booking-id-change.md) |
| Quản lý đăng ký (nhân viên) | [`GET /bookings`](api/bookings/get-bookings.md) |
| Danh sách điểm danh (HLV) | [`GET /classes/{id}/attendance`](api/classes/get-classes-session-id-attendance.md) |
| Cập nhật đến lớp / vắng mặt (HLV) | [`PATCH /bookings/{id}/attendance`](api/bookings/patch-bookings-booking-id-attendance.md) |

Đây là nhóm dễ làm sai nhất. Đọc [`api/bookings/README.md`](api/bookings/README.md),
[`api/my-schedule/README.md`](api/my-schedule/README.md) trước khi dựng màn hình.

Chỉ học viên đăng ký/hủy/đổi cho chính mình; đăng ký thành công trừ ngay 1 buổi,
không có xác nhận hay hàng chờ. Lớp đầy bị từ chối. Gói phải còn hạn ngày học.
Sau hạn Group 4 giờ / Private-Duo 1 giờ, dùng can_cancel=false để khóa hủy/đổi.

HLV chỉ điểm danh lớp mình dạy sau giờ kết thúc (`ends_at`), bằng hai lựa chọn
“Đã đến lớp” / “Vắng mặt”. Cho sửa nhầm, không đổi số buổi. Danh sách HLV nhận
tên học viên và trạng thái, không nhận thông tin tiền hay gói tập. “Lịch của tôi”
hiển thị kết quả và dùng `can_cancel=false` cho lượt đã điểm danh.

## F08 · Nhắc gia hạn

`src/pages/renewals/{summary,list,contact-form}.tsx`

| Màn hình | Endpoint |
|---|---|
| Bảng tổng hợp | [`GET /renewals/summary`](api/renewals/get-renewals-summary.md) |
| Danh sách | [`GET /renewals`](api/renewals/get-renewals.md) |
| Ghi nhận liên hệ | [`POST /renewals/contacts`](api/renewals/post-renewals-contacts.md) |
| Lịch sử liên hệ | [`GET /renewals/students/{id}/contacts`](api/renewals/get-renewals-students-student-id-contacts.md) |

**Không có endpoint gửi tin nhắn nào.** Nút "mở Zalo" là deep link ở FE; nội
dung do nhân viên gõ.

## F09 · Báo cáo

`src/pages/reports/{dashboard,revenue,classes,trainers}.tsx`

| Màn hình | Endpoint |
|---|---|
| Bảng tổng hợp | [`GET /reports/dashboard`](api/reports/get-reports-dashboard.md) |
| Doanh thu | [`GET /reports/revenue`](api/reports/get-reports-revenue.md) → [`/revenue/detail`](api/reports/get-reports-revenue-detail.md) |
| Lớp & đăng ký | [`GET /reports/classes`](api/reports/get-reports-classes.md) |
| Báo cáo HLV | [`GET /reports/trainers`](api/reports/get-reports-trainers.md) |
| Xuất file | [`GET /reports/trainers/export?format=csv\|xlsx`](api/reports/get-reports-trainers-export.md) |
| Thanh toán quá hạn | [`GET /reports/unconfirmed-payments`](api/reports/get-reports-unconfirmed-payments.md) |
