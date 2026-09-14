# API: Lịch lớp theo khoảng thời gian

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Lịch lớp theo khoảng thời gian.
- **Method:** `GET`
- **Endpoint:** `/classes`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

`scope_class_sessions` ghim phạm vi **vào câu truy vấn**: HLV chỉ lấy được
lớp mình dạy, học viên chỉ thấy lớp còn hiệu lực. Lọc sau khi lấy là cách
lịch của HLV này rò sang HLV khác.

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
| `starts_from` | string (date-time) \| null | Không | — |
| `starts_to` | string (date-time) \| null | Không | — |
| `trainer_id` | integer \| null | Không | — |
| `class_type` | `GROUP` \| `PRIVATE` \| null | Không | — |
| `status` | `SCHEDULED` \| `CANCELLED` \| null | Không | — |
| `limit` | integer | Không | ≥ 1; ≤ 500; mặc định `200` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
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
```

Mảng `[ClassSessionResponse](#classsessionresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
**Tự ghim phạm vi theo vai**: ADMIN/STAFF thấy tất cả, HLV chỉ thấy lớp mình
dạy, học viên chỉ thấy lớp còn hiệu lực. Cùng một URL, ba kết quả khác nhau —
đúng như thiết kế.

Khoảng `starts_from` / `starts_to` là **nửa mở**: muốn trọn ngày 30/09 thì
`starts_to` là `2026-10-01T00:00:00`.
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
