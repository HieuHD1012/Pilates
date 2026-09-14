# API: Gửi liên kết đặt lại qua email

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Gửi liên kết đặt lại qua email.
- **Method:** `POST`
- **Endpoint:** `/auth/forgot-password`
- **Auth:** Không cần đăng nhập

Ba tính chất phải giữ cùng lúc:

- **Thông điệp giống nhau** dù email có tồn tại hay không — phản hồi khác
  nhau chính là công cụ dò danh sách email của studio.
- **Thời gian phản hồi cũng phải giống nhau.** Gửi thư đồng bộ thì chỉ
  email tồn tại mới tốn một vòng SMTP, nên thân response giống nhau mà đồng
  hồ thì không. Vì vậy việc gửi được đẩy ra `BackgroundTasks`, chạy sau khi
  response đã trả.
- **Có giới hạn tần suất**, theo cả IP và email: đây là endpoint ẩn danh mà
  sinh được email và ghi được CSDL.

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
  "email": "hocvien@example.com"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| email | string (email) | Có | — |

## 3. Response

### `200`

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
**Luôn trả 200**, dù email có tồn tại hay không, và **không bao giờ** trả token
về — token chỉ đi qua email. Phân biệt hai trường hợp là cho người ngoài một
cách dò xem ai có tài khoản ở studio.

Bị giới hạn tần suất theo **cả IP lẫn email**, nên màn hình này phải xử lý được
429 và nói rõ cho người dùng.
<!-- ghi-chu:end -->
