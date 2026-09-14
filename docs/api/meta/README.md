# Hạ tầng

Endpoint không thuộc nghiệp vụ nào, dùng cho vận hành.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/health` | công khai | [chi tiết](get-health.md) |
<!-- muc-luc:end -->

`GET /health` không chạm cơ sở dữ liệu — nó trả lời câu hỏi "tiến trình còn
sống không", không phải "hệ thống còn phục vụ được không". Dùng nó cho health
check của container; đừng dùng nó làm bằng chứng rằng CSDL còn kết nối.
