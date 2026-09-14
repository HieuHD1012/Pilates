# API: Danh sách huấn luyện viên cho màn quản trị

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách huấn luyện viên cho màn quản trị.
- **Method:** `GET`
- **Endpoint:** `/trainers`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

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
| `is_active` | boolean \| null | Không | — |
| `is_public` | boolean \| null | Không | — |
| `limit` | integer | Không | ≥ 1; ≤ 200; mặc định `50` |
| `offset` | integer | Không | ≥ 0; mặc định `0` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
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
]
```

Mảng `[TrainerResponse](#trainerresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### TrainerResponse

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
