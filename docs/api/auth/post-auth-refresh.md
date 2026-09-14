# API: Đổi refresh token lấy một cặp token mới

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Đổi refresh token lấy một cặp token mới.
- **Method:** `POST`
- **Endpoint:** `/auth/refresh`
- **Auth:** Không cần đăng nhập

Xoay token có **cửa sổ ân hạn 10 giây**: trình bày lại token đã dùng sau
ngần đó bị coi là token bị đánh cắp và thu hồi toàn bộ phiên của người đó.
FE vì thế chỉ được có một lần refresh đang bay.

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
  "refresh_token": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| refresh_token | string | Có | tối đa 1024 ký tự |

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
**Chỉ được có một lần refresh đang bay.** Nhiều request nhận 401 cùng lúc phải
xếp hàng sau một promise refresh chung. Mỗi request tự gọi refresh nghĩa là lần
thứ hai trình bày một token đã dùng — quá cửa sổ ân hạn 10 giây thì toàn bộ
phiên của người đó bị thu hồi và họ bị đăng xuất khỏi mọi thiết bị.
<!-- ghi-chu:end -->
