# Xác thực & phiên đăng nhập

Một cặp token: `access_token` sống ngắn gắn vào từng request, `refresh_token`
sống dài dùng để lấy cặp mới. Không có session cookie — FE là ứng dụng tách
origin nên mọi thứ đi qua header `Authorization`.

## Quy tắc nghiệp vụ

**Xoay refresh token có cửa sổ ân hạn 10 giây.** Mỗi lần `/auth/refresh` thu
hồi token cũ và phát token mới. Trình bày lại một token đã dùng:

- trong vòng 10 giây → trả lại đúng cặp thay thế, coi như request đến trễ
- sau 10 giây → coi là token bị đánh cắp và **thu hồi toàn bộ phiên của người đó**

Cửa sổ 10 giây tồn tại vì một SPA hay có vài request cùng hết hạn một lúc. Nó
không phải chỗ để FE gọi refresh thoải mái.

**Lộ diện tài khoản là một rò rỉ.** `/auth/login` trả cùng một thông báo cho
"sai mật khẩu" và "email không tồn tại". `/auth/forgot-password` luôn trả 200
và **không bao giờ** trả token về — token chỉ đi qua email.

**Giới hạn tần suất theo cả IP lẫn email.** Đăng nhập, quên mật khẩu và đặt lại
mật khẩu đều có thể trả 429 kèm `Retry-After`.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `POST` | `/auth/change-password` | đăng nhập | [chi tiết](post-auth-change-password.md) |
| `POST` | `/auth/forgot-password` | công khai | [chi tiết](post-auth-forgot-password.md) |
| `POST` | `/auth/login` | công khai | [chi tiết](post-auth-login.md) |
| `POST` | `/auth/logout` | đăng nhập | [chi tiết](post-auth-logout.md) |
| `GET` | `/auth/me` | đăng nhập | [chi tiết](get-auth-me.md) |
| `PATCH` | `/auth/me` | đăng nhập | [chi tiết](patch-auth-me.md) |
| `POST` | `/auth/refresh` | công khai | [chi tiết](post-auth-refresh.md) |
| `POST` | `/auth/reset-password` | công khai | [chi tiết](post-auth-reset-password.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

**Chỉ được có một lần refresh đang bay.** Nhiều request nhận 401 cùng lúc phải
xếp hàng sau một promise refresh chung. Mỗi request tự gọi refresh nghĩa là lần
thứ hai trình bày một token đã dùng — và người dùng bị đăng xuất khỏi mọi thiết
bị.

**Đừng đọc vai từ payload JWT.** `GET /auth/me` là nguồn duy nhất cho vai và
cho `student_id` / `trainer_id`.

**Màn quên mật khẩu phải chịu được 429** và nói rõ cho người dùng, không im
lặng thất bại.

## Hồ sơ cá nhân

GET /auth/me trả tên, phone và liên kết hồ sơ. PATCH /auth/me cho người đăng
nhập tự sửa full_name/phone, đồng bộ hồ sơ học viên/HLV trong một giao dịch.
Không nhận email, role, user_id, student_id, trainer_id hoặc is_active.
Phone học viên bắt buộc và không trùng; STAFF có thể xóa phone tùy chọn.
PATCH /accounts/{id} vẫn là API quản trị chỉ ADMIN.
