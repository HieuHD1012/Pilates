# API: Đội ngũ HLV công khai

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Đội ngũ HLV công khai.
- **Method:** `GET`
- **Endpoint:** `/public/trainers`
- **Auth:** Không cần đăng nhập

`is_public` quyết định ai xuất hiện; `is_active` loại người đã nghỉ. Chọn
tường minh từng cột thay vì lấy cả hàng — trường không được đọc lên thì
không thể lọt vào response do sơ ý.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Không | `Bearer <access_token>` |

### Path Params

Không có.

### Query Params

Không có.

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "full_name": "string",
    "photo_key": "string",
    "bio": "string"
  }
]
```

Mảng `[PublicTrainer](#publictrainer)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### PublicTrainer

| Field | Type | Required | Description |
|---|---|---|---|
| full_name | string | Có | — |
| photo_key | string \| null | Không | — |
| bio | string \| null | Không | — |
