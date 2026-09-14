# API: Gói đã cộng buổi mà tiền chưa xác nhận quá hạn

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Gói đã cộng buổi mà tiền chưa xác nhận quá hạn.
- **Method:** `GET`
- **Endpoint:** `/reports/unconfirmed-payments`
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
| `older_than_days` | integer | Không | ≥ 0; ≤ 365; mặc định `7` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "payment_id": 1,
    "student_id": 1,
    "student_name": "string",
    "student_package_id": 1,
    "package_name": "string",
    "amount": "string",
    "recorded_at": "2026-09-14T06:00:00+07:00",
    "days_pending": 1
  }
]
```

Mảng `[UnconfirmedPaymentResponse](#unconfirmedpaymentresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### UnconfirmedPaymentResponse

| Field | Type | Required | Description |
|---|---|---|---|
| payment_id | integer | Có | — |
| student_id | integer | Có | — |
| student_name | string | Có | — |
| student_package_id | integer | Có | — |
| package_name | string | Có | — |
| amount | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| recorded_at | string (date-time) | Có | — |
| days_pending | integer | Có | — |
