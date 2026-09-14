# Đăng ký lớp

Nhóm quan trọng nhất của hệ thống: đây là chỗ tiền (buổi tập) đổi chủ, và là
chỗ nhiều người thao tác lên cùng một tài nguyên cùng lúc.

## Quy tắc nghiệp vụ

Chỉ STUDENT được đăng ký, hủy và đổi lớp cho chính mình. Bỏ `student_id` để
server dùng hồ sơ đã nối với tài khoản. ADMIN, STAFF và HLV không đặt hộ.
Đăng ký thành công là BOOKED và trừ ngay 1 buổi, không cần nhân viên xác nhận.
Lớp đầy trả `SESSION_FULL`; không có hàng chờ và không trừ buổi khi thất bại.

Gói phải ACTIVE, còn buổi, khớp loại lớp và còn hạn cả hôm nay lẫn ngày học.
Bỏ `student_package_id` để server chọn gói đủ điều kiện hết hạn sớm nhất.

Hạn hủy: Group 4 giờ, Private/Duo 1 giờ trước giờ bắt đầu.
Hủy đúng hạn hoàn 1 buổi vào gói đã trừ. Sau hạn khóa hủy và đổi lớp với
`CANCELLATION_CLOSED`; giữ nguyên đăng ký và số buổi. Gọi hủy lại không hoàn thêm.
Đổi lớp là một giao dịch: hoàn buổi cũ rồi trừ buổi mới, hoặc không thay đổi gì.
Không có dời lịch lớp hoặc ân hạn dời giờ.

HLV đọc [danh sách điểm danh](../classes/get-classes-session-id-attendance.md)
và cập nhật [ATTENDED/NO_SHOW](patch-bookings-booking-id-attendance.md) sau ends_at.
Chỉ HLV được gán lớp có quyền; cho sửa nhầm, lưu người/thời điểm cập nhật.
Điểm danh không thay đổi số buổi. Lượt đã điểm danh không được hủy/đổi;
lớp đã có điểm danh không được hủy, hoặc đổi HLV.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/bookings` | ADMIN, STAFF | [chi tiết](get-bookings.md) |
| `POST` | `/bookings` | STUDENT (chỉ của mình) | [chi tiết](post-bookings.md) |
| `PATCH` | `/bookings/{booking_id}/attendance` | TRAINER (chỉ lớp mình dạy) | [chi tiết](patch-bookings-booking-id-attendance.md) |
| `POST` | `/bookings/{booking_id}/cancel` | STUDENT (chỉ của mình) | [chi tiết](post-bookings-booking-id-cancel.md) |
| `POST` | `/bookings/{booking_id}/change` | STUDENT (chỉ của mình) | [chi tiết](post-bookings-booking-id-change.md) |
<!-- muc-luc:end -->

## Mã lỗi khi không đặt được

Mỗi mã là một thông báo khác nhau — **hiện đúng `message`**, đừng gộp thành một
câu chung:

| `code` | Nghĩa | Màn hình nên mời làm gì |
|---|---|---|
| `NO_PACKAGE` | Chưa có gói tập nào | Liên hệ quầy để mua gói |
| `PACKAGE_EXPIRED` | Gói đã hết hạn | Gia hạn |
| `PACKAGE_OUT_OF_CREDITS` | Hết buổi | Mua thêm |
| `INSUFFICIENT_CREDITS` | Hết buổi — phát hiện muộn hơn, khi đã tranh chấp | Mua thêm (xử lý **y hệt** `PACKAGE_OUT_OF_CREDITS`) |
| `PACKAGE_NOT_ACTIVE` | Gói bị đánh dấu huỷ hoặc hết hiệu lực | Liên hệ quầy |
| `PACKAGE_TYPE_MISMATCH` | Gói không dùng được cho loại lớp này | Chọn lớp khác |
| `SESSION_FULL` | Hết chỗ | Chọn lớp khác hoặc tự thử lại khi có chỗ |
| `PACKAGE_NOT_VALID_FOR_SESSION` | Gói không còn hạn vào ngày học | Chọn ngày phù hợp hoặc gia hạn |
| `CANCELLATION_CLOSED` | Đã quá hạn hủy/đổi | Khóa thao tác, hiện hạn hủy |
| `ALREADY_BOOKED` | Đã đăng ký lớp này rồi | — |
| `SESSION_CANCELLED` | Lớp đã bị huỷ | Chọn buổi khác |
| `SESSION_STARTED` | Lớp đã bắt đầu | Chọn buổi khác |
| `CONCURRENT_CONFLICT` | Hai người vừa tranh chấp cùng một chỗ | **Mời bấm lại** |

## Chỗ dễ làm sai

**Đừng để FE tự chọn gói.** Đó là một bản sao thứ hai của quy tắc chọn gói, và
nó sẽ lệch với server đúng vào lúc học viên có hai gói.

**`CONCURRENT_CONFLICT` không phải lỗi.** Nó nghĩa là thử lại được — hiện nút
"thử lại", đừng hiện lỗi đỏ.

**"Hết buổi" đến từ hai mã, không phải một.** `PACKAGE_OUT_OF_CREDITS` là phán
quyết trước khi khoá gói; `INSUFFICIENT_CREDITS` là cùng kết luận nhưng do tầng
ghi sổ đưa ra sau khi đã khoá — học viên còn đúng một buổi bấm đặt hai lớp khác
giờ cùng lúc thì một trong hai nhận mã này. Với người dùng chúng là **một tình
huống**, nên đừng để một nhánh rơi vào thông báo chung chung: bắt cả hai.

**Đừng tự tính lại điều kiện hoàn buổi.** Xem
[lịch của học viên](../my-schedule/README.md).
