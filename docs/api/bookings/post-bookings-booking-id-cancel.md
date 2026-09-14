# API: Hủy một đăng ký

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Hủy một đăng ký.
- **Method:** `POST`
- **Endpoint:** `/bookings/{booking_id}/cancel`
- **Auth:** `Authorization: Bearer <access_token>` — vai **STUDENT (chỉ của mình)**

Idempotent: gọi lại trên đăng ký đã hủy không trừ hay hoàn thêm lần nào.
Hủy đúng hạn hoàn 1 buổi. Sau hạn trả CANCELLATION_CLOSED,
giữ nguyên đăng ký và số buổi. Group 4 giờ, Private/Duo 1 giờ.

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

Xem mô tả ở phần Overview.

## 3. Response

### `200`

```json
{
  "booking_id": 1,
  "status": "BOOKED",
  "refunded": true,
  "credits_remaining": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| booking_id | integer | Có | — |
| status | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` | Có | — |
| refunded | boolean | Có | — |
| credits_remaining | integer | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Chỉ học viên hủy đăng ký của mình. Group trước giờ học ít nhất 4 tiếng;
Private/Duo ít nhất 1 tiếng. Đúng mốc vẫn được hủy và hoàn 1 buổi vào gói cũ.
Sau hạn trả 409 CANCELLATION_CLOSED, giữ booking và sổ buổi.
Gọi lại lượt đã hủy không hoàn thêm. Không có ân hạn dời lịch.
Dùng can_cancel và cancel_deadline từ /my-schedule.
<!-- ghi-chu:end -->
