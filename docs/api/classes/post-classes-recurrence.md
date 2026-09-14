# API: Tạo cả nhóm buổi — **all-or-nothing**

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Tạo cả nhóm buổi — **all-or-nothing**.
- **Method:** `POST`
- **Endpoint:** `/classes/recurrence`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Buổi trùng giờ bị bỏ qua ngay từ bản xem trước; nếu ai đó chiếm khung giờ
trong lúc nhân viên đang xem thì cả nhóm rollback và trả 409, chứ không để
lại một nhóm ghi dở.

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

### `201`

```json
{
  "recurrence_id": "string",
  "sessions": [
    {
      "id": 1,
      "starts_at": "2026-09-14T06:00:00+07:00",
      "ends_at": "2026-09-14T06:00:00+07:00",
      "trainer_id": 1,
      "class_type": "GROUP",
      "capacity": 1,
      "status": "SCHEDULED",
      "recurrence_id": "string",
      "cancel_reason": "string"
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| recurrence_id | string | Có | — |
| sessions | [ClassSessionResponse](#classsessionresponse)[] | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
**Tất cả hoặc không có gì.** Một buổi vướng trùng giờ HLV thì cả loạt bị từ
chối. Luôn gọi [`/recurrence/preview`](post-classes-recurrence-preview.md) trước
và hiện danh sách cho người dùng xác nhận — nhận một lỗi trùng giờ ở buổi thứ
mười một không cho người dùng biết phải sửa gì.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### ClassSessionResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| starts_at | string (date-time) | Có | — |
| ends_at | string (date-time) | Có | — |
| trainer_id | integer | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| capacity | integer | Có | — |
| status | `SCHEDULED` \| `CANCELLED` | Có | — |
| recurrence_id | string \| null | Có | — |
| cancel_reason | string \| null | Có | — |
