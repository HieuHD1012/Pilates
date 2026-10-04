# Đối chiếu tài liệu nguồn với nghiệp vụ hiện tại

Ngày review: 2026-09-14. Đã đọc toàn bộ 2 sheet của
[phạm vi xác nhận](nguon/pham-vi-xac-nhan.xlsx) và 4 sheet của
[kế hoạch MVP nội bộ](nguon/ke-hoach-mvp-noi-bo-2026.xlsm).
Đối chiếu trọng tâm phần đã thay đổi: cấp tài khoản học viên, đăng ký/hủy/đổi,
hạn gói, bỏ hàng chờ, điểm danh và báo cáo liên quan. Đây không phải nghiệm thu
mọi màn hình của 51 chức năng; `src_FE` hiện chưa có mã.

## 1. Nguồn nào được ưu tiên?

1. Xác nhận mới của chủ dự án trong phiên làm việc ngày 2026-09-14.
2. Đáp án trong sheet **Phạm vi xác nhận** của `.xlsx`.
3. Danh sách chức năng trong sheet **Chức năng** của `.xlsx`.
4. Kế hoạch/giả định nội bộ trong `.xlsm`.

Hai workbook trong `docs/nguon` được giữ nguyên làm nguồn lịch sử.
`business-rules.md` và tài liệu API mô tả nghiệp vụ đang áp dụng.
Các khác biệt đã được xác nhận bên dưới là thay đổi phạm vi có chủ đích;
không khôi phục hàng chờ hoặc đặt hộ chỉ vì workbook cũ còn ghi chúng.

## 2. Những phần khớp nguồn

| Nội dung | Nguồn cụ thể trong .xlsx | Hiện tại |
|---|---|---|
| Đăng nhập bằng tài khoản được cấp | Chức năng!B18:E18 | Admin cấp STUDENT gắn student_id; không có tự đăng ký tài khoản |
| Kiểm hạn, số buổi và chỗ khi đăng ký | Chức năng!B56:E56 | Kiểm ở backend, gói thuộc chính học viên; thất bại không trừ buổi |
| Trừ ngay khi đăng ký, hủy đúng hạn hoàn lại | Phạm vi xác nhận!B14:C14 | BOOKING_DEDUCT -1; CANCEL_REFUND +1 vào đúng gói cũ |
| Group 4h, Private 1h | Phạm vi xác nhận!B12:C12 | Đúng mốc vẫn được hủy; tính theo giờ Việt Nam |
| Duo là Private 2 khách; một HLV mỗi lớp | Phạm vi xác nhận!B9:C10 | PRIVATE capacity=2, trainer_id đơn |
| Admin trả buổi cho ca đặc biệt | Phạm vi xác nhận!C14 | ADMIN_ADJUST, bắt buộc lý do, lưu người thực hiện |
| Lịch và thao tác theo trạng thái/thời gian | Chức năng!B57:E57 | Lịch trả can_cancel, cancel_deadline và kết quả điểm danh |
| Danh sách lớp và danh sách học viên của HLV | Chức năng!B41:E41, B52:E52 | HLV xem lớp mình dạy và roster điểm danh có tên học viên |
| Sổ buổi và người/thời điểm thực hiện | Chức năng!B46:E47 | Ledger append-only và kiểm đối soát khi commit |

Các quy tắc tiền mặt/chuyển khoản, nhắc gia hạn 6 buổi hoặc 15 ngày,
không tự gửi Zalo/WhatsApp, một cơ sở và chưa có mobile app vẫn giữ nguyên.
Nguồn tương ứng: Phạm vi xác nhận!B7:C8, B15:C17.

## 3. Những phần khác nguồn do xác nhận mới

| Nội dung | Nguồn cũ | Xác nhận 2026-09-14 và triển khai |
|---|---|---|
| Đặt/hủy/đổi hộ | Chức năng!B61:E61; Phạm vi xác nhận!B11:C11; .xlsm Chi tiết màn hình!B51:I51 | Chỉ STUDENT thao tác cho mình; ADMIN/STAFF/TRAINER bị từ chối |
| Hàng chờ | Chức năng!B59:E60; Phạm vi xác nhận!B13:C13; .xlsm Chi tiết màn hình!B49:I50 | Bỏ API/service hàng chờ. Lớp đầy trả SESSION_FULL; không trừ buổi, không giữ lượt |
| Hủy muộn không hoàn | Chức năng!D58:E58; .xlsm Chi tiết màn hình!E48:I48 | Sau hạn khóa hủy và đổi, trả CANCELLATION_CLOSED, giữ booking và số buổi |
| Hạn gói tại ngày học | Chức năng!E56 yêu cầu kiểm hạn nhưng không nêu ngày tham chiếu | Kiểm hiệu lực cả hôm nay và ngày starts_at theo Asia/Ho_Chi_Minh; được học ngày cuối gói |
| Điểm danh thủ công sau lớp | Không có hạng mục riêng trong 51 chức năng hoặc 58 hạng mục | HLV được gán lớp cập nhật ATTENDED/NO_SHOW sau ends_at; không thay đổi số buổi |
| Xác nhận đăng ký | Nguồn có nhân viên xác nhận khi chuyển từ hàng chờ, không yêu cầu duyệt mọi booking | Học viên đăng ký thành công là BOOKED ngay; bỏ bước xác nhận chuyển người chờ cùng tính năng hàng chờ |

Studio hủy lớp chưa có điểm danh thì hoàn các lượt BOOKED. Chốt tiếp của chủ
dự án: không có dời lịch/ân hạn, không cần lịch sử ngày gia hạn và bổ sung
tự sửa hồ sơ. Điểm danh thủ công không phải QR check-in.

## 4. Kết quả xử lý sau xác nhận mới

