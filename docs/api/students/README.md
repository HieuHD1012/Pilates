# Học viên

Hồ sơ học viên là trung tâm của mọi thứ khác: gói tập, đăng ký lớp, thanh toán
và ảnh tiến trình đều treo vào đây.

## Quy tắc nghiệp vụ

**Số điện thoại là khoá nhận diện** và không được trùng. Nó được chuẩn hoá
trước khi so, nên hai cách gõ khác nhau của cùng một số vẫn bị chặn.

**Phạm vi truy vấn được ghim ngay trong câu SQL**, không lấy hết rồi lọc sau:
ADMIN/STAFF thấy mọi học viên, STUDENT chỉ thấy chính mình, TRAINER không đi
qua danh sách này. Hệ quả là id của người khác trả **404**, giống hệt id không
tồn tại — cố ý, vì hai mã khác nhau là một bộ đếm số học viên của studio.

`GET /students/{id}/overview` trả `{student, credits_remaining, active_packages,
needs_renewal}` — đủ cho phần đầu màn chi tiết trong **một** request.

`credits_remaining` **chỉ tính gói đang hoạt động**. Gói hết hạn còn buổi chưa
dùng không bị thu hồi, nhưng cũng không vào con số này.

## Endpoint

<!-- muc-luc:start -->
| Method | Đường dẫn | Quyền |  |
|---|---|---|---|
| `GET` | `/students` | đăng nhập | [chi tiết](get-students.md) |
| `POST` | `/students` | ADMIN, STAFF | [chi tiết](post-students.md) |
| `GET` | `/students/{student_id}` | đăng nhập | [chi tiết](get-students-student-id.md) |
| `PATCH` | `/students/{student_id}` | ADMIN, STAFF | [chi tiết](patch-students-student-id.md) |
| `GET` | `/students/{student_id}/overview` | đăng nhập | [chi tiết](get-students-student-id-overview.md) |
<!-- muc-luc:end -->

## Màn chi tiết học viên gọi những gì

| Tab | Endpoint |
|---|---|
| Phần đầu | `GET /students/{id}/overview` |
| Gói tập | [`GET /packages?student_id=`](../packages/get-packages.md) |
| Sổ buổi | [`GET /packages/{id}/ledger`](../packages/get-packages-package-id-ledger.md) |
| Lịch sử lớp | [`GET /my-schedule?student_id=&include_cancelled=true`](../my-schedule/get-my-schedule.md) |
| Ảnh tiến trình | [nhóm riêng](../progress-photos/README.md) |
