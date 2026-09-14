# API: Danh sách học viên cần liên hệ

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Danh sách học viên cần liên hệ.
- **Method:** `GET`
- **Endpoint:** `/renewals`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Bộ lọc chỉ **thu hẹp** danh sách quanh ngưỡng mặc định (≤6 buổi hoặc ≤15
ngày); không có tham số nào nới rộng nó, để hai người mở cùng màn hình
không thấy hai định nghĩa "cần liên hệ" khác nhau.

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
| `max_credits` | integer \| null | Không | ≥ 0 |
| `max_days` | integer \| null | Không | ≥ 0 |
| `contacted` | boolean \| null | Không | — |
| `limit` | integer | Không | ≥ 1; ≤ 500; mặc định `200` |

### Request Body

Không có.

## 3. Response

### `200`

```json
[
  {
    "student_id": 1,
    "student_name": "string",
    "student_phone": "string",
    "student_package_id": 1,
    "package_name": "string",
    "credits_remaining": 1,
    "end_date": "2026-09-14",
    "days_remaining": 1,
    "reasons": [
      "string"
    ],
    "last_contacted_at": "2026-09-14T06:00:00+07:00",
    "last_contact_result": "string",
    "next_contact_date": "2026-09-14"
  }
]
```

Mảng `[RenewalCandidateResponse](#renewalcandidateresponse)`.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Ngưỡng là **≤ 6 buổi HOẶC ≤ 15 ngày** — quan hệ HOẶC.

Bộ lọc `max_credits` / `max_days` chỉ **thu hẹp** quanh ngưỡng mặc định, không
nới rộng: truyền `max_credits=50` không kéo thêm ai vào danh sách.

Mỗi dòng có `reasons`. **Nói lý do bằng chữ** — một con số đổi màu không cho
nhân viên biết người này sắp hết buổi hay sắp hết hạn, và đó là hai câu mở đầu
cuộc gọi khác nhau.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### RenewalCandidateResponse

| Field | Type | Required | Description |
|---|---|---|---|
| student_id | integer | Có | — |
| student_name | string | Có | — |
| student_phone | string | Có | — |
| student_package_id | integer | Có | — |
| package_name | string | Có | — |
| credits_remaining | integer | Có | — |
| end_date | string (date) | Có | — |
| days_remaining | integer | Có | — |
| reasons | string[] | Có | — |
| last_contacted_at | string (date-time) \| null | Có | — |
| last_contact_result | string \| null | Có | — |
| next_contact_date | string (date) \| null | Có | — |
