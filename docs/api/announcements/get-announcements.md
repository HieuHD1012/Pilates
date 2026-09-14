# API: Danh sách thông báo, gồm cả bản chưa đăng

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách thông báo, gồm cả bản chưa đăng.
- **Method:** `GET`
- **Endpoint:** `/announcements`
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
| `is_published` | boolean \| null | Không | — |
| `limit` | integer | Không | ≥ 1; ≤ 200; mặc định `50` |
| `offset` | integer | Không | ≥ 0; mặc định `0` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "id": 1,
    "title": "string",
    "body": "string",
    "is_published": true,
    "publish_at": "2026-09-14T06:00:00+07:00",
    "created_by": 1,
    "created_at": "2026-09-14T06:00:00+07:00",
    "updated_at": "2026-09-14T06:00:00+07:00",
    "updated_by": 1
  }
]
```

Mảng `[AnnouncementResponse](#announcementresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### AnnouncementResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| title | string | Có | — |
| body | string | Có | — |
| is_published | boolean | Có | — |
| publish_at | string (date-time) \| null | Có | — |
| created_by | integer | Có | — |
| created_at | string (date-time) | Có | — |
| updated_at | string (date-time) \| null | Có | — |
| updated_by | integer \| null | Có | — |
