# API: Tải ảnh tiến trình

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Tải ảnh tiến trình.
- **Method:** `POST`
- **Endpoint:** `/students/{student_id}/progress-photos`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Quyền tải trùng với quyền xem — cùng một tập người, cùng một quy tắc. Hai
quy tắc riêng cho cùng một tài nguyên là hai chỗ để lệch nhau.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `multipart/form-data` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Gửi dạng `multipart/form-data` với các trường sau:

| Field | Type | Required | Description |
|---|---|---|---|
| file | string | Có | — |
| taken_at | string (date-time) \| null | Không | — |

## 3. Response

### `201`

```json
{
  "id": 1,
  "student_id": 1,
  "taken_at": "2026-09-14T06:00:00+07:00",
  "uploaded_by": 1,
  "created_at": "2026-09-14T06:00:00+07:00"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| student_id | integer | Có | — |
| taken_at | string (date-time) | Có | — |
| uploaded_by | integer | Có | — |
| created_at | string (date-time) | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
