# API: Sửa hồ sơ tài khoản

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Sửa hồ sơ tài khoản.
- **Method:** `PATCH`
- **Endpoint:** `/accounts/{account_id}`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN**

Từ chối mọi trường lạ bằng 422 — cố ý. Khoá tài khoản đi bằng
`POST /accounts/{id}/lock`, không phải bằng `is_active` ở đây: một màn hình
gửi `{"is_active": false}` rồi nhận 200 và hiện "đã lưu" trong khi tài khoản
vẫn mở là kiểu hỏng tệ nhất.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `account_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

```json
{
  "full_name": "string",
  "phone": "string",
  "role": "ADMIN",
  "student_id": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| full_name | string \| null | Không | tối đa 120 ký tự |
| phone | string \| null | Không | tối đa 32 ký tự |
| role | `ADMIN` \| `STAFF` \| `TRAINER` \| `STUDENT` \| null | Không | — |
| student_id | integer \| null | Không | ≥ 1.0 |

## 3. Response

### `200`

```json
{
  "id": 1,
  "email": "hocvien@example.com",
  "full_name": "string",
  "phone": "string",
  "role": "ADMIN",
  "status": "ACTIVE",
  "is_active": true,
  "created_at": "2026-09-14T06:00:00+07:00",
  "student_id": 1,
  "trainer_id": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| email | string (email) | Có | — |
| full_name | string \| null | Có | — |
| phone | string \| null | Có | — |
| role | `ADMIN` \| `STAFF` \| `TRAINER` \| `STUDENT` | Có | — |
| status | `ACTIVE` \| `PENDING_ACTIVATION` | Có | — |
| is_active | boolean | Có | — |
| created_at | string (date-time) | Có | — |
| student_id | integer \| null | Không | — |
| trainer_id | integer \| null | Không | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
**Từ chối mọi trường lạ bằng 422.** Khoá tài khoản đi bằng
[`POST /accounts/{id}/lock`](post-accounts-account-id-lock.md), không phải bằng
`is_active` ở đây — vì lock còn phải thu hồi mọi phiên đang mở, việc mà một
`PATCH` đơn thuần không làm.

ADMIN có thể gửi `student_id` để nối một tài khoản STUDENT cũ chưa có hồ sơ.
Không bỏ liên kết, không chuyển tài khoản sang học viên khác. Không đổi vai
của tài khoản đang nối hồ sơ học viên/HLV. Đổi vai thành STUDENT phải kèm hồ sơ.
Các lỗi: `STUDENT_REQUIRED` / `ACCOUNT_ROLE_MISMATCH` (422),
`STUDENT_HAS_ACCOUNT` / `ACCOUNT_ALREADY_LINKED` (409), `NOT_FOUND` (404).
<!-- ghi-chu:end -->
