# API: Sửa loại gói

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Sửa loại gói.
- **Method:** `PATCH`
- **Endpoint:** `/package-types/{package_type_id}`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

**Không chạm gói học viên đã mua** — những gói đó giữ snapshot riêng. Đổi
giá hôm nay mà viết lại được lịch sử hôm qua thì mọi báo cáo doanh thu đều
thành số liệu của hiện tại, không phải của kỳ đã qua.

Ngừng bán chỉ đổi `is_selling`; bản ghi không bao giờ bị xoá vì gói đã bán
còn tham chiếu tới nó.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `package_type_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

```json
{
  "name": "string",
  "price": 1.0,
  "credits": 1,
  "duration_days": 1,
  "is_selling": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| name | string \| null | Không | tối thiểu 1 ký tự; tối đa 120 ký tự |
| price | number \| string \| null | Không | ≥ 0.0; mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| credits | integer \| null | Không | > 0.0 |
| duration_days | integer \| null | Không | > 0.0 |
| is_selling | boolean \| null | Không | — |

## 3. Response

### `200`

```json
{
  "id": 1,
  "name": "string",
  "price": "string",
  "credits": 1,
  "duration_days": 1,
  "class_type": "GROUP",
  "is_selling": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| name | string | Có | — |
| price | string \| null | Có | mẫu `^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$` |
| credits | integer | Có | — |
| duration_days | integer | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| is_selling | boolean | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
