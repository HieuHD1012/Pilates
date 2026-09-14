# API: Danh sách điểm danh của lớp HLV đang dạy, không trả tiền hay thông tin gói

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách điểm danh của lớp HLV đang dạy, không trả tiền hay thông tin gói.
- **Method:** `GET`
- **Endpoint:** `/classes/{session_id}/attendance`
- **Auth:** `Authorization: Bearer <access_token>` — vai **TRAINER (chỉ lớp mình dạy)**

Đọc được trước giờ kết thúc để chuẩn bị; cập nhật chỉ được sau ends_at.
Lượt đã hủy không xuất hiện trong danh sách.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | integer | Có | — |

### Query Params

Không có.

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
    "status": "BOOKED",
    "attendance_marked_by": 1,
    "attendance_marked_at": "2026-09-14T06:00:00+07:00",
    "student_name": "string"
  }
]
```

Mảng `[AttendanceRosterItem](#attendancerosteritem)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### AttendanceRosterItem

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| class_session_id | integer | Có | — |
| student_id | integer | Có | — |
| status | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` | Có | — |
| attendance_marked_by | integer \| null | Có | — |
| attendance_marked_at | string (date-time) \| null | Có | — |
| student_name | string | Có | — |
