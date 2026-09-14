# API: Thống kê lớp và tỉ lệ lấp đầy của một kỳ

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Thống kê lớp và tỉ lệ lấp đầy của một kỳ.
- **Method:** `GET`
- **Endpoint:** `/reports/classes`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

`fill_rate` là `null` khi kỳ không có lớp nào — để trống ô đó, đừng hiện 0%.

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
{
  "period_start": "2026-09-14",
  "period_end": "2026-09-14",
  "scheduled_sessions": 1,
  "cancelled_sessions": 1,
  "total_bookings": 1,
  "total_capacity": 1,
  "fill_rate": 1.0,
  "detail_path": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| period_start | string (date) | Có | — |
| period_end | string (date) | Có | — |
| scheduled_sessions | integer | Có | — |
| cancelled_sessions | integer | Có | — |
| total_bookings | integer | Có | — |
| total_capacity | integer | Có | — |
| fill_rate | number \| null | Có | — |
| detail_path | string | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
`fill_rate` là **`null`** khi kỳ không có lớp nào — để trống ô đó. Hiện "0%" là
nói rằng lớp có mở mà không ai đến.
<!-- ghi-chu:end -->
