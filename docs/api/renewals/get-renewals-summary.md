# API: Bảng tổng hợp nhắc gia hạn — **chỉ đếm người, không có số liệu kinh doanh**

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Bảng tổng hợp nhắc gia hạn — **chỉ đếm người, không có số liệu kinh doanh**.
- **Method:** `GET`
- **Endpoint:** `/renewals/summary`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Màn này mở suốt ngày ở quầy lễ tân nơi khách nhìn được màn hình.

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
  "needing_contact": 1,
  "low_credits": 1,
  "expiring_soon": 1,
  "never_contacted": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| needing_contact | integer | Có | — |
| low_credits | integer | Có | — |
| expiring_soon | integer | Có | — |
| never_contacted | integer | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
