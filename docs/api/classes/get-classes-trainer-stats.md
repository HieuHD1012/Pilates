# API: Số lớp của một HLV trong tháng

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Số lớp của một HLV trong tháng.
- **Method:** `GET`
- **Endpoint:** `/classes/trainer-stats`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Tính bằng **đúng hàm** mà báo cáo HLV dùng. Hai màn hình cùng nói "số lớp
của HLV này" mà chạy hai câu truy vấn khác nhau thì sớm muộn sẽ cho hai con
số, và không ai biết con số nào đúng. Biên tháng theo giờ studio; lấy theo
giờ container thì buổi 06:00 ngày 1 rơi sang tháng trước.

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
| `trainer_id` | integer | Có | — |
| `year` | integer | Có | ≥ 2020; ≤ 2100 |
| `month` | integer | Có | ≥ 1; ≤ 12 |

### Request Body

Không có.

## 3. Response

### `200`

```json
{
  "trainer_id": 1,
  "year": 1,
  "month": 1,
  "scheduled_sessions": 1,
  "cancelled_sessions": 1,
  "total_bookings": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| trainer_id | integer | Có | — |
| year | integer | Có | — |
| month | integer | Có | — |
| scheduled_sessions | integer | Có | — |
| cancelled_sessions | integer | Có | — |
| total_bookings | integer | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
