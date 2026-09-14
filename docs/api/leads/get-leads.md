# API: Danh sách khách quan tâm gửi từ form tư vấn trên trang công khai

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách khách quan tâm gửi từ form tư vấn trên trang công khai.
- **Method:** `GET`
- **Endpoint:** `/leads`
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
| `status` | `NEW` \| `CONTACTED` \| `CONVERTED` \| `LOST` \| null | Không | — |
| `source` | string \| null | Không | tối đa 64 ký tự |
| `q` | string \| null | Không | tối đa 120 ký tự |
| `limit` | integer | Không | ≥ 1; ≤ 200; mặc định `50` |
| `offset` | integer | Không | ≥ 0; mặc định `0` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "id": 1,
    "full_name": "string",
    "phone": "string",
    "need": "string",
    "source": "string",
    "status": "NEW",
    "assigned_to": 1,
    "converted_student_id": 1,
    "created_at": "2026-09-14T06:00:00+07:00"
  }
]
```

Mảng `[LeadResponse](#leadresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### LeadResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| full_name | string | Có | — |
| phone | string | Có | — |
| need | string \| null | Có | — |
| source | string \| null | Có | — |
| status | `NEW` \| `CONTACTED` \| `CONVERTED` \| `LOST` | Có | — |
| assigned_to | integer \| null | Có | — |
| converted_student_id | integer \| null | Có | — |
| created_at | string (date-time) | Có | — |