| Finding lúc review | Xử lý hiện tại |
|---|---|
| R1: Dashboard giảm lượt sau điểm danh | Đã sửa: BOOKED/ATTENDED/NO_SHOW; nhãn Lượt đăng ký lớp hôm nay; detail_path held_only=true |
| R2: Dời lớp qua ngày hết hạn gói | Đã đóng: bỏ API/service dời lịch, không có ân hạn; hủy cũ, tạo mới và học viên tự đăng ký |
| R3: Không có lịch sử ngày gia hạn | Đã đóng theo xác nhận: không cần lưu ngày cũ/ngày mới. Ledger cộng buổi vẫn lưu actor/thời điểm |
| R4: Không tự sửa hồ sơ | Đã thêm PATCH /auth/me; tên/phone đồng bộ hồ sơ học viên/HLV, không đổi email đăng nhập/vai/liên kết |

R1 đã từng được tái hiện dashboard 1 → 0 sau ATTENDED; hiện giữ 1 và link
chi tiết trả đúng lượt đã điểm danh. Số này là số đăng ký, không phải số người
có mặt. Danh sách cần điểm danh vẫn lọc riêng BOOKED ở lớp đã kết thúc.

R2 không còn cần quyết định xử lý dời qua hạn gói vì thao tác dời đã bị loại.
R3 không còn là thiếu sót trong phạm vi hiện tại. R4 áp dụng cho mọi vai,
bao gồm STUDENT và STAFF; phone học viên không được trống hoặc trùng.

## 5. Tài liệu đã sửa trong lượt review này

- `docs/api/README.md`: bỏ hướng dẫn không được ẩn nút hủy sau hạn; thống nhất
  khóa hủy/đổi khi can_cancel=false và không cho đặt hộ.
- `docs/README.md`: sửa số endpoint còn sót từ 91 thành 88; ghi thứ tự ưu tiên
  nguồn và dẫn đến bảng đối chiếu này.
- `docs/business-rules.md`: xác nhận workbook là baseline, các quyết định mới
  của chủ dự án được ưu tiên; không tuyên bố .xlsx luôn thắng xác nhận mới.
- `plans/.../plan.md`: chính sách làm đủ 58 hạng mục không cắt đã được cập nhật
  để ghi nhận cắt hàng chờ/đặt hộ đã được xác nhận. 58/527h là baseline,
  chưa phải số lượng hoặc ngân sách đã ước lượng lại cho phạm vi mới.
- Hướng dẫn F01 và auth: phân biệt API quản trị tài khoản với hồ sơ cá nhân;
  API tự sửa hồ sơ đã triển khai. Nhóm packages bổ sung hạn ngày học và
  chính sách không cần lịch sử ngày gia hạn.
- Phase F06: thao tác waitlist chỉ là dọn dữ liệu lịch sử, không phải tính năng
  hàng chờ còn triển khai.

Tài liệu API chi tiết, các README theo nhóm, hướng dẫn FE, quy tắc nghiệp vụ,
phase F01/F07 và báo cáo QA đã cập nhật trong lượt triển khai trước.
Các báo cáo review cũ trong plans/reports giữ nội dung lịch sử; không dùng
các kết luận về waitlist/đặt hộ trong đó làm hợp đồng nghiệp vụ hiện tại.
Brief thiết kế giữ số liệu baseline; chưa phải cam kết effort cho phạm vi mới.

## 6. Các quyết định chưa có xác nhận đầy đủ trong nguồn

- Nguồn ghi studio/nhân viên quản lý tài khoản và điều chỉnh buổi
  (Chức năng!B20:E20, B47:E47), nhưng backend chỉ ADMIN. Nhân viên quản trị
  có thể là ADMIN; nguồn chưa ánh xạ rõ sang vai STAFF. Cấp tài khoản học viên
  bởi admin và trả buổi ca đặc biệt bởi admin đã khớp xác nhận hiện tại.
- Quyền xem ảnh theo đáp án Phạm vi xác nhận!C21 loại STAFF. Giới hạn HLV
  phụ trách và chỉ ADMIN được xóa là quy tắc bổ sung; chưa được nguồn chốt rõ.
- Không thu hồi buổi hết hạn, từ chối VOID gói đã dùng,
  và cho HLV sửa nhầm điểm danh là các quy tắc vận hành bổ sung. Không coi mọi
  chi tiết trong đó là đáp án đã có trong workbook.

Danh sách mặc định và nơi triển khai được ghi trong
[business-rules.md](business-rules.md#đang-chờ-khách-xác-nhận).

## 7. Bằng chứng và giới hạn

Lượt triển khai hiện tại: 522 test passed; bộ 51 test thời gian/đăng ký/điểm danh
passed dưới cả UTC và Asia/Ho_Chi_Minh. Những số này là regression đã ghi ở
[báo cáo QA](../plans/reports/qa-api-e2e-260914-1408-full-studio-scenario-report.md),
không chứng minh mọi yêu cầu trong workbook đã hoàn thành.

Lượt review nguồn trước dùng 3 probe DB test để tái hiện R1–R3 và đọc router
cho R4. Sau xác nhận mới, R1/R4 đã sửa và R2/R3 đã đóng theo phạm vi hiện tại.
Test regression bổ sung kiểm dashboard/detail sau ATTENDED/NO_SHOW, quyền và
đồng bộ hồ sơ cá nhân, số điện thoại trùng, API dời lịch trả 404 và cờ ân hạn
lịch sử không mở lại hủy sau hạn.

Kết quả kiểm chứng mới nhất xem báo cáo QA liên kết ở trên. Chưa có giao diện,
kiểm trình duyệt/responsive, UAT hoặc chạy PROD; đây vẫn là các phần nghiệm thu
độc lập với API test.
