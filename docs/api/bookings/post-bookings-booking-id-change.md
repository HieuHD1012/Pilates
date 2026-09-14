# API: Đổi sang buổi lớp khác — hủy buổi cũ và đặt buổi mới trong một giao dịch

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Đổi sang buổi lớp khác — hủy buổi cũ và đặt buổi mới trong một giao dịch.
- **Method:** `POST`
- **Endpoint:** `/bookings/{booking_id}/change`
- **Auth:** `Authorization: Bearer <access_token>` — vai **STUDENT (chỉ của mình)**

Hoặc đổi được cả hai, hoặc không đổi gì. Buổi cũ quá hạn hủy thì
từ chối đổi với CANCELLATION_CLOSED. Gói phải còn hạn vào ngày lớp mới.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `booking_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

```json
{
  "new_class_session_id": 1,
  "student_package_id": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| new_class_session_id | integer | Có | — |
| student_package_id | integer \| null | Không | — |

## 3. Response

### `200`

```json
{
  "cancelled": {
    "booking_id": 1,
    "status": "BOOKED",
    "refunded": true,
    "credits_remaining": 1
  },
  "booked": {
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
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| cancelled | [CancelBookingResult](#cancelbookingresult) | Có | — |
| booked | [BookingResult](#bookingresult) | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Chỉ học viên đổi đăng ký của mình; lớp cũ phải còn hạn hủy.
Quá hạn trả CANCELLATION_CLOSED, không thay đổi booking hoặc số buổi.
Hủy + hoàn buổi cũ và đăng ký + trừ buổi mới trong một giao dịch.
Lớp mới đầy hoặc gói không còn hạn vào ngày học thì toàn bộ thao tác rollback.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### CancelBookingResult

| Field | Type | Required | Description |
|---|---|---|---|
| booking_id | integer | Có | — |
| status | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` | Có | — |
| refunded | boolean | Có | — |
| credits_remaining | integer | Có | — |

### BookingResult

| Field | Type | Required | Description |
|---|---|---|---|
| booking | [BookingResponse](#bookingresponse) | Có | — |
| student_package_id | integer | Có | — |
| credits_remaining | integer | Có | — |

### BookingResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| class_session_id | integer | Có | — |
| student_id | integer | Có | — |
| student_package_id | integer | Có | — |
| status | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` | Có | — |
| created_at | string (date-time) | Có | — |
