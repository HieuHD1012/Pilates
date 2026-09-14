# API: HLV điểm danh sau ends_at: ATTENDED hoặc NO_SHOW, không đổi số buổi

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** HLV điểm danh sau ends_at: ATTENDED hoặc NO_SHOW, không đổi số buổi.
- **Method:** `PATCH`
- **Endpoint:** `/bookings/{booking_id}/attendance`
- **Auth:** `Authorization: Bearer <access_token>` — vai **TRAINER (chỉ lớp mình dạy)**

Chỉ HLV đang được gán lớp. Cho sửa nhầm giữa hai trạng thái;
lưu người và thời điểm cập nhật gần nhất. Gửi lặp cùng trạng thái không đổi audit.
Lượt đã điểm danh không còn được hủy/đổi lớp.

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
  "status": "ATTENDED"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| status | `ATTENDED` \| `NO_SHOW` | Có | — |

## 3. Response

### `200`

```json
{
  "id": 1,
  "class_session_id": 1,
  "student_id": 1,
  "status": "BOOKED",
  "attendance_marked_by": 1,
  "attendance_marked_at": "2026-09-14T06:00:00+07:00"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| class_session_id | integer | Có | — |
| student_id | integer | Có | — |
| status | `BOOKED` \| `CANCELLED_INTIME` \| `CANCELLED_LATE` \| `ATTENDED` \| `NO_SHOW` | Có | — |
| attendance_marked_by | integer \| null | Có | — |
| attendance_marked_at | string (date-time) \| null | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
HLV của lớp gửi `{"status":"ATTENDED"}` hoặc `{"status":"NO_SHOW"}` sau
giờ kết thúc. Không thay đổi số buổi. Cho sửa nhầm giữa hai trạng thái;
gửi lặp cùng trạng thái không thay đổi người/thời điểm cập nhật.

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 403 | `FORBIDDEN` | Không phải HLV của lớp hoặc tài khoản HLV chưa nối hồ sơ |
| 404 | `NOT_FOUND` | Lượt đăng ký không tồn tại |
| 409 | `SESSION_NOT_FINISHED` | Lớp chưa kết thúc |
| 409 | `SESSION_CANCELLED` | Lớp đã hủy |
| 409 | `BOOKING_NOT_ACTIVE` | Lượt đăng ký đã hủy |

Trạng thái ngoài ATTENDED/NO_SHOW hoặc trường lạ bị từ chối bằng 422.
<!-- ghi-chu:end -->
