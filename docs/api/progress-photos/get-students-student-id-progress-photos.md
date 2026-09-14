# API: Danh sách ảnh, sắp theo thời điểm chụp để so sánh bắt đầu ↔ hiện tại

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách ảnh, sắp theo thời điểm chụp để so sánh bắt đầu ↔ hiện tại.
- **Method:** `GET`
- **Endpoint:** `/students/{student_id}/progress-photos`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

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

Không có.

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "id": 1,
    "student_id": 1,
    "taken_at": "2026-09-14T06:00:00+07:00",
    "uploaded_by": 1,
    "created_at": "2026-09-14T06:00:00+07:00"
  }
]
```

Mảng `[ProgressPhotoResponse](#progressphotoresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### ProgressPhotoResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| student_id | integer | Có | — |
| taken_at | string (date-time) | Có | — |
| uploaded_by | integer | Có | — |
| created_at | string (date-time) | Có | — |
