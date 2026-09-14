# API: Thêm học viên. Số điện thoại là khoá nhận diện nên không được trùng

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Thêm học viên. Số điện thoại là khoá nhận diện nên không được trùng.
- **Method:** `POST`
- **Endpoint:** `/students`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

Không có.

### Query Params

Không có.

### Request Body

```json
{
  "full_name": "string",
  "phone": "string",
  "email": "hocvien@example.com",
  "dob": "2026-09-14",
  "note": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| full_name | string | Có | tối thiểu 1 ký tự; tối đa 120 ký tự |
| phone | string | Có | mẫu `^[0-9+()\s.\-]{6,32}$` |
| email | string (email) \| null | Không | — |
| dob | string (date) \| null | Không | — |
| note | string \| null | Không | tối đa 2000 ký tự |

## 3. Response

### `201`

```json
{
  "id": 1,
  "user_id": 1,
  "full_name": "string",
  "phone": "string",
  "email": "string",
  "dob": "2026-09-14",
  "note": "string",
  "status": "ACTIVE",
  "created_at": "2026-09-14T06:00:00+07:00"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| user_id | integer \| null | Có | — |
| full_name | string | Có | — |
| phone | string | Có | — |
| email | string \| null | Có | — |
| dob | string (date) \| null | Có | — |
| note | string \| null | Có | — |
| status | `ACTIVE` \| `INACTIVE` | Có | — |
| created_at | string (date-time) | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
