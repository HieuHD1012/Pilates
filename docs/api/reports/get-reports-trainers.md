# API: Số buổi dạy và số lượt học của từng HLV trong kỳ

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Số buổi dạy và số lượt học của từng HLV trong kỳ.
- **Method:** `GET`
- **Endpoint:** `/reports/trainers`
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

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "trainer_id": 1,
    "trainer_name": "string",
    "scheduled_sessions": 1,
    "cancelled_sessions": 1,
    "total_bookings": 1
  }
]
```

Mảng `[TrainerStatsResponse](#trainerstatsresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### TrainerStatsResponse

| Field | Type | Required | Description |
|---|---|---|---|
| trainer_id | integer | Có | — |
| trainer_name | string | Có | — |
| scheduled_sessions | integer | Có | — |
| cancelled_sessions | integer | Có | — |
| total_bookings | integer | Có | — |
