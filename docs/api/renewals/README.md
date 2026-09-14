# Nhắc gia hạn

Danh sách học viên cần gọi điện mời gia hạn, kèm sổ ghi ai đã được liên hệ.

## Quy tắc nghiệp vụ

Ngưỡng là **≤ 6 buổi HOẶC ≤ 15 ngày** — quan hệ **HOẶC**, không phải VÀ. Người
còn 20 buổi nhưng hết hạn sau 10 ngày vẫn cần liên hệ.

Mỗi dòng có `reasons` chứa `LOW_CREDITS` và/hoặc `EXPIRING_SOON`.

Bộ lọc `max_credits` / `max_days` chỉ **thu hẹp** quanh ngưỡng mặc định, không
nới rộng. Truyền `max_credits=50` không kéo thêm người vào danh sách.

`GET /renewals/summary` **chỉ đếm người — không có số liệu kinh doanh**, vì màn
này mở suốt ngày ở quầy lễ tân nơi khách nhìn được màn hình.

**Không có endpoint gửi tin nhắn nào.** Nút "mở Zalo" là deep link ở FE; nội
dung do nhân viên gõ. Hệ thống chỉ ghi lại rằng đã liên hệ.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/renewals` | ADMIN, STAFF | [chi tiết](get-renewals.md) |
| `POST` | `/renewals/contacts` | ADMIN, STAFF | [chi tiết](post-renewals-contacts.md) |
| `GET` | `/renewals/students/{student_id}/contacts` | ADMIN, STAFF | [chi tiết](get-renewals-students-student-id-contacts.md) |
| `GET` | `/renewals/summary` | ADMIN, STAFF | [chi tiết](get-renewals-summary.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

**Nói lý do bằng chữ.** Một con số đổi màu không cho nhân viên biết người này
sắp hết buổi hay sắp hết hạn — hai câu mở đầu cuộc gọi hoàn toàn khác nhau.

Bảng tổng hợp dựng theo kiểu **số ngồi trên đường kẻ**, không phải hàng card KPI.
