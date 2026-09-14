# Thanh toán

Giao dịch thu tiền, tách khỏi việc cộng buổi. Vòng đời: `PENDING` →
`CONFIRMED`, hoặc `PENDING` → `VOID`.

## Quy tắc nghiệp vụ

**Buổi đã được cộng từ lúc bán gói**, nên xác nhận thanh toán không chạm vào số
buổi. Nó chỉ ghi nhận tiền đã về và đóng dấu `confirmed_at`.

**Doanh thu tính theo `confirmed_at`**, không theo ngày tạo giao dịch — xem
[báo cáo](../reports/README.md).

`POST /payments/{id}/void` **từ chối** khi:

- gói đã tiêu buổi, hoặc
- gói còn buổi đến từ nguồn khác lần bán đó (gia hạn, điều chỉnh tay)

Lý do: bút toán trong sổ không mang `payment_id`, nên hệ thống không phân biệt
được buổi nào thuộc lần thu nào. Thu hồi mù sẽ lấy nhầm buổi của lần gia hạn.
Đây là **mặc định an toàn** cho một câu hỏi còn nợ khách; nới lỏng nó cần đổi
schema.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/payments` | ADMIN, STAFF | [chi tiết](get-payments.md) |
| `POST` | `/payments` | ADMIN, STAFF | [chi tiết](post-payments.md) |
| `GET` | `/payments/{payment_id}` | ADMIN, STAFF | [chi tiết](get-payments-payment-id.md) |
| `POST` | `/payments/{payment_id}/confirm` | ADMIN, STAFF | [chi tiết](post-payments-payment-id-confirm.md) |
| `POST` | `/payments/{payment_id}/void` | ADMIN, STAFF | [chi tiết](post-payments-payment-id-void.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

Khi `void` bị từ chối, **hiện `message` nguyên văn** — nó nói rõ vướng cái gì.
Một câu "không thể huỷ giao dịch" chung chung buộc nhân viên gọi điện hỏi.
