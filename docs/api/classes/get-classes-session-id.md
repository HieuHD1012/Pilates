# API: Chi tiết một buổi lớp

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Chi tiết một buổi lớp.
- **Method:** `GET`
- **Endpoint:** `/classes/{session_id}`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

`booked_count` và `seats_left` **chỉ trả cho nhân viên**; học viên nhận bản
rút gọn.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

## 3. Response

### `200`

```json
{
  "id": 1,
  "starts_at": "2026-09-14T06:00:00+07:00",
  "ends_at": "2026-09-14T06:00:00+07:00",
  "trainer_id": 1,
  "class_type": "GROUP",
  "capacity": 1,
  "status": "SCHEDULED",
  "recurrence_id": "string",
  "cancel_reason": "string",
  "booked_count": 1,
  "seats_left": 1,
  "trainer_name": "string"
}
```

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
| booked_count | integer | Có | — |
| seats_left | integer | Có | — |
| trainer_name | string | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
