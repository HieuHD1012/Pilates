# API: Danh sách đăng ký cho nhân viên quản lý

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách đăng ký cho nhân viên quản lý.
- **Method:** `GET`
- **Endpoint:** `/bookings`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Học viên không đi qua đây — họ đọc `/my-schedule`, nơi phạm vi đã bị ghim
vào chính họ. Một endpoint chung có tham số `student_id` là chỗ dễ quên
ghim nhất.

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
| `class_session_id` | integer \| null | Không | — |
| `student_id` | integer \| null | Không | — |
| `status` | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` \| null | Không | — |
| `held_only` | boolean | Không | mặc định `False` |
| `starts_from` | string (date-time) \| null | Không | — |
| `starts_to` | string (date-time) \| null | Không | — |
| `limit` | integer | Không | ≥ 1; ≤ 500; mặc định `200` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "id": 1,
    "class_session_id": 1,
    "student_id": 1,
    "student_package_id": 1,
    "status": "BOOKED",
    "created_at": "2026-09-14T06:00:00+07:00"
  }
]
```

Mảng `[BookingResponse](#bookingresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### BookingResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| class_session_id | integer | Có | — |
| student_id | integer | Có | — |
| student_package_id | integer | Có | — |
| status | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` | Có | — |
| created_at | string (date-time) | Có | — |
