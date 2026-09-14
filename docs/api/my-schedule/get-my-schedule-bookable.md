# API: Id các buổi lớp học viên **thực sự đăng ký được bằng gói đang có**

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Id các buổi lớp học viên **thực sự đăng ký được bằng gói đang có**.
- **Method:** `GET`
- **Endpoint:** `/my-schedule/bookable`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Danh sách lớp của học viên chỉ nên hiện những buổi này. Lọc bằng loại gói
ở phía giao diện là một bản sao thứ hai của quy tắc chọn gói, và bản sao
thứ hai luôn là bản sẽ lệch.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

Không có.

### Query Params

| Name | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer \| null | Không | — |
| `starts_to` | string (date-time) \| null | Không | — |
| `limit` | integer | Không | ≥ 1; ≤ 300; mặc định `100` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  1
]
```

Mảng `integer`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Trả các `class_session_id` mà học viên **thực sự đăng ký được bằng gói đang
có**. Dùng nó để lọc danh sách lớp, thay vì đối chiếu loại gói với loại lớp ở
FE.
<!-- ghi-chu:end -->
