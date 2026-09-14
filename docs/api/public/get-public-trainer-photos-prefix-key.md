# API: Ảnh HLV công khai

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Ảnh HLV công khai.
- **Method:** `GET`
- **Endpoint:** `/public/trainer-photos/{prefix}/{key}`
- **Auth:** Không cần đăng nhập

Chỉ phục vụ khoá đang gắn với một HLV **đang công khai**: ảnh của HLV đã
gỡ khỏi trang phải biến mất theo, chứ không sống tiếp nhờ ai đó còn giữ
đường dẫn.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Không | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `prefix` | string | Có | — |
| `key` | string | Có | — |

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
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
