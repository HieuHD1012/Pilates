# Báo cáo

Bốn màn: bảng tổng hợp, doanh thu, lớp & đăng ký, và HLV. Cộng một danh sách vận
hành: thanh toán quá hạn chưa xác nhận.

## Quy tắc nghiệp vụ

**Mỗi con số kèm sẵn `detail_path`** — đường dẫn mở ra đúng các dòng tạo nên nó.
Con số không giải thích được là con số không ai dám dùng để ra quyết định.

**Doanh thu chỉ gồm giao dịch `CONFIRMED`, tính theo `confirmed_at`.** Tiền chưa
về không phải doanh thu.

`GET /reports/dashboard` **không có ô doanh thu** — doanh thu có màn riêng.

`fill_rate` của một kỳ không có lớp nào là **`null`**, không phải `0`.

Kỳ mặc định là 30 ngày gần nhất tính đến hôm nay theo giờ studio.

Thống kê HLV dùng **chung một truy vấn** với
[`GET /classes/trainer-stats`](../classes/get-classes-trainer-stats.md), nên hai
màn không thể cho hai con số khác nhau.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/reports/classes` | ADMIN, STAFF | [chi tiết](get-reports-classes.md) |
| `GET` | `/reports/dashboard` | ADMIN, STAFF | [chi tiết](get-reports-dashboard.md) |
| `GET` | `/reports/revenue` | ADMIN, STAFF | [chi tiết](get-reports-revenue.md) |
| `GET` | `/reports/revenue/detail` | ADMIN, STAFF | [chi tiết](get-reports-revenue-detail.md) |
| `GET` | `/reports/trainers` | ADMIN, STAFF | [chi tiết](get-reports-trainers.md) |
| `GET` | `/reports/trainers/class-sizes` | ADMIN, STAFF | [chi tiết](get-reports-trainers-class-sizes.md) |
| `GET` | `/reports/trainers/class-sizes/export` | ADMIN, STAFF | [chi tiết](get-reports-trainers-class-sizes-export.md) |
| `GET` | `/reports/trainers/export` | ADMIN, STAFF | [chi tiết](get-reports-trainers-export.md) |
| `GET` | `/reports/unconfirmed-payments` | ADMIN, STAFF | [chi tiết](get-reports-unconfirmed-payments.md) |
<!-- muc-luc:end -->

## Xuất file

Nút xuất file **chỉ ở báo cáo HLV** (`GET /reports/trainers/export?format=csv|xlsx`),
và phải truyền nguyên bộ lọc đang áp trên màn hình.

Endpoint trả `Content-Disposition: attachment` — tải bằng cách gọi kèm token rồi
dựng `blob:` URL, không đọc thành JSON.

Giá trị chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, tab hay xuống dòng được thêm dấu
nháy đơn ở đầu. Một cái tên như `=cmd|...` trong file Excel là lệnh chạy trên
máy người mở file, không phải một ô dữ liệu.

## Chỗ dễ làm sai

**Đừng tự ghép query cho `detail_path`.** Khoảng thời gian là nửa mở, và tự ghép
là cách mất trọn ngày cuối kỳ. Dùng thẳng chuỗi server trả về.

`GET /reports/dashboard` trả `numbers[]` với `{key, label, value, detail_path}`.
Render theo `label` và `detail_path` của server; `key` chỉ dùng để chọn icon
hoặc thứ tự nếu cần.

**Ô `null` phải để trống**, đừng hiện `0`.

## Lớp cần điểm danh

`/reports/dashboard.sessions_needing_attention` là các lớp đã kết thúc còn
lượt BOOKED chưa được HLV điểm danh. Danh sách không còn nhiệm vụ xử lý hàng chờ
hay xác nhận đăng ký. Chỉ HLV được gán lớp thực hiện điểm danh.

## Số lượt đăng ký hôm nay

bookings_today có nhãn Lượt đăng ký lớp hôm nay, đếm BOOKED/ATTENDED/NO_SHOW
của lớp diễn ra hôm nay. Điểm danh không làm mất lượt. detail_path dùng
/bookings?held_only=true và cùng bộ lọc thời gian. Đây không phải số người
thực tế có mặt; danh sách còn cần điểm danh vẫn chỉ đếm BOOKED.
