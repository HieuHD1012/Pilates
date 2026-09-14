# API: Đăng nhập bằng email và mật khẩu

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Đăng nhập bằng email và mật khẩu.
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Auth:** Không cần đăng nhập

Bị giới hạn tần suất theo IP và theo email. Sai mật khẩu và email không tồn
tại trả về cùng một thông báo — phân biệt hai trường hợp là cho người ngoài
một cách dò xem ai có tài khoản ở studio.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Không | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

Không có.

### Query Params

Không có.

### Request Body

```json
{
  "email": "hocvien@example.com",
  "password": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| email | string (email) | Có | — |
| password | string | Có | tối thiểu 1 ký tự; tối đa 128 ký tự |

## 3. Response

### `200`

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| access_token | string | Có | — |
| refresh_token | string | Có | — |
| token_type | string | Không | mặc định `bearer` |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
