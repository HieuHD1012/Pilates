# API: Danh mục gói tập đang bán

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh mục gói tập đang bán.
- **Method:** `GET`
- **Endpoint:** `/package-types`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

Không có.

### Query Params

| Name | Type | Required | Description |
|---|---|---|---|
| `class_type` | `GROUP` \| `PRIVATE` \| null | Không | — |
| `is_selling` | boolean \| null | Không | — |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "id": 1,
    "name": "string",
    "price": "string",
    "credits": 1,
    "duration_days": 1,
    "class_type": "GROUP",
    "is_selling": true
  }
]
```

Mảng `[PackageTypeResponse](#packagetyperesponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### PackageTypeResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| name | string | Có | — |
| price | string \| null | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| credits | integer | Có | — |
| duration_days | integer | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| is_selling | boolean | Có | — |
