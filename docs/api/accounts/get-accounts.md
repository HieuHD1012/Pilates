# API: Danh sách tài khoản đăng nhập của studio

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách tài khoản đăng nhập của studio.
- **Method:** `GET`
- **Endpoint:** `/accounts`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN**

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
| `role` | `ADMIN` \| `STAFF` \| `TRAINER` \| `STUDENT` \| null | Không | — |
| `is_active` | boolean \| null | Không | — |
| `q` | string \| null | Không | tối đa 120 ký tự |
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
    "email": "hocvien@example.com",
    "full_name": "string",
    "phone": "string",
    "role": "ADMIN",
    "status": "ACTIVE",
    "is_active": true,
    "created_at": "2026-09-14T06:00:00+07:00",
    "student_id": 1,
    "trainer_id": 1
  }
]
```

Mảng `[AccountResponse](#accountresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### AccountResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| email | string (email) | Có | — |
| full_name | string \| null | Có | — |
| phone | string \| null | Có | — |
| role | `ADMIN` \| `STAFF` \| `TRAINER` \| `STUDENT` | Có | — |
| status | `ACTIVE` \| `PENDING_ACTIVATION` | Có | — |
| is_active | boolean | Có | — |
| created_at | string (date-time) | Có | — |
| student_id | integer \| null | Không | — |
| trainer_id | integer \| null | Không | — |
