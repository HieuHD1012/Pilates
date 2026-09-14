# API: Thêm một loại gói vào danh mục

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Thêm một loại gói vào danh mục.
- **Method:** `POST`
- **Endpoint:** `/package-types`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

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
  "name": "string",
  "price": 1.0,
  "credits": 1,
  "duration_days": 1,
  "class_type": "GROUP",
  "is_selling": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Có | tối thiểu 1 ký tự; tối đa 120 ký tự |
| price | number \| string \| null | Không | ≥ 0.0; mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| credits | integer | Có | > 0.0 |
| duration_days | integer | Có | > 0.0 |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| is_selling | boolean | Không | mặc định `True` |

## 3. Response

### `201`

```json
{
  "id": 1,
  "name": "string",
  "price": "string",
  "credits": 1,
  "duration_days": 1,
  "class_type": "GROUP",
  "is_selling": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| name | string | Có | — |
| price | string \| null | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| credits | integer | Có | — |
| duration_days | integer | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| is_selling | boolean | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
