# API: Mở khoá tài khoản đã bị khoá

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Mở khoá tài khoản đã bị khoá.
- **Method:** `POST`
- **Endpoint:** `/accounts/{account_id}/unlock`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN**

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `account_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

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
