# Huấn luyện viên

Hồ sơ HLV có hai mặt: phần vận hành (lịch dạy, thống kê) và phần hiển thị trên
trang công khai (giới thiệu, chuyên môn, ảnh).

## Quy tắc nghiệp vụ

**HLV sửa được phần giới thiệu của chính mình**, nhưng không tự bật mình lên
trang công khai (`is_public`), không tự mở lại hồ sơ đã ngừng hoạt động, và
không tự gắn hồ sơ sang tài khoản khác.

Ba trường hiển thị công khai — `full_name`, `bio`, `specialties` — được lọc qua
whitelist HTML trước khi lưu. `full_name` là trường lộ diện nhất: bỏ sót nó vừa
là một đường XSS lưu trữ lên trang marketing, vừa là cửa để một dòng quảng cáo
đi vòng qua validator bằng cách nằm trong tên.

Với vai TRAINER, truy vấn chỉ nhìn thấy hồ sơ của chính họ, nên id người khác
và id không tồn tại đều trả **404**.

Thống kê tháng của HLV nằm ở
[`GET /classes/trainer-stats`](../classes/get-classes-trainer-stats.md) và hiện
là **ADMIN, STAFF** — HLV không xem được số của chính mình. Đây là một câu hỏi
còn nợ khách.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/trainers` | ADMIN, STAFF | [chi tiết](get-trainers.md) |
| `POST` | `/trainers` | ADMIN, STAFF | [chi tiết](post-trainers.md) |
| `GET` | `/trainers/{trainer_id}` | đăng nhập | [chi tiết](get-trainers-trainer-id.md) |
| `PATCH` | `/trainers/{trainer_id}` | đăng nhập | [chi tiết](patch-trainers-trainer-id.md) |
| `GET` | `/trainers/{trainer_id}/photo` | đăng nhập | [chi tiết](get-trainers-trainer-id-photo.md) |
| `POST` | `/trainers/{trainer_id}/photo` | đăng nhập | [chi tiết](post-trainers-trainer-id-photo.md) |
<!-- muc-luc:end -->
