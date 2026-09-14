# API: Tạo một buổi lớp. Từ chối nếu HLV đã có lớp trùng giờ

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Tạo một buổi lớp. Từ chối nếu HLV đã có lớp trùng giờ.
- **Method:** `POST`
- **Endpoint:** `/classes`
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
  "starts_at": "2026-09-14T06:00:00+07:00",
  "ends_at": "2026-09-14T06:00:00+07:00",
  "trainer_id": 1,
  "class_type": "GROUP",
  "capacity": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| starts_at | string (date-time) | Có | — |
| ends_at | string (date-time) | Có | — |
| trainer_id | integer | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| capacity | integer \| null | Không | ≥ 1.0 |

## 3. Response

### `201`

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
  "cancel_reason": "string"
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

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
