# API: Học viên tự đăng ký: thành công thì BOOKED và trừ ngay 1 buổi

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Học viên tự đăng ký: thành công thì BOOKED và trừ ngay 1 buổi.
- **Method:** `POST`
- **Endpoint:** `/bookings`
- **Auth:** `Authorization: Bearer <access_token>` — vai **STUDENT (chỉ của mình)**

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
  "class_session_id": 1,
  "student_id": 1,
  "student_package_id": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| class_session_id | integer | Có | — |
| student_id | integer \| null | Không | — |
| student_package_id | integer \| null | Không | — |

## 3. Response

### `201`

```json
{
  "booking": {
    "id": 1,
    "class_session_id": 1,
    "student_id": 1,
    "student_package_id": 1,
    "status": "BOOKED",
    "created_at": "2026-09-14T06:00:00+07:00"
  },
  "student_package_id": 1,
  "credits_remaining": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| booking | [BookingResponse](#bookingresponse) | Có | — |
| student_package_id | integer | Có | — |
| credits_remaining | integer | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Chỉ STUDENT đăng ký cho chính mình; bỏ student_id để dùng hồ sơ hiện tại.
Gói phải ACTIVE, còn buổi, đúng loại và còn hạn cả hôm nay lẫn ngày học.
Không chỉ định gói thì chọn gói đủ điều kiện có end_date sớm nhất.
Thành công trả BOOKED và trừ ngay 1 buổi; không cần xác nhận.
Lớp đầy trả SESSION_FULL, không trừ buổi; không có hàng chờ.
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
