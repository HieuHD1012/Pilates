# Ảnh tiến trình

**Đây là ảnh cơ thể của người thật.** Quyền trên nhóm này hẹp hơn mọi thứ khác
trong hệ thống, và cách phục vụ ảnh cũng khác.

## Quy tắc nghiệp vụ

Xem được: **ADMIN**, **HLV đang phụ trách** học viên đó, và **chính học viên
đó**. **STAFF bị từ chối** — đáp án của khách không có STAFF, và đây không phải
dữ liệu vận hành.

"HLV phụ trách" hiện đang định nghĩa là HLV đã hoặc đang dạy ít nhất một buổi mà
học viên có đăng ký chưa hủy. Hệ thống không có bảng phân công riêng. Đây là
**mặc định an toàn** cho một câu hỏi còn nợ khách.

**Xoá ảnh: chỉ ADMIN.**

Ảnh **không** phục vụ qua URL tĩnh. Mỗi lần xem đều gọi
`GET /students/{id}/progress-photos/{photo_id}/file` kèm token và bị kiểm quyền
lại. Ảnh được giải mã rồi mã hoá lại khi tải lên nên metadata EXIF — gồm toạ độ
GPS — rơi ra hết, và được lưu dưới khoá ngẫu nhiên.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/students/{student_id}/progress-photos` | đăng nhập | [chi tiết](get-students-student-id-progress-photos.md) |
| `POST` | `/students/{student_id}/progress-photos` | đăng nhập | [chi tiết](post-students-student-id-progress-photos.md) |
| `DELETE` | `/students/{student_id}/progress-photos/{photo_id}` | ADMIN | [chi tiết](delete-students-student-id-progress-photos-photo-id.md) |
| `GET` | `/students/{student_id}/progress-photos/{photo_id}/file` | đăng nhập | [chi tiết](get-students-student-id-progress-photos-photo-id-file.md) |
<!-- muc-luc:end -->

## Chỗ dễ làm sai

**FE phải ẩn hẳn tab này với STAFF**, đừng để nó hiện rồi nhận 403. Một tab hiện
ra và báo lỗi vẫn nói cho người dùng biết rằng có ảnh ở đó.

Đừng cache URL ảnh vào `<img src>` không kèm token — endpoint cần header
`Authorization`, nên phải tải qua `fetch` rồi dựng `blob:` URL.
