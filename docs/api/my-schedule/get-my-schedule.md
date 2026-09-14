# API: Các buổi lớp của một học viên, kèm **hậu quả của việc hủy ngay bây giờ**

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Các buổi lớp của một học viên, kèm **hậu quả của việc hủy ngay bây giờ**.
- **Method:** `GET`
- **Endpoint:** `/my-schedule`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

`student_id` chỉ dành cho nhân viên xem tab lịch sử lớp ở hồ sơ học viên;
`assert_can_read_student` là chỗ quyết định ai xem được của ai.

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
| `student_id` | integer \| null | Không | — |
| `starts_from` | string (date-time) \| null | Không | — |
| `starts_to` | string (date-time) \| null | Không | — |
| `include_cancelled` | boolean | Không | mặc định `False` |
| `limit` | integer | Không | ≥ 1; ≤ 500; mặc định `200` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "booking_id": 1,
    "class_session_id": 1,
    "starts_at": "2026-09-14T06:00:00+07:00",
    "ends_at": "2026-09-14T06:00:00+07:00",
    "class_type": "GROUP",
    "trainer_name": "string",
    "session_status": "SCHEDULED",
    "booking_status": "BOOKED",
    "cancel_deadline": "2026-09-14T06:00:00+07:00",
    "refund_if_cancelled_now": true,
    "can_cancel": true
  }
]
```

Mảng `[MyScheduleItem](#myscheduleitem)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Dùng can_cancel để khóa hủy/đổi sau hạn, cancel_deadline để hiện hạn cuối.
Group 4 tiếng, Private/Duo 1 tiếng; đúng mốc vẫn được hủy và hoàn.
Không có ân hạn dời lịch. ATTENDED/NO_SHOW không được hủy/đổi.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### MyScheduleItem

| Field | Type | Required | Description |
|---|---|---|---|
| booking_id | integer | Có | — |
| class_session_id | integer | Có | — |
| starts_at | string (date-time) | Có | — |
| ends_at | string (date-time) | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| trainer_name | string | Có | — |
| session_status | `SCHEDULED` \| `CANCELLED` | Có | — |
| booking_status | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` | Có | — |
| cancel_deadline | string (date-time) | Có | — |
| refund_if_cancelled_now | boolean | Có | — |
| can_cancel | boolean | Có | — |
