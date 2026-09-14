# API: Nhận form tư vấn từ khách ẩn danh

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Nhận form tư vấn từ khách ẩn danh.
- **Method:** `POST`
- **Endpoint:** `/public/leads`
- **Auth:** Không cần đăng nhập

Ba lớp bảo vệ, vì đây là điểm duy nhất người lạ ghi được vào CSDL:

- **Rate limit theo IP** — không có thì form là công cụ bơm rác.
- **Chặn gửi trùng** cùng số điện thoại trong một cửa sổ ngắn, để một cú
  double-click không thành hai khách quan tâm.
- **Sanitize mọi trường.** `need` là văn bản tự do do người lạ nhập và sẽ
  được nhân viên mở ra đọc — đây là đường XSS lưu trữ ngắn nhất của hệ.

Luôn trả cùng một thông điệp, kể cả khi bị chặn vì trùng: khách không cần
biết số của họ đã có trong hệ thống hay chưa, và ta cũng không nên nói.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Không | `Bearer <access_token>` |
| `Content-Type` | Có | `application/json` |

### Path Params

Không có.

### Query Params

Không có.

### Request Body

```json
{
  "full_name": "string",
  "phone": "string",
  "need": "string",
  "source": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| full_name | string | Có | tối thiểu 1 ký tự; tối đa 120 ký tự |
| phone | string | Có | mẫu `^[0-9+()\s.\-]{6,32}$` |
| need | string \| null | Không | tối đa 1000 ký tự |
| source | string \| null | Không | tối đa 64 ký tự |

## 3. Response

### `201`

```json
{
  "message": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| message | string | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Endpoint duy nhất người ngoài ghi được dữ liệu vào hệ thống, nên bị **giới hạn
tần suất theo IP**. Form phải chịu được 429 và nói rõ cho khách thay vì im lặng
thất bại.
<!-- ghi-chu:end -->
