# API: Lịch lớp công khai — lần chạy hai của F02, khép lại trong cửa sổ F06

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Lịch lớp công khai — lần chạy hai của F02, khép lại trong cửa sổ F06.
- **Method:** `GET`
- **Endpoint:** `/public/schedule`
- **Auth:** Không cần đăng nhập

Hiển thị các buổi **đã được xếp** là hợp lệ: đó là sự kiện có thật, khác
hẳn một lời hứa như "giờ mở cửa 7:30–19:30" mà chưa ai cung cấp.

`is_full` là **boolean**, không phải số chỗ còn lại. Số chỗ đủ để suy ra
lớp nào vắng, và "lớp 6h sáng thứ Ba chỉ có 1 người" là thông tin không nên
công khai ở một studio nhỏ — đây là chuyện an toàn thân thể, không chỉ là
quyền riêng tư.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Không | `Bearer <access_token>` |

### Path Params

Không có.

### Query Params

| Name | Type | Required | Description |
|---|---|---|---|
| `days` | integer | Không | ≥ 1; ≤ 60; mặc định `14` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "starts_at": "2026-09-14T06:00:00+07:00",
    "ends_at": "2026-09-14T06:00:00+07:00",
    "class_type": "GROUP",
    "trainer_name": "string",
    "is_full": true
  }
]
```

Mảng `[PublicClassSession](#publicclasssession)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Trả `is_full` dạng boolean, **không** trả số chỗ còn lại. Ở một studio nhỏ,
"còn 5 chỗ trống" là thông tin không nên công khai.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### PublicClassSession

| Field | Type | Required | Description |
|---|---|---|---|
| starts_at | string (date-time) | Có | — |
| ends_at | string (date-time) | Có | — |
| class_type | `GROUP` \| `PRIVATE` | Có | — |
| trainer_name | string | Có | — |
| is_full | boolean | Có | — |
