# Trang công khai

Nhóm duy nhất **không cần đăng nhập**. Đây là bề mặt marketing của studio, và
response đã được rút gọn theo allow-list ở phía server chứ không phải ở FE.

## Quy tắc nghiệp vụ

Mỗi endpoint công khai trả một hình chiếu hẹp của dữ liệu nội bộ:

- `/public/schedule` trả `is_full` dạng boolean, **không** trả số chỗ còn lại.
  Ở một studio nhỏ, "còn 5 chỗ trống" là thông tin không nên công khai.
- `/public/trainers` **không** có số điện thoại HLV.
- `/public/packages` có `price` kiểu `string | null`. `null` nghĩa là studio
  chưa công bố giá.
- Ảnh HLV phục vụ qua `/public/trainer-photos/{prefix}/{key}` với khoá ngẫu
  nhiên, không phải theo id đoán được.

`POST /public/leads` bị **giới hạn tần suất theo IP** — đây là endpoint duy nhất
người ngoài ghi được dữ liệu vào hệ thống.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/public/announcements` | công khai | [chi tiết](get-public-announcements.md) |
| `POST` | `/public/leads` | công khai | [chi tiết](post-public-leads.md) |
| `GET` | `/public/packages` | công khai | [chi tiết](get-public-packages.md) |
| `GET` | `/public/schedule` | công khai | [chi tiết](get-public-schedule.md) |
| `GET` | `/public/trainer-photos/{prefix}/{key}` | công khai | [chi tiết](get-public-trainer-photos-prefix-key.md) |
| `GET` | `/public/trainers` | công khai | [chi tiết](get-public-trainers.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

**`price` bằng `null` phải hiện nhãn trạng thái rỗng, không phải `0đ`.**

**Form tư vấn phải chịu được 429** và nói rõ cho khách, không im lặng thất bại.

> ⚠️ **Trước khi render `announcement.body` bằng `innerHTML`**: nội dung đã được
> lọc qua whitelist HTML ở server, nhưng nếu FE dùng `innerHTML` thì whitelist
> đó là **rào chắn XSS duy nhất**. Render dạng text thì an toàn tuyệt đối. Đây
> là một câu hỏi còn nợ ở [`business-rules.md`](../../business-rules.md) — chốt
> trước khi viết màn này.
