# API: Gói của học viên

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Gói của học viên.
- **Method:** `GET`
- **Endpoint:** `/packages`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Học viên đăng nhập chỉ đọc được gói của chính mình; bỏ trống `student_id`
thì hệ thống tự ghim vào họ thay vì trả về gói của cả studio.

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
    "student_id": 1,
    "package_type_id": 1,
    "name_snapshot": "string",
    "price_snapshot": "string",
    "credits_snapshot": 1,
    "class_type_snapshot": "GROUP",
    "start_date": "2026-09-14",
    "end_date": "2026-09-14",
    "status": "ACTIVE",
    "balance_cached": 1,
    "created_at": "2026-09-14T06:00:00+07:00"
  }
]
```

Mảng `[StudentPackageResponse](#studentpackageresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### StudentPackageResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| student_id | integer | Có | — |
| package_type_id | integer \| null | Có | — |
| name_snapshot | string | Có | — |
| price_snapshot | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| credits_snapshot | integer | Có | — |
| class_type_snapshot | `GROUP` \| `PRIVATE` | Có | — |
| start_date | string (date) | Có | — |
| end_date | string (date) | Có | — |
| status | `ACTIVE` \| `EXPIRED` \| `CANCELLED` | Có | — |
| balance_cached | integer | Có | — |
| created_at | string (date-time) | Có | — |
