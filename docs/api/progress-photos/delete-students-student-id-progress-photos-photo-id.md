# API: Xoá vĩnh viễn một ảnh tiến trình — **chỉ ADMIN**

> ⚙️ **Sinh tự động** từ OpenAPI của ứng dụng bằng `uv run python -m scripts.gen_api_docs`.
> Sửa tay ở ngoài khối *Ghi chú* sẽ bị ghi đè ở lần sinh sau — muốn đổi thì sửa mã nguồn rồi sinh lại.

## 1. Overview

- **Purpose:** Xoá vĩnh viễn một ảnh tiến trình — **chỉ ADMIN**.
- **Method:** `DELETE`
- **Endpoint:** `/students/{student_id}/progress-photos/{photo_id}`
- **Auth:** `Authorization: Bearer <access_token>` — vai **ADMIN**

Quyền xoá cố ý hẹp hơn quyền xem. Xem là thao tác đọc, xoá là huỷ dữ liệu
không hoàn tác: cho HLV phụ trách xoá nghĩa là họ xoá được ảnh của học viên
mình dạy, và cho học viên xoá nghĩa là bằng chứng tiến trình biến mất theo
một lần bấm nhầm.

Đáp án câu 15 của khách chỉ nói về quyền **xem**, nên đây là mặc định an
toàn và đang chờ khách xác nhận (`docs/business-rules.md`).

## 2. Request

### Headers

| Key | Required | Description |
|---|---|---|
| `Authorization` | Có | `Bearer <access_token>` |

### Path Params

| Name | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer | Có | — |
| `photo_id` | integer | Có | — |

### Query Params

Không có.

### Request Body

Không có.

## 3. Response

### `204`

Không có nội dung.

### Lỗi

Mọi lỗi nghiệp vụ dùng chung hình dạng `{ "detail": { "code": ..., "message": ... } }`; `message` đã viết sẵn tiếng Việt cho người dùng cuối. Bảng mã HTTP dùng chung nằm ở [quy ước chung](../README.md#quy-ước-lỗi).

## 4. Ghi chú

<!-- ghi-chu:start -->
_Chưa có ghi chú nghiệp vụ cho endpoint này._
<!-- ghi-chu:end -->
