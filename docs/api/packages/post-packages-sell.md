# API: Bán gói cho học viên — tạo gói và cộng buổi trong **một transaction**

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Bán gói cho học viên — tạo gói và cộng buổi trong **một transaction**.
- **Method:** `POST`
- **Endpoint:** `/packages/sell`
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
  "student_id": 1,
  "package_type_id": 1,
  "start_date": "2026-09-14"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| student_id | integer | Có | — |
| package_type_id | integer | Có | — |
| start_date | string (date) \| null | Không | — |

## 3. Response

### `201`

```json
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
```

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

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
**Buổi được cộng ngay khi bán gói, không đợi xác nhận thanh toán.** Nhân viên
đứng quầy cần học viên tập được ngay. Khoảng lệch "đã cho tập mà tiền chưa về"
nhìn thấy ở
[`GET /reports/unconfirmed-payments`](../reports/get-reports-unconfirmed-payments.md).
<!-- ghi-chu:end -->
