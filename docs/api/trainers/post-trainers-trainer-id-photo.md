# API: Tải ảnh HLV

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Tải ảnh HLV.
- **Method:** `POST`
- **Endpoint:** `/trainers/{trainer_id}/photo`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Ảnh được giải mã rồi mã hoá lại nên metadata rơi ra hết, và lưu dưới khoá
ngẫu nhiên.

Thứ tự ở đây quan trọng: kiểm ảnh → cập nhật hàng và **commit** → rồi mới
ghi tệp mới và xoá tệp cũ. Xoá trước khi commit thì một lần rollback để lại
`photo_key` trỏ vào tệp đã biến mất, và hồ sơ mất ảnh mà không ai biết.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `multipart/form-data` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `trainer_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Gửi dạng `multipart/form-data` với các trường sau:

| Field | Type | Required | Description |
|---|---|---|---|
| file | string | Có | — |

## 3. Response

### `200`

```json
{
  "id": 1,
  "full_name": "string",
  "phone": "string",
  "bio": "string",
  "specialties": "string",
  "photo_key": "string",
  "is_public": true,
  "is_active": true,
  "user_id": 1,
  "created_at": "2026-09-14T06:00:00+07:00"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| full_name | string | Có | — |
| phone | string \| null | Có | — |
| bio | string \| null | Có | — |
| specialties | string \| null | Có | — |
| photo_key | string \| null | Có | — |
| is_public | boolean | Có | — |
| is_active | boolean | Có | — |
| user_id | integer \| null | Có | — |
| created_at | string (date-time) | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
