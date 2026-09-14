# API: Điều chỉnh số buổi thủ công — **chỉ ADMIN**, bắt buộc lý do

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Điều chỉnh số buổi thủ công — **chỉ ADMIN**, bắt buộc lý do.
- **Method:** `POST`
- **Endpoint:** `/packages/{package_id}/adjust`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN**

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `package_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

```json
{
  "delta": 1,
  "reason": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| delta | integer | Có | Số buổi cộng (dương) hoặc trừ (âm). |
| reason | string | Có | tối thiểu 3 ký tự; tối đa 500 ký tự |

## 3. Response

### `200`

```json
{
  "id": 1,
  "student_id": 1,
  "package_type_id": 1,
  "name_snapshot": "string",
  "price_snapshot": "string",
  "credits_snapshot": 1,
  "class_type_snapshot": "GROUP",
  "start_date": "2026-09-14",
  "end_date": "2026-09-14",
  "status": "ACTIVE",
  "balance_cached": 1,
  "created_at": "2026-09-14T06:00:00+07:00"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| student_id | integer | Có | — |
| package_type_id | integer \| null | Có | — |
| name_snapshot | string | Có | — |
| price_snapshot | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| credits_snapshot | integer | Có | — |
| class_type_snapshot | `GROUP` \| `PRIVATE` | Có | — |
| start_date | string (date) | Có | — |
| end_date | string (date) | Có | — |
| status | `ACTIVE` \| `EXPIRED` \| `CANCELLED` | Có | — |
| balance_cached | integer | Có | — |
| created_at | string (date-time) | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
**ADMIN, và bắt buộc khai lý do.** Đây là cửa duy nhất để số buổi thay đổi mà
không có sự kiện nghiệp vụ nào đứng sau, nên lý do là thứ duy nhất giải thích
được dòng bút toán đó về sau.
<!-- ghi-chu:end -->
