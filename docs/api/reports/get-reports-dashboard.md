# API: Bốn con số, lịch hôm nay và các lớp đã kết thúc còn chờ HLV điểm danh

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Bốn con số, lịch hôm nay và các lớp đã kết thúc còn chờ HLV điểm danh.
- **Method:** `GET`
- **Endpoint:** `/reports/dashboard`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Cố ý **không có ô doanh thu**: bảng này mở suốt ngày ở quầy lễ tân, nơi
khách đứng nhìn được màn hình. Doanh thu có màn riêng, sau một lần đăng
nhập và một lần bấm.

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
  "numbers": [
    {
      "key": "string",
      "label": "string",
      "value": 1,
      "detail_path": "string"
    }
  ],
  "sessions_needing_attention": [
    {
      "class_session_id": 1,
      "starts_at": "2026-09-14T06:00:00+07:00",
      "trainer_name": "string",
      "capacity": 1,
      "booked_count": 1,
      "status": "SCHEDULED"
    }
  ],
  "sessions_today": [
    {
      "class_session_id": 1,
      "starts_at": "2026-09-14T06:00:00+07:00",
      "trainer_name": "string",
      "capacity": 1,
      "booked_count": 1,
      "status": "SCHEDULED"
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| numbers | [DashboardNumber](#dashboardnumber)[] | Có | — |
| sessions_needing_attention | [SessionRowResponse](#sessionrowresponse)[] | Có | — |
| sessions_today | [SessionRowResponse](#sessionrowresponse)[] | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Trả `numbers[]` với `{key, label, value, detail_path}`. Render theo `label` và
`detail_path` của server; `key` chỉ dùng để chọn icon hoặc thứ tự.

**Không có ô doanh thu** — doanh thu có màn riêng.

**Đừng tự ghép `detail_path`.** Khoảng thời gian là nửa mở và tự ghép là cách
mất trọn ngày cuối kỳ.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### DashboardNumber

| Field | Type | Required | Description |
|---|---|---|---|
| key | string | Có | — |
| label | string | Có | — |
| value | integer \| null | Có | — |
| detail_path | string | Có | — |

### SessionRowResponse

| Field | Type | Required | Description |
|---|---|---|---|
| class_session_id | integer | Có | — |
| starts_at | string (date-time) | Có | — |
| trainer_name | string | Có | — |
| capacity | integer | Có | — |
| booked_count | integer | Có | — |
| status | `SCHEDULED` \| `CANCELLED` | Có | — |
