# API: Danh sách học viên

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách học viên.
- **Method:** `GET`
- **Endpoint:** `/students`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

`scope_students` ghim điều kiện chủ sở hữu **vào câu truy vấn**: học viên
đăng nhập chỉ lấy được hàng của chính mình, chứ không phải lấy hết rồi lọc
ở tầng Python — lọc sau là cách danh sách rò rỉ khi ai đó quên một nhánh.

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
| `status` | `ACTIVE` \| `INACTIVE` \| null | Không | — |
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
    "user_id": 1,
    "full_name": "string",
    "phone": "string",
    "email": "string",
    "dob": "2026-09-14",
    "note": "string",
    "status": "ACTIVE",
    "created_at": "2026-09-14T06:00:00+07:00"
  }
]
```

Mảng `[StudentResponse](#studentresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### StudentResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| user_id | integer \| null | Có | — |
| full_name | string | Có | — |
| phone | string | Có | — |
| email | string \| null | Có | — |
| dob | string (date) \| null | Có | — |
| note | string \| null | Có | — |
| status | `ACTIVE` \| `INACTIVE` | Có | — |
| created_at | string (date-time) | Có | — |
