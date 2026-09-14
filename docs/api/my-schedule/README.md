# Lịch của học viên

Hai endpoint, phục vụ màn "Lịch của tôi" và màn chọn lớp để đăng ký.

## Quy tắc nghiệp vụ

`GET /my-schedule` ghim phạm vi theo người đăng nhập. Nhân viên truyền
`?student_id=` để xem lịch của một học viên cụ thể; học viên thì không cần và
không dùng được tham số đó cho người khác.

`GET /my-schedule/bookable` trả danh sách `class_session_id` mà học viên **thực
sự đăng ký được bằng gói đang có**. Dùng nó để lọc danh sách lớp thay vì đối
chiếu loại gói ở FE.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/my-schedule` | đăng nhập | [chi tiết](get-my-schedule.md) |
| `GET` | `/my-schedule/bookable` | đăng nhập | [chi tiết](get-my-schedule-bookable.md) |
<!-- muc-luc:end -->

## Màn "Lịch của tôi" — chỗ dễ làm sai nhất trong toàn hệ thống

Mỗi dòng kèm ba trường quyết định giao diện:

- `can_cancel` — còn hủy được không
- `refund_if_cancelled_now` — **bấm hủy ngay bây giờ thì có được hoàn buổi không**
- `cancel_deadline` — hạn cuối được hủy

**Dùng `can_cancel` để bật/tắt thao tác hủy và đổi lớp.** Đúng hạn được hủy
và hoàn 1 buổi; sau hạn khóa thao tác và hiện rõ hạn hủy. Không gửi hủy muộn
với kỳ vọng mất buổi để giải phóng chỗ. HLV chưa điểm danh không làm hạn hủy mở lại.

`GET /my-schedule/bookable` loại lớp đầy, đã đăng ký, đã bắt đầu/đã hủy và
lớp không có gói phù hợp còn hạn vào ngày học. Danh sách là trạng thái tại lúc
đọc; POST đăng ký vẫn kiểm lại chỗ và gói để xử lý yêu cầu đồng thời.

**Trạng thái hoàn buổi phải hiện bằng chữ, không chỉ bằng màu.**

**Đừng tự tính lại refund_if_cancelled_now.** Dùng dữ liệu server và
cancel_deadline. Group 4 giờ, Private/Duo 1 giờ; không có ân hạn dời lịch.
