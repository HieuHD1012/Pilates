# API: Studio hủy lớp và hoàn buổi cho mọi người đã đăng ký, bất kể thời điểm

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Studio hủy lớp và hoàn buổi cho mọi người đã đăng ký, bất kể thời điểm.
- **Method:** `POST`
- **Endpoint:** `/classes/{session_id}/cancel`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

```json
{
  "reason": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| reason | string | Có | tối thiểu 3 ký tự; tối đa 500 ký tự |

## 3. Response

### `200`

```json
{
  "session_id": 1,
  "refunded_booking_ids": [
    1
  ],
  "cancelled_waitlist_ids": [
    1
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| session_id | integer | Có | — |
| refunded_booking_ids | integer[] | Có | — |
| cancelled_waitlist_ids | integer[] | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
**Bắt buộc khai lý do.** Hủy lớp hoàn buổi cho mọi người đã đăng ký và dọn sạch
dữ liệu hàng chờ lịch sử của buổi đó, gồm cả `PROMOTION_FAILED`.
`cancelled_waitlist_ids` được giữ để tương thích dữ liệu cũ; không còn API hàng chờ.
<!-- ghi-chu:end -->
