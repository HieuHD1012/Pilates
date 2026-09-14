# API: Nội dung nhị phân của một ảnh tiến trình

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Nội dung nhị phân của một ảnh tiến trình.
- **Method:** `GET`
- **Endpoint:** `/students/{student_id}/progress-photos/{photo_id}/file`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Ảnh **không** phục vụ qua URL tĩnh: mỗi lần xem đều đi qua đây kèm token và
bị kiểm quyền lại.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer | Có | — |
| `photo_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

## 3. Response

### `200`

Không có nội dung.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Endpoint cần header `Authorization`, nên **không gắn thẳng vào `<img src>`**.
Tải qua `fetch` rồi dựng `blob:` URL.

Quyền hẹp hơn mọi thứ khác trong hệ thống: ADMIN, HLV phụ trách, và chính học
viên đó. **STAFF bị từ chối.**
<!-- ghi-chu:end -->
