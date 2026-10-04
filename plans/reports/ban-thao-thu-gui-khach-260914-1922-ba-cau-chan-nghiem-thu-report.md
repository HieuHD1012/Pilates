# Bản thảo thư gửi khách — 3 câu chặn nghiệm thu

Ngày soạn: 2026-09-14. Trạng thái: **chưa gửi**.
Nguồn: [plan.md](../260914-0856-pilates-mvp-rebaseline/plan.md) câu hỏi mở mục 2,
[phase-01](../260914-0856-pilates-mvp-rebaseline/phase-01-f00-nen-tang-chot-nghiep-vu.md) mục 220..

Phần dưới dấu gạch là nội dung để gửi thẳng — viết cho người không làm kỹ thuật.
Phần sau đó là ghi chú nội bộ, **không gửi**.

---

Kính gửi anh/chị,

Phần lõi hệ thống Pilates đã chạy được và bọn em vừa nghiệm thu nội bộ xong.
Trước khi bắt tay vào phần giao diện, có 3 điểm bọn em đã phải tạm chọn một
phương án để đi tiếp. Cả 3 đều sửa được, nhưng càng để muộn thì càng đắt — nên
anh/chị xác nhận giúp em sớm ạ.

**1. Ảnh theo dõi tiến trình cơ thể — ai được xem, ai được xoá?**

Trong bảng phạm vi, câu 15 anh/chị trả lời là huấn luyện viên được xem ảnh tiến
trình của học viên. Bọn em cần rõ thêm hai ý:

- "Huấn luyện viên" ở đây là **mọi huấn luyện viên của studio**, hay **chỉ người
  đang dạy học viên đó**? Hiện bọn em đang để chặt hơn: chỉ người đã hoặc đang
  dạy học viên đó mới xem được.
- Câu trả lời của anh/chị mới nói về quyền **xem**. Còn quyền **xoá** ảnh thì
  sao? Hiện bọn em để **chỉ chủ studio (tài khoản quản trị)** được xoá. Lý do:
  xoá là mất hẳn, không lấy lại được — nếu cho học viên hoặc huấn luyện viên xoá
  thì một lần bấm nhầm là mất cả quá trình theo dõi.

**2. Giá gói tập có hiện công khai trên website không?**

Dòng đã xác nhận ghi là "nội dung/giá" nên bọn em chưa chắc. Hệ thống đã làm sẵn
cả hai hướng: chỗ giá của mỗi gói sẽ **hiện đúng con số studio cung cấp**, còn
gói nào studio chưa cho giá thì để trống kèm nhãn mời liên hệ. Bọn em tuyệt đối
không tự điền giá.

Nên câu hỏi thật ra là: anh/chị **có muốn công khai giá không**, và nếu có thì
cho em xin bảng giá từng gói. Không có bảng giá thì trang web sẽ ra mắt với toàn
bộ ô giá để trống.

**3. Học viên được cộng buổi tập vào lúc nào — lúc mua gói, hay lúc studio xác
nhận đã nhận được tiền?**

Đây là câu quan trọng nhất trong 3 câu.

Hiện hệ thống **cộng buổi ngay khi nhân viên tạo gói cho học viên**, chưa cần
xác nhận đã thu tiền. Nghĩa là: học viên đăng ký gói, chọn chuyển khoản, nhân
viên chưa kịp đối chiếu ngân hàng — học viên vẫn đặt được lớp ngay.

Nếu studio muốn **chỉ cộng buổi sau khi xác nhận đã nhận tiền**, anh/chị báo em
càng sớm càng tốt. Đây là phần lõi nhất của hệ thống (sổ theo dõi buổi tập của
từng học viên), sửa lúc này thì bình thường, nhưng nếu tới lúc nghiệm thu cuối
mới phát hiện thì phải làm lại nhiều và ảnh hưởng ngày bàn giao.

Em cảm ơn anh/chị ạ.

---

## Ghi chú nội bộ — không gửi

| Câu | Mặc định đang chạy | Nếu khách trả lời khác thì sửa ở đâu |
|---|---|---|
| 1 — xem ảnh | `is_assigned_trainer`: HLV đã/đang dạy ≥1 buổi học viên có đăng ký chưa huỷ (`app/core/permissions.py`) | Nới thành mọi TRAINER: sửa 1 hàm quyền, rẻ |
| 1 — xoá ảnh | Chỉ ADMIN (`app/api/progress_photos.py::delete_progress_photo`) | Nới cho HLV/học viên: sửa 1 chỗ quyền, rẻ. Siết thêm thì không còn gì để siết |
| 2 — giá công khai | `PublicPackage.price: str \| None` đã có trong allow-list (`app/schemas/public.py`); `None` = chưa có giá, phân biệt được với `"0"` | **Không phải việc code** — cần *dữ liệu giá* từ studio. Không có thì mọi ô giá ra mắt ở trạng thái trống có nhãn |
| 3 — cộng buổi | Lúc bán. `sell_package` (`app/services/package_sales.py:107`) ghi `delta = credits` ngay khi tạo gói | **Đắt.** Phải tách thời điểm ghi sổ khỏi thời điểm tạo gói, thêm trạng thái gói chờ thanh toán, sửa quy tắc chọn gói khi đặt lớp, sửa luồng huỷ thanh toán, và viết lại bộ test quanh sổ buổi |

Câu 3 **không chặn viết code** (mã đã tự chốt một phương án và chạy được), nhưng
**chặn nghiệm thu**. Rủi ro thật là im lặng: nếu không ai hỏi, nó chỉ lộ ra ở
UAT khi studio thấy học viên chưa trả tiền vẫn đặt được lớp.

Câu 1 và 2 rẻ ở cả hai hướng trả lời — gửi kèm vì cùng một lượt thư, không phải
vì gấp.
