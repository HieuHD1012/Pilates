# API: Sổ buổi của **một gói của một học viên** — không phải sổ chung toàn studio

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Sổ buổi của **một gói của một học viên** — không phải sổ chung toàn studio.
- **Method:** `GET`
- **Endpoint:** `/packages/{package_id}/ledger`
- **Auth:** `Authorization: Bearer <access_token>` — mọi vai đã đăng nhập

Gói của người khác trả 404 giống hệt gói không tồn tại: hai mã khác nhau
cho hai trường hợp là một bộ đếm số gói của studio.

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `package_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

## 3. Response

### `200`

```json
{
  "student_package_id": 1,
  "entries": [
    {
      "id": 1,
      "delta": 1,
      "balance_after": 1,
      "reason_code": "PACKAGE_SOLD",
      "note": "string",
      "booking_id": 1,
      "actor_user_id": 1,
      "created_at": "2026-09-14T06:00:00+07:00"
    }
  ],
  "closing_balance": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| student_package_id | integer | Có | — |
| entries | [LedgerEntryResponse](#ledgerentryresponse)[] | Có | — |
| closing_balance | integer | Có | — |

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
Mỗi dòng có `delta` **và** `balance_after`, và response có `closing_balance`.

**Đừng để FE cộng dồn `delta`.** Màn sổ buổi tồn tại để *người đọc* cộng từ trên
xuống và ra đúng `closing_balance`. FE tự cộng là khẳng định một điều nó không
đọc được từ dữ liệu — và khi lệch, màn hình hiện con số sai một cách tự tin.
<!-- ghi-chu:end -->

## 5. Kiểu dữ liệu lồng nhau

### LedgerEntryResponse

| Field | Type | Required | Description |
|---|---|---|---|
| id | integer | Có | — |
| delta | integer | Có | — |
| balance_after | integer | Có | — |
| reason_code | `PACKAGE_SOLD` \| `PACKAGE_RENEWED` \| `BOOKING_DEDUCT` \| `CANCEL_REFUND` \| `ADMIN_ADJUST` \| `PAYMENT_VOID` | Có | — |
| note | string \| null | Có | — |
| booking_id | integer \| null | Có | — |
| actor_user_id | integer | Có | — |
| created_at | string (date-time) | Có | — |
