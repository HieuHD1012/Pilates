# API: Đổi mật khẩu khi đang đăng nhập; phải khai đúng mật khẩu cũ

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Đổi mật khẩu khi đang đăng nhập; phải khai đúng mật khẩu cũ.
- **Method:** `POST`
- **Endpoint:** `/auth/change-password`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

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
  "current_password": "string",
  "new_password": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| current_password | string | Có | tối thiểu 1 ký tự; tối đa 128 ký tự |
| new_password | string | Có | tối thiểu 10 ký tự; tối đa 128 ký tự |

## 3. Response

### `200`

```json
{
  "message": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| message | string | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
