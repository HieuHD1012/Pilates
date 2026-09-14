# API: Admin cấp tài khoản. STUDENT bắt buộc có student_id của hồ sơ đã tạo

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Admin cấp tài khoản. STUDENT bắt buộc có student_id của hồ sơ đã tạo.
- **Method:** `POST`
- **Endpoint:** `/accounts`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN**

Tạo tài khoản và nối hồ sơ trong cùng giao dịch. Học viên không tự đăng ký.
Bỏ password thì gửi liên kết để học viên tự đặt mật khẩu.
HLV được nối hồ sơ qua POST/PATCH /trainers bằng user_id.

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
  "email": "hocvien@example.com",
  "full_name": "string",
  "phone": "string",
  "role": "ADMIN",
  "student_id": 1,
  "password": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| email | string (email) | Có | — |
| full_name | string \| null | Không | tối đa 120 ký tự |
| phone | string \| null | Không | tối đa 32 ký tự |
| role | `ADMIN` \| `STAFF` \| `TRAINER` \| `STUDENT` | Có | — |
| student_id | integer \| null | Không | ≥ 1.0 |
| password | string \| null | Không | tối thiểu 10 ký tự; tối đa 128 ký tự |

## 3. Response

### `201`

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
Chỉ ADMIN cấp tài khoản. Với STUDENT, bắt buộc gửi `student_id` của hồ sơ đã có.
Bỏ `password` thì hệ thống gửi link để học viên tự đặt mật khẩu. Link được gửi
sau khi cả tài khoản và liên kết hồ sơ đã lưu. Học viên không tự đăng ký.

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 422 | `STUDENT_REQUIRED` | Chưa chọn hồ sơ học viên |
| 422 | `ACCOUNT_ROLE_MISMATCH` | Gửi student_id cho vai khác STUDENT |
| 404 | `NOT_FOUND` | Hồ sơ học viên không tồn tại |
| 409 | `STUDENT_HAS_ACCOUNT` | Hồ sơ đã được cấp tài khoản |
| 422 | `EMAIL_TAKEN` | Email đã có tài khoản |
<!-- ghi-chu:end -->
