# API: Gói tập đang bán

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Gói tập đang bán.
- **Method:** `GET`
- **Endpoint:** `/public/packages`
- **Auth:** Không cần đăng nhập

Giá hiện **khi studio đã cung cấp**. Chưa có thì trả `null` để giao diện
dựng trạng thái rỗng có nhãn — không thay bằng 0, vì 0 là một con số và nó
nói sai.

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
    "name": "string",
    "price": "string",
    "credits": 1,
    "duration_days": 1,
    "class_type": "GROUP"
  }
]
```

Mảng `[PublicPackage](#publicpackage)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
`price` kiểu `string | null`. `null` nghĩa là studio chưa công bố giá — hiện
**nhãn trạng thái rỗng**, không phải `0đ`.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### PublicPackage

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Có | — |
| price | string \| null | Không | — |
| credits | integer | Có | — |
| duration_days | integer | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
