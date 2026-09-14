# API: Doanh thu của một kỳ

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Doanh thu của một kỳ.
- **Method:** `GET`
- **Endpoint:** `/reports/revenue`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Chỉ gồm giao dịch `CONFIRMED` và tính theo `confirmed_at`. Kèm `detail_path`
mở ra đúng các dòng tạo nên con số — dùng thẳng chuỗi đó, đừng tự ghép.

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
| `period_start` | string (date) \| null | Không | — |
| `period_end` | string (date) \| null | Không | — |

### Request Body

Không có.

## 3. Response

### `200`

```json
{
  "period_start": "2026-09-14",
  "period_end": "2026-09-14",
  "total": "string",
  "payment_count": 1,
  "by_method": [
    {
      "method": "CASH",
      "total": "string",
      "payment_count": 1
    }
  ],
  "detail_path": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| period_start | string (date) | Có | — |
| period_end | string (date) | Có | — |
| total | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| payment_count | integer | Có | — |
| by_method | [RevenueByMethodResponse](#revenuebymethodresponse)[] | Có | — |
| detail_path | string | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### RevenueByMethodResponse

| Field | Type | Required | Description |
|---|---|---|---|
| method | `CASH` \| `TRANSFER` | Có | — |
| total | string | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| payment_count | integer | Có | — |
