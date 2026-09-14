# API: Các dòng đứng sau con số doanh thu — cùng bộ lọc, cùng truy vấn

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Các dòng đứng sau con số doanh thu — cùng bộ lọc, cùng truy vấn.
- **Method:** `GET`
- **Endpoint:** `/reports/revenue/detail`
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
| `period_start` | string (date) \| null | Không | — |
| `period_end` | string (date) \| null | Không | — |
| `limit` | integer | Không | ≥ 1; ≤ 1000; mặc định `500` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "payment_id": 1,
    "confirmed_at": "2026-09-14T06:00:00+07:00",
    "student_name": "string",
    "package_name": "string",
    "amount": "string",
    "method": "CASH"
  }
]
```

Mảng `[RevenueRowResponse](#revenuerowresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### RevenueRowResponse

| Field | Type | Required | Description |
|---|---|---|---|
| payment_id | integer | Có | — |
| confirmed_at | string (date-time) | Có | — |
| student_name | string | Có | — |
| package_name | string | Có | — |
| amount | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| method | `CASH` \| `TRANSFER` | Có | — |
