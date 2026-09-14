# API: Vai và hồ sơ nghiệp vụ của người đang đăng nhập

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Vai và hồ sơ nghiệp vụ của người đang đăng nhập.
- **Method:** `GET`
- **Endpoint:** `/auth/me`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Đây là **nguồn duy nhất** cho `student_id` / `trainer_id` — đừng đọc chúng
từ payload JWT.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

Không có.

### Query Params

Không có.

### Request Body

Không có.

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
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
