# API: File xuất **từ chính truy vấn của màn hình**, cùng bộ lọc

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** File xuất **từ chính truy vấn của màn hình**, cùng bộ lọc.
- **Method:** `GET`
- **Endpoint:** `/reports/trainers/export`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN, STAFF**

Tên HLV là văn bản do nhân viên nhập, nên vẫn đi qua bước trung hoà công
thức như mọi ô khác.

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
| `format` | string | Không | mẫu `^(csv|xlsx)$`; mặc định `csv` |

### Request Body

Không có.

## 3. Response

### `200`

Không có nội dung.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Trả `Content-Disposition: attachment` — tải bằng cách gọi kèm token rồi dựng
`blob:` URL, **không đọc thành JSON**.

Phải truyền **nguyên bộ lọc đang áp trên màn hình**, nếu không file tải về sẽ
khác với bảng người dùng đang nhìn.

Giá trị chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, tab hay xuống dòng được thêm dấu
nháy đơn ở đầu: một cái tên như `=cmd|...` trong file Excel là lệnh chạy trên
máy người mở file, không phải một ô dữ liệu.
<!-- ghi-chu:end -->
