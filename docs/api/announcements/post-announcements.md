# API: Tạo thông báo

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Tạo thông báo.
- **Method:** `POST`
- **Endpoint:** `/announcements`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

`title` và `body` đi qua validator quy tắc nội dung **khi ghi**. Đây là lớp
duy nhất bắt được nội dung nhân viên nhập sau go-live — cổng CI chỉ chứng
minh lập trình viên không gõ chuỗi cấm, nó mù hoàn toàn với dòng khuyến mãi
lễ tân đăng vào tuần nghiệm thu.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

Không có.

### Query Params

Không có.

### Request Body

```json
{
  "title": "string",
  "body": "string",
  "is_published": true,
  "publish_at": "2026-09-14T06:00:00+07:00"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| title | string | Có | tối thiểu 1 ký tự; tối đa 200 ký tự |
| body | string | Có | tối thiểu 1 ký tự; tối đa 10000 ký tự |
| is_published | boolean | Không | mặc định `False` |
| publish_at | string (date-time) \| null | Không | — |

## 3. Response

### `201`

```json
{
  "id": 1,
  "title": "string",
  "body": "string",
  "is_published": true,
  "publish_at": "2026-09-14T06:00:00+07:00",
  "created_by": 1,
  "created_at": "2026-09-14T06:00:00+07:00",
  "updated_at": "2026-09-14T06:00:00+07:00",
  "updated_by": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| title | string | Có | — |
| body | string | Có | — |
| is_published | boolean | Có | — |
| publish_at | string (date-time) \| null | Có | — |
| created_by | integer | Có | — |
| created_at | string (date-time) | Có | — |
| updated_at | string (date-time) \| null | Có | — |
| updated_by | integer \| null | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
