# API: Xem trước các buổi sẽ tạo, kèm buổi nào trùng giờ HLV

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Xem trước các buổi sẽ tạo, kèm buổi nào trùng giờ HLV.
- **Method:** `POST`
- **Endpoint:** `/classes/recurrence/preview`
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
  "start_date": "2026-09-14",
  "end_date": "2026-09-14",
  "weekdays": [
    1
  ],
  "start_time": "string",
  "duration_minutes": 1,
  "trainer_id": 1,
  "class_type": "GROUP",
  "capacity": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| start_date | string (date) | Có | — |
| end_date | string (date) | Có | — |
| weekdays | integer[] | Có | — |
| start_time | string (time) | Có | — |
| duration_minutes | integer | Có | ≤ 480.0; > 0.0 |
| trainer_id | integer | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| capacity | integer \| null | Không | ≥ 1.0 |

## 3. Response

### `200`

```json
{
  "occurrences": [
    {
      "starts_at": "2026-09-14T06:00:00+07:00",
      "ends_at": "2026-09-14T06:00:00+07:00",
      "conflict": "string"
    }
  ],
  "available_count": 1,
  "conflict_count": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| occurrences | [OccurrenceResponse](#occurrenceresponse)[] | Có | — |
| available_count | integer | Có | — |
| conflict_count | integer | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### OccurrenceResponse

| Field | Type | Required | Description |
|---|---|---|---|
| starts_at | string (date-time) | Có | — |
| ends_at | string (date-time) | Có | — |
| conflict | string \| null | Có | — |
