# API: Tự sửa tên và số điện thoại của tài khoản đang đăng nhập

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Tự sửa tên và số điện thoại của tài khoản đang đăng nhập.
- **Method:** `PATCH`
- **Endpoint:** `/auth/me`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Đồng bộ hồ sơ học viên/HLV liên kết trong cùng giao dịch.
Email đăng nhập, vai và liên kết hồ sơ không được sửa qua endpoint này.

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
  "full_name": "string",
  "phone": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| full_name | string \| null | Không | tối thiểu 1 ký tự; tối đa 120 ký tự |
| phone | string \| null | Không | tối thiểu 1 ký tự; tối đa 32 ký tự |

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
  "student_id": 1,
  "trainer_id": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| email | string (email) | Có | — |
| full_name | string \| null | Có | — |
| phone | string \| null | Không | — |
| role | `ADMIN` \| `STAFF` \| `TRAINER` \| `STUDENT` | Có | — |
| status | `ACTIVE` \| `PENDING_ACTIVATION` | Có | — |
| student_id | integer \| null | Không | — |
| trainer_id | integer \| null | Không | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
- Gửi những trường muốn thay đổi; trường bỏ qua giữ nguyên. Tên không được
  để trống hoặc gửi `null`. Không nhận email, vai, trạng thái hay ID hồ sơ.
- Số điện thoại được chuẩn hóa. Học viên bắt buộc có số điện thoại và không
  được dùng số đã thuộc hồ sơ học viên khác (`409 STUDENT_PHONE_TAKEN`).
  Nhân viên/HLV có thể gửi `phone=null` để xóa số liên hệ.
- Khi tài khoản học viên/HLV chưa nối hồ sơ, trả `403`; sửa tên và số điện thoại
  thành công cập nhật cả tài khoản và hồ sơ trong cùng giao dịch.
<!-- ghi-chu:end -->
