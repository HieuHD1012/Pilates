# API: Thông báo đã đăng

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Thông báo đã đăng.
- **Method:** `GET`
- **Endpoint:** `/public/announcements`
- **Auth:** Không cần đăng nhập

`publish_at` ở tương lai thì chưa hiện — hẹn giờ đăng mà vẫn lộ ngay thì
cái hẹn giờ vô nghĩa.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Không | `Bearer <access_token>` |

### Path Params

Không có.

### Query Params

| Name | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | Không | ≥ 1; ≤ 100; mặc định `20` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "title": "string",
    "body": "string",
    "publish_at": "2026-09-14T06:00:00+07:00"
  }
]
```

Mảng `[PublicAnnouncement](#publicannouncement)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### PublicAnnouncement

| Field | Type | Required | Description |
|---|---|---|---|
| title | string | Có | — |
| body | string | Có | — |
| publish_at | string (date-time) \| null | Không | — |
