# API: Tổng quan: số buổi còn lại và các gói đang hoạt động

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Tổng quan: số buổi còn lại và các gói đang hoạt động.
- **Method:** `GET`
- **Endpoint:** `/students/{student_id}/overview`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Số buổi tính từ sổ `credit_ledger` và **chỉ gồm gói đang hoạt động**. Gói
hết hạn còn buổi chưa dùng không bị thu hồi nhưng cũng không vào đây.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

## 3. Response

### `200`

```json
{
  "student": {
    "id": 1,
    "user_id": 1,
    "full_name": "string",
    "phone": "string",
    "email": "string",
    "dob": "2026-09-14",
    "note": "string",
    "status": "ACTIVE",
    "created_at": "2026-09-14T06:00:00+07:00"
  },
  "credits_remaining": 1,
  "active_packages": [
    {
      "id": 1,
      "name": "string",
      "class_type": "GROUP",
      "price": "string",
      "start_date": "2026-09-14",
      "end_date": "2026-09-14",
      "credits_remaining": 1,
      "days_remaining": 1
    }
  ],
  "needs_renewal": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| student | [StudentResponse](#studentresponse) | Có | — |
| credits_remaining | integer | Có | — |
| active_packages | [PackageSummary](#packagesummary)[] | Có | — |
| needs_renewal | boolean | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Trả `{student, credits_remaining, active_packages, needs_renewal}` — đủ cho phần
đầu màn chi tiết trong **một** request, thay vì ba.

`credits_remaining` **chỉ tính gói đang hoạt động**. Gói hết hạn còn buổi chưa
dùng không bị thu hồi, nhưng cũng không vào con số này.
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

### PackageSummary

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| name | string | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| price | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| start_date | string (date) | Có | — |
| end_date | string (date) | Có | — |
| credits_remaining | integer | Có | — |
| days_remaining | integer | Có | — |
