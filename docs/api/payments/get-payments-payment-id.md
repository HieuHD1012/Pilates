# API: Chi tiết một giao dịch thanh toán

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Chi tiết một giao dịch thanh toán.
- **Method:** `GET`
- **Endpoint:** `/payments/{payment_id}`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `payment_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

## 3. Response

### `200`

```json
{
  "id": 1,
  "student_package_id": 1,
  "amount": "string",
  "method": "CASH",
  "status": "PENDING",
  "note": "string",
  "recorded_by": 1,
  "recorded_at": "2026-09-14T06:00:00+07:00",
  "confirmed_by": 1,
  "confirmed_at": "2026-09-14T06:00:00+07:00",
  "voided_by": 1,
  "voided_at": "2026-09-14T06:00:00+07:00",
  "void_reason": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| student_package_id | integer | Có | — |
| amount | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| method | `CASH` \| `TRANSFER` | Có | — |
| status | `PENDING` \| `CONFIRMED` \| `VOID` | Có | — |
| note | string \| null | Có | — |
| recorded_by | integer | Có | — |
| recorded_at | string (date-time) | Có | — |
| confirmed_by | integer \| null | Có | — |
| confirmed_at | string (date-time) \| null | Có | — |
| voided_by | integer \| null | Có | — |
| voided_at | string (date-time) \| null | Có | — |
| void_reason | string \| null | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
