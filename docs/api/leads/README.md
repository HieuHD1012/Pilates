# Khách quan tâm

Khách điền form tư vấn trên trang công khai rơi vào đây. Vòng đời:
`NEW` → `CONTACTED` → `CONVERTED` hoặc `LOST`.

## Quy tắc nghiệp vụ

`POST /leads/{id}/convert` tạo hồ sơ học viên từ một khách quan tâm và đánh dấu
lead là `CONVERTED`. **Số điện thoại là khoá nhận diện**: chuyển đổi một lead
trùng số với học viên đã có sẽ bị từ chối thay vì tạo bản ghi thứ hai.

Số điện thoại được chuẩn hoá trước khi so trùng, nên `0900 000 055` và
`0900000055` là cùng một người — không vòng qua được bằng một dấu cách.

Endpoint nhận form của khách nằm ở nhóm [trang công khai](../public/README.md);
phần còn lại là **ADMIN, STAFF**.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/leads` | ADMIN, STAFF | [chi tiết](get-leads.md) |
| `GET` | `/leads/{lead_id}` | ADMIN, STAFF | [chi tiết](get-leads-lead-id.md) |
| `PATCH` | `/leads/{lead_id}` | ADMIN, STAFF | [chi tiết](patch-leads-lead-id.md) |
| `POST` | `/leads/{lead_id}/convert` | ADMIN, STAFF | [chi tiết](post-leads-lead-id-convert.md) |
<!-- muc-luc:end -->
