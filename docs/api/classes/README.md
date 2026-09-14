# Lớp & lịch

Một **buổi lớp** (`class_session`) là một mốc giờ cụ thể, có HLV, có loại
(`GROUP` / `PRIVATE`) và có sức chứa. Lịch lặp chỉ là cách tạo nhiều buổi một
lần — không có thực thể "lớp định kỳ" nào tồn tại sau đó.

## Quy tắc nghiệp vụ

**Một HLV không dạy hai lớp trùng giờ.** Điều này được cưỡng chế ở tầng cơ sở
dữ liệu bằng exclusion constraint, không phải bằng một phép kiểm ở tầng ứng
dụng — nên hai người tạo lớp cùng lúc vẫn không lách qua được.

`GET /classes` **tự ghim phạm vi theo vai**: ADMIN/STAFF thấy tất cả, HLV chỉ
thấy lớp mình dạy, học viên chỉ thấy lớp còn hiệu lực. Cùng một URL, ba kết quả
khác nhau — đúng như thiết kế.

`GET /classes/{id}` trả `booked_count` / `seats_left` **chỉ cho nhân viên**;
học viên nhận bản rút gọn.

**Tạo lịch lặp là tất cả hoặc không có gì.** Một buổi vướng trùng giờ HLV thì cả
loạt bị từ chối.

**Studio chỉ tạo lịch hoặc hủy lịch.** Muốn đổi giờ thì hủy lớp cũ, hoàn buổi
cho các đăng ký còn hiệu lực, rồi tạo lớp mới để học viên tự đăng ký.

**Hủy lớp bắt buộc khai lý do**, hoàn buổi cho mọi người đã đăng ký, và dọn sạch
dữ liệu hàng chờ lịch sử của buổi đó (tính năng hàng chờ đã bỏ).

Sức chứa lớp `PRIVATE` mặc định là 1. Lớp Duo là `PRIVATE` sức chứa 2, nhân viên
đặt tay.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/classes` | đăng nhập | [chi tiết](get-classes.md) |
| `POST` | `/classes` | ADMIN, STAFF | [chi tiết](post-classes.md) |
| `GET` | `/classes/my-schedule` | đăng nhập | [chi tiết](get-classes-my-schedule.md) |
| `POST` | `/classes/recurrence` | ADMIN, STAFF | [chi tiết](post-classes-recurrence.md) |
| `POST` | `/classes/recurrence/preview` | ADMIN, STAFF | [chi tiết](post-classes-recurrence-preview.md) |
| `GET` | `/classes/trainer-stats` | ADMIN, STAFF | [chi tiết](get-classes-trainer-stats.md) |
| `GET` | `/classes/{session_id}` | đăng nhập | [chi tiết](get-classes-session-id.md) |
| `GET` | `/classes/{session_id}/attendance` | TRAINER (chỉ lớp mình dạy) | [chi tiết](get-classes-session-id-attendance.md) |
| `POST` | `/classes/{session_id}/cancel` | ADMIN, STAFF | [chi tiết](post-classes-session-id-cancel.md) |
| `POST` | `/classes/{session_id}/trainer` | ADMIN, STAFF | [chi tiết](post-classes-session-id-trainer.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

**Luôn gọi `/classes/recurrence/preview` trước** và hiện danh sách cho người
dùng xác nhận. Bấm thẳng vào `/recurrence` rồi nhận một lỗi trùng giờ ở buổi thứ
mười một không cho người dùng biết phải sửa gì.

Khoảng thời gian của `?starts_from=&starts_to=` là **nửa mở**. Muốn lấy trọn
ngày 30/09 thì `starts_to` là `2026-10-01T00:00:00`.

## Không dời giờ lớp

Chỉ tạo/hủy lịch. Đổi giờ bằng hủy lớp cũ (hoàn các lượt BOOKED), tạo lớp mới
và để học viên tự đăng ký. Không chuyển người hoặc cấp ân hạn. API
/classes/{id}/reschedule đã bỏ. Phân công HLV giữ nguyên giờ học.
