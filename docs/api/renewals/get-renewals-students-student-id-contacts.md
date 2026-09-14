# API: Lịch sử liên hệ gia hạn của một học viên, mới nhất trước

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Lịch sử liên hệ gia hạn của một học viên, mới nhất trước.
- **Method:** `GET`
- **Endpoint:** `/renewals/students/{student_id}/contacts`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer | Có | — |

### Query Params

| Name | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | Không | ≥ 1; ≤ 200; mặc định `50` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "id": 1,
    "student_id": 1,
    "contacted_at": "2026-09-14T06:00:00+07:00",
    "result": "string",
    "next_contact_date": "2026-09-14",
    "actor_user_id": 1
  }
]
```

Mảng `[RenewalContactResponse](#renewalcontactresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### RenewalContactResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| student_id | integer | Có | — |
| contacted_at | string (date-time) | Có | — |
| result | string | Có | — |
| next_contact_date | string (date) \| null | Có | — |
| actor_user_id | integer | Có | — |
