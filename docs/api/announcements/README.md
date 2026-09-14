# Thông báo

Nhân viên soạn thông báo ở đây; bản đã đăng hiện ra ở
[`GET /public/announcements`](../public/get-public-announcements.md).

## Quy tắc nghiệp vụ

`body` được lọc qua **whitelist HTML** ở server mỗi lần ghi — cả lúc tạo lẫn
lúc sửa. Thẻ và thuộc tính ngoài whitelist bị gỡ, không phải bị mã hoá.

Danh sách quản trị trả **cả bản chưa đăng**; endpoint công khai chỉ trả bản đã
đăng và còn trong khoảng hiệu lực.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/announcements` | ADMIN, STAFF | [chi tiết](get-announcements.md) |
| `POST` | `/announcements` | ADMIN, STAFF | [chi tiết](post-announcements.md) |
| `DELETE` | `/announcements/{announcement_id}` | ADMIN, STAFF | [chi tiết](delete-announcements-announcement-id.md) |
| `PATCH` | `/announcements/{announcement_id}` | ADMIN, STAFF | [chi tiết](patch-announcements-announcement-id.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

> ⚠️ Nếu FE render `body` bằng `innerHTML` thì whitelist ở server là **rào chắn
> XSS duy nhất**. Render dạng text thì an toàn tuyệt đối. Câu hỏi này còn nợ ở
> [`business-rules.md`](../../business-rules.md).
