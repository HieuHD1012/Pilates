# Quản lý tài khoản

Tài khoản đăng nhập tách khỏi hồ sơ nghiệp vụ: một `User` có vai, một `Student`
hoặc `Trainer` là hồ sơ, và chúng nối với nhau qua `user_id`. Một học viên có
thể tồn tại mà chưa có tài khoản — đó là trường hợp thường gặp nhất khi nhập dữ
liệu ban đầu từ Excel.

Toàn nhóm này là **ADMIN**.

Học viên liên hệ studio để được admin cấp tài khoản; chưa có chức năng tự đăng ký.
Admin tạo hồ sơ bằng `POST /students`, rồi gọi `POST /accounts` với
`role=STUDENT` và `student_id`. Hai thao tác tạo tài khoản và nối hồ sơ cùng một
giao dịch; cấp trùng cho một học viên bị từ chối. `StudentResponse.user_id` cho
biết hồ sơ đã được cấp tài khoản hay chưa.

Tài khoản STUDENT cũ chưa nối hồ sơ có thể được admin nối bằng
`PATCH /accounts/{id}` với `student_id`. Không chuyển tài khoản sang học viên
khác, không bỏ liên kết và không đổi vai tài khoản đang nối hồ sơ.

## Quy tắc nghiệp vụ

Tài khoản nhập từ Excel ở trạng thái `PENDING_ACTIVATION`: chưa có mật khẩu,
người dùng tự đặt qua link gửi email (`POST /accounts/{id}/send-password-reset`).

**Khoá tài khoản đi bằng endpoint riêng**, không phải bằng `PATCH` với
`is_active`. `POST /accounts/{id}/lock` khoá tài khoản **và** thu hồi mọi phiên
đang mở — một `PATCH` đơn thuần thì không làm được vế thứ hai.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/accounts` | ADMIN | [chi tiết](get-accounts.md) |
| `POST` | `/accounts` | ADMIN | [chi tiết](post-accounts.md) |
| `GET` | `/accounts/{account_id}` | ADMIN | [chi tiết](get-accounts-account-id.md) |
| `PATCH` | `/accounts/{account_id}` | ADMIN | [chi tiết](patch-accounts-account-id.md) |
| `POST` | `/accounts/{account_id}/lock` | ADMIN | [chi tiết](post-accounts-account-id-lock.md) |
| `POST` | `/accounts/{account_id}/send-password-reset` | ADMIN | [chi tiết](post-accounts-account-id-send-password-reset.md) |
| `POST` | `/accounts/{account_id}/unlock` | ADMIN | [chi tiết](post-accounts-account-id-unlock.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

`PATCH /accounts/{id}` **từ chối mọi trường lạ bằng 422**. Cố ý: một màn hình
gửi `{"is_active": false}` rồi nhận 200 và hiện "đã lưu" trong khi tài khoản
vẫn mở là kiểu hỏng tệ nhất — im lặng và sai.
