# Gói tập & sổ buổi

Hai lớp khái niệm: **danh mục gói** (`/package-types` — studio bán những gói
nào) và **gói của học viên** (`/packages` — ai đã mua gì).

Số buổi không phải một con số nằm im. Nó là **tổng của một cuốn sổ chỉ ghi
thêm**: mỗi lần bán, gia hạn có cộng buổi, đặt lớp, hủy lớp hay điều chỉnh tay đều là một
dòng bút toán có dấu và có lý do. Không dòng nào bị sửa hay xoá.

## Quy tắc nghiệp vụ

**Buổi được cộng ngay khi bán gói, không đợi xác nhận thanh toán.** Nhân viên
đứng quầy cần học viên tập được ngay. Khoảng lệch "đã cho tập mà tiền chưa về"
nhìn thấy ở
[`GET /reports/unconfirmed-payments`](../reports/get-reports-unconfirmed-payments.md).

**Gói đang hoạt động** nghĩa là: `status = ACTIVE`, **và** hôm nay nằm trong
`[start_date, end_date]`, **và** tổng sổ buổi còn > 0. Cả ba điều kiện, theo giờ
studio.

Khi đăng ký lớp, gói còn phải có hiệu lực vào ngày học. Gói hợp lệ hôm nay
nhưng hết hạn trước ngày lớp diễn ra không dùng được; được học ngày cuối gói.

**Gói hết hạn không bị thu hồi buổi chưa dùng.** Không có loại bút toán nào làm
việc đó, và không chủ thể nào ghi được nó. Nhưng buổi đó cũng không vào
`credits_remaining` — vì gói đã hết hiệu lực.

`POST /packages/{id}/adjust` là **ADMIN** và **bắt buộc khai lý do**. Đây là cửa
duy nhất để một con số buổi thay đổi mà không có sự kiện nghiệp vụ đứng sau.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/package-types` | ADMIN, STAFF | [chi tiết](get-package-types.md) |
| `POST` | `/package-types` | ADMIN, STAFF | [chi tiết](post-package-types.md) |
| `PATCH` | `/package-types/{package_type_id}` | ADMIN, STAFF | [chi tiết](patch-package-types-package-type-id.md) |
| `GET` | `/packages` | đăng nhập | [chi tiết](get-packages.md) |
| `POST` | `/packages/sell` | ADMIN, STAFF | [chi tiết](post-packages-sell.md) |
| `POST` | `/packages/{package_id}/adjust` | ADMIN | [chi tiết](post-packages-package-id-adjust.md) |
| `GET` | `/packages/{package_id}/ledger` | đăng nhập | [chi tiết](get-packages-package-id-ledger.md) |
| `POST` | `/packages/{package_id}/renew` | ADMIN, STAFF | [chi tiết](post-packages-package-id-renew.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

`GET /packages/{id}/ledger` trả `{entries, closing_balance}`, mỗi dòng có `delta`
**và** `balance_after`. Màn sổ buổi tồn tại để người đọc cộng dồn `delta` từ trên
xuống và ra đúng `closing_balance` — **đừng để FE tự cộng**, hãy hiện đúng hai
con số server trả về. Cộng ở FE là khẳng định một điều FE không đọc được từ dữ
liệu, và khi lệch thì màn hình sẽ hiện con số sai một cách tự tin.

**Đừng để FE chọn gói khi đặt lớp.** Bỏ trống `student_package_id` thì server tự
chọn gói đang hoạt động có `end_date` sớm nhất — xem
[đăng ký lớp](../bookings/README.md).

## Gia hạn thời hạn

Gia hạn có cộng buổi tạo ledger PACKAGE_RENEWED. Gia hạn chỉ thêm ngày cập
nhật end_date hiện tại. Chủ dự án đã xác nhận **không cần lưu lịch sử ngày
hết hạn cũ/ngày mới**; không tạo bút toán buổi khi chỉ thay đổi ngày.
