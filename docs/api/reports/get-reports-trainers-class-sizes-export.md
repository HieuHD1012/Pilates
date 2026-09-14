# API: File xuất **từ chính truy vấn của màn hình**, cùng bộ lọc

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** File xuất **từ chính truy vấn của màn hình**, cùng bộ lọc.
- **Method:** `GET`
- **Endpoint:** `/reports/trainers/class-sizes/export`
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
| `period_start` | string (date) \| null | Không | — |
| `period_end` | string (date) \| null | Không | — |
| `format` | string | Không | mẫu `^(csv|xlsx)$`; mặc định `csv` |

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
