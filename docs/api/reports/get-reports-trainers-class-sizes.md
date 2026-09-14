# API: Số lớp theo sĩ số của từng HLV trong kỳ

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Số lớp theo sĩ số của từng HLV trong kỳ.
- **Method:** `GET`
- **Endpoint:** `/reports/trainers/class-sizes`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Bảng này trả lời "HLV dạy bao nhiêu lớp mỗi cỡ", còn `/reports/trainers`
trả lời "HLV dạy bao nhiêu lớp và bao nhiêu lượt học".

Sĩ số đếm theo ghế đã giữ, **cùng bộ trạng thái** mà báo cáo HLV dùng, nên
tổng dòng ở đây bằng đúng `scheduled_sessions` bên đó. Lớp không ai đăng ký
nằm ở cột riêng: nó vẫn là một buổi đã xếp lịch, chỉ là không diễn ra.

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
[
  {
    "trainer_id": 1,
    "trainer_name": "string",
    "size_1": 1,
    "size_2": 1,
    "size_3": 1,
    "size_4": 1,
    "size_5": 1,
    "sessions_over_max": 1,
    "sessions_empty": 1,
    "total_sessions": 1
  }
]
```

Mảng `[TrainerClassSizeResponse](#trainerclasssizeresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### TrainerClassSizeResponse

| Field | Type | Required | Description |
|---|---|---|---|
| trainer_id | integer | Có | — |
| trainer_name | string | Có | — |
| size_1 | integer | Có | — |
| size_2 | integer | Có | — |
| size_3 | integer | Có | — |
| size_4 | integer | Có | — |
| size_5 | integer | Có | — |
| sessions_over_max | integer | Có | — |
| sessions_empty | integer | Có | — |
| total_sessions | integer | Có | — |
