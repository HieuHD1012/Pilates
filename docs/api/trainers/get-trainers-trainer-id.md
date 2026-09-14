# API: Chi tiết HLV

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Chi tiết HLV.
- **Method:** `GET`
- **Endpoint:** `/trainers/{trainer_id}`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

HLV mở được hồ sơ của chính mình; id của người khác trả 404 giống hệt id
không tồn tại — rò rỉ qua id trực tiếp là lỗi phổ biến nhất ở loại ứng dụng
này, và hai mã trả về khác nhau là một bộ đếm số HLV của studio.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `trainer_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

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
