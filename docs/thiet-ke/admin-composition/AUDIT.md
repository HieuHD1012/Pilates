# Audit và thiết kế lại đăng nhập / quản lý studio

Ngày: 03/10/2026. Nhánh: `codex/admin-composition`.

Worktree riêng: `C:/Users/ASUS-PRO/.codex/worktrees/admin-design-audit/Pilates`.
Điểm xuất phát: snapshot `d4dd038` của phần audit đang dở. Checkout nơi Claude làm việc được giữ nguyên. Đây là một version độc lập để review.

## 1. Hướng thiết kế và nguyên nhân gốc

Ngôn ngữ giữ lại: nền be, giấy sáng, nâu ấm, điểm nhấn đồng; Newsreader cho tiêu đề và số, Be Vietnam Pro cho nội dung tiếng Việt. Khu vận hành cần đọc nhanh và thao tác chắc chắn. Cảm giác cao cấp phải đến từ nhóm thông tin rõ, kiểu chữ đọc được, bố cục nhất quán và tương tác đáng tin.

Ảnh trước cho thấy năm vấn đề:

1. Nội dung dàn trên cùng một mặt phẳng, nhiều đường kẻ nhưng thiếu ranh giới nhiệm vụ. Có màn vừa trống vừa khó tìm việc cần làm.
2. Tiêu đề, số liệu, bộ lọc và dữ liệu tranh thứ tự đọc; thao tác chuyển tuần trộn với tạo lớp.
3. Hồ sơ bị giới hạn ở một cột hẹp dù có đủ chiều rộng để phân biệt thông tin cá nhân với gói tập.
4. Danh sách gia hạn lặp một form ở mỗi hàng; tài khoản lặp nhiều nút lớn, làm thao tác lấn át người cần quản lý.
5. Trang sổ buổi mở ra một hướng dẫn đi sang trang khác; người dùng chưa bắt đầu được việc ngay tại đó.

Cách xử lý có thay đổi cấu trúc: dashboard hai vùng công việc; hồ sơ theo nhóm; tư vấn tách thông tin nhận được khỏi form kết quả; gia hạn mở form theo người; sổ buổi có picker; lịch có chế độ danh sách theo ngày. Khung giấy và khoảng cách phục vụ các cấu trúc này.

### Composition map

```text
Đăng nhập
├─ Khung thương hiệu (gọn trên điện thoại)
└─ Khung form: mục đích → email → mật khẩu + hiện/ẩn → đăng nhập → hỗ trợ

Admin
├─ Rail: nhóm nhiệm vụ → trạng thái đang chọn → đường về website
├─ Thanh ngữ cảnh: trang hiện tại → tài khoản / đăng xuất
└─ Trang
   ├─ Tiêu đề + một câu định hướng + thao tác chính
   ├─ Số liệu có nhãn / đơn vị / phạm vi
   └─ Nhóm công việc
      ├─ Bộ lọc của nhóm
      ├─ Dữ liệu / hồ sơ
      └─ Thao tác / kết quả / bước kế tiếp
```

Không thêm ảnh trang trí, số liệu kinh doanh giả, testimonial, chart không có dữ liệu, đăng nhập mạng xã hội hoặc tìm kiếm toàn hệ thống chưa được API hỗ trợ. Nhận diện hiện vẫn dùng tên được codebase cung cấp; không tự xác nhận tên chi nhánh mới.

## 2. Audit từng màn và cụm

| Màn hình | Ý nghĩa và thứ tự scan | Lỗi / quyết định thiết kế lại | Điều phải kiểm tra |
|---|---|---|---|
| Đăng nhập | Người đã có tài khoản: email → mật khẩu → gửi; người mới có lối tư vấn | Chia khung thương hiệu và form; tiêu đề vừa phải, hỗ trợ ở cuối; có hiện/ẩn mật khẩu | Autofill, paste, lỗi trường, lỗi đăng nhập, điều hướng theo role |
| Quên mật khẩu | Email → gửi hướng dẫn → xác nhận trung tính | Cùng khung auth; kết quả không tiết lộ email có tồn tại | Email sai / gửi / quay lại đăng nhập |
| Đặt lại mật khẩu | Liên kết hợp lệ → hai mật khẩu → gửi; liên kết hỏng → yêu cầu mới | Cùng khung auth; sửa hướng dẫn 8 thành 10 ký tự theo validator frontend và backend; giữ hai trạng thái khác nhau | Không có token, mật khẩu ngắn / không khớp, thành công |
| Tổng quan | Số đo hôm nay → lịch hôm nay → việc chờ điểm danh | KPI có đơn vị và đích đến; lịch và chờ điểm danh ở hai panel; mobile KPI hai cột | Unknown khác 0; lớp theo giờ; số liệu không giả doanh thu |
| Lịch & lớp học | Chọn tuần / lọc → nhóm ngày → chọn lớp; tạo lớp là việc riêng | Tách tạo lớp khỏi bước tuần; desktop nhóm theo ngày / grid giờ tùy chọn; điện thoại và tablet chọn một ngày trong tuần, không phải cuộn qua bảy danh sách; form và preview định kỳ giữ nguyên | Không mất bộ lọc, đổi ngày giữ tuần, ngày chọn có aria-pressed, cuộn grid bằng bàn phím, tên HLV |
| Chi tiết lớp | Giờ / HLV / sức chứa / trạng thái → danh sách người → sửa hoặc hủy | Summary nhãn trên giá trị; roster trong panel; trạng thái giữ gần học viên; câu hậu quả hủy rõ | Hủy cần lý do; hoàn buổi do backend quyết định; nhân viên không đặt hộ |
| Khách quan tâm | Lọc trạng thái → người / số / nhu cầu → mở hồ sơ | Bộ lọc ngắn thành nhóm nút; bảng desktop và record mobile trong cùng panel | Không che lựa chọn, giữ nhu cầu, kết quả rỗng / lỗi |
| Chi tiết khách | Danh tính / gọi → nhu cầu nhận được → kết quả liên hệ → chuyển thành học viên | Hai panel read/edit; converted giữ hồ sơ học viên, không cho form hồi trạng thái | Save, chuyển hồ sơ, không phải nhập lại tên / số |
| Học viên | Tìm / trạng thái → người / liên lạc / trạng thái → hồ sơ | Panel lọc + danh sách; email dài được xuống dòng; thao tác tạo ở header | Tên dài, search, filter, tạo / số trùng / lỗi |
| Hồ sơ học viên | Người → tab → cá nhân / tình trạng gói → lịch sử liên hệ | Hai nhóm song song desktop, stack mobile; từng tab thương mại / lịch sử có vùng riêng | Gói, thanh toán, history, ảnh; STAFF không thấy ảnh |
| Huấn luyện viên | Người → chuyên môn / trạng thái dạy / công khai → hồ sơ | Roster là nội dung prose có panel, không ép thành bảng nhiều cột | Chưa có bio khác hồ sơ thật; tên không cắt; không gắn ảnh AI cho HLV |
| Hồ sơ HLV | Danh tính → hồ sơ → số liệu tháng → báo cáo so sánh | Dữ kiện trong panel; metric tháng có vùng riêng; bớt chiều rộng đọc vô ích | Unknown / chưa có ảnh, khoảng thời gian có nghĩa |
| Gói tập admin | Điều khoản gói → buổi / hạn / giá / hình thức / trạng thái → bán/ngừng | Bảng điều khoản desktop; record mobile; action chỉ áp dụng gói đó; note hậu quả giữ lại | Giá null khác miễn phí; gói đã mua không đổi theo catalogue |
| Thanh toán | Phạm vi / tổng đang hiện → lọc → giao dịch / số tiền / trạng thái → xử lý | Summary theo cụm; trạng thái chọn trực tiếp; receipt mobile không ép 6 cột | Tổng chỉ confirmed; confirm / void; chưa chọn học viên không bịa tên gói |
| Sổ buổi | Chọn người → chọn gói → danh tính gói / số dư → bút toán → điều chỉnh | Picker tại trang thay dead end; sổ riêng có panel; thay đổi và số dư kề nhau để đối chiếu | Không mặc định gói ngẫu nhiên; thứ tự cũ trước; validate điều chỉnh |
| Gia hạn | Người cần gọi → gói / lý do / số dư / hạn → lịch sử gọi → ghi nhận | Bỏ form lặp; mở dialog theo người; hẹn lại vẫn hiện trong record | Lưu append-only, giữ hẹn cũ, bỏ trống nghĩa không hẹn |
| Chọn báo cáo | Câu hỏi cần trả lời → chọn báo cáo | Nhóm đích đến có tên + giải thích; giữ câu hỏi, không chỉ dùng icon | Ba đường dẫn thật, tới đúng báo cáo |
| Báo cáo doanh thu | Khoảng ngày → tổng / số giao dịch → theo phương thức → chi tiết | Toolbar liên hệ dữ liệu; summary và method groups; mobile đọc receipt | Ngày invalid, confirmed_at, số tiền / % / đơn vị, lỗi một query |
| Báo cáo lớp | Khoảng ngày → số lớp / đăng ký / sức chứa / fill → matrix sĩ số | Nhóm metric; matrix giữ bảng, cột HLV cố định và region có bàn phím | Fill null khác 0, “1 học viên” không nhập nhằng, cuộn đúng bảng |
| Báo cáo HLV | Khoảng ngày → người → lớp đã xếp / đã hủy / lượt → export | Bảng desktop, record mobile; label trên số; export giữ phạm vi chọn | Không gọi đó là lớp đã dạy; CSV / Excel; số đếm rõ |
| Tài khoản | Người / role / khả năng truy cập → thao tác theo người → hậu quả | Desktop và mobile cùng RowActions; secondary vào overflow; lời mời hiện khi cần | Role gate, tên thao tác, khóa/mở, dialog, trạng thái chỉ sau phản hồi |

`/studio` chỉ redirect, không là màn riêng. Ba role app khác vẫn được kiểm tra qua luồng hồi quy dùng chung; không tuyên bố đã redesign toàn bộ ứng dụng học viên / HLV trong version này.

## 3. Audit các element dùng chung

- **Navigation:** nhóm theo công việc, chữ và icon đi cùng; active có nền lẫn chữ, không chỉ màu; đường sâu giữ active đúng nhóm. Mobile menu có tên, trap focus, Escape và đóng sau chọn.
- **Page header:** chủ thể là tên trang / người; action được wrap, không ép cạnh tiêu đề; summary độc lập đặt nhãn trên giá trị, ghi rõ đơn vị và phạm vi.
- **Panel:** có nhiệm vụ rõ; border không thay cho heading; không gom những endpoint độc lập thành một con số giả. Không thêm panel chỉ để “trang trí”.
- **Filter:** nằm ngay trên dữ liệu nó lọc; nút có aria-pressed; các lựa chọn được xuống dòng trên điện thoại. Search có label thật; không dùng placeholder làm label.
- **Table:** tên cột, numeric alignment và caption giữ nguyên nghĩa; table rộng cuộn trong region có focus; mobile record dùng cho dữ kiện theo người, không áp đặt vertical cho matrix so sánh.
- **Status:** chữ bắt buộc, màu hỗ trợ; trạng thái ở trong cùng record với đối tượng. Không dùng badge như control giả.
- **Form:** label / hint / lỗi cùng trường; required được đánh dấu; pending giữ tên hành động; dialog có tên, close ≥44px; form dài có vùng cuộn.
- **Money / sessions:** currency và đơn vị đầy đủ; không render null thành 0; đối chiếu số dư dùng dữ kiện server. Summary của trang payment không tự nhận là doanh thu chính thức.
- **Long content:** không truncate tên Việt, email record được wrap; summary và actions không đẩy ngang viewport. Đã có case tạo hồ sơ tên / email dài để kiểm tra trên browser.
- **Empty / error:** có chủ thể và lối tiếp tục; không có lớp hôm nay khác chưa tải được; ledger chưa chọn khác ledger không tìm thấy; liên kết mật khẩu hỏng khác mật khẩu sai.

## 4. Workflow kiểm từng màn

1. Xác định người dùng và việc họ muốn hoàn tất. Viết một câu: “Tôi ở trang này để…”.
2. Liệt kê cụm: chủ thể, thuộc tính, trạng thái, thao tác, hậu quả. Bỏ dữ kiện không có nguồn; đánh dấu thiếu thật.
3. Vẽ thứ tự đọc không có màu hoặc ảnh. Dữ kiện cần kết hợp phải gần nhau; số cần so sánh phải có alignment chung.
4. Chọn bố cục theo nhiệm vụ: table cho cross-record comparison; record cho một người; dialog cho hành động tập trung; không dùng một mẫu cho mọi dữ liệu.
5. Kiểm label, đơn vị, null/0, trạng thái và scope. Tên nút phải nói điều xảy ra; destructive có hậu quả trước khi xác nhận.
6. Chụp full page 1440 / 1024 / 768 / 390; xem toàn trang và zoom cụm. Reject khi title và action đụng nhau, filter mất lựa chọn, tên bị cắt, panel không có nhiệm vụ, hoặc phải tìm label ở trục xa value.
7. Thử thao tác thật: bàn phím, loading, rỗng, lỗi trường, submit, kết quả, route sâu, quyền STAFF. Cho nội dung dài vào record.
8. So sánh trước–sau rồi ghi lại quyết định và giới hạn. Axe chỉ kiểm một phần accessibility; không dùng nó làm bằng chứng người dùng thích trang hơn.

## 5. Tài liệu tham khảo

- [Carbon — Data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines): quan hệ toolbar, row và action; density theo nhiệm vụ.
- [GOV.UK — Password input](https://design-system.service.gov.uk/components/password-input/): hiện mật khẩu, autocomplete và input attributes.
- [NN/g — Cards](https://www.nngroup.com/articles/cards-component/): chia nhóm thông tin liên quan thành đơn vị đọc được.
- [NN/g — Proximity](https://www.nngroup.com/articles/gestalt-proximity/): quan hệ được truyền qua khoảng cách; không suy ra một giới hạn px phổ quát.
- [W3C — Labels](https://www.w3.org/WAI/tutorials/forms/labels/): label gắn control, giữ hướng dẫn và lỗi có thể đọc được.

Đây là expert audit và thử luồng với dữ liệu DEMO, chưa là usability testing với nhân viên thật. Cảm nhận sang / thân thiện cần chủ cơ sở và người vận hành review; không có cam kết chuyển đổi hoặc doanh thu từ screenshot.

## 6. Bằng chứng kiểm tra

Kết quả cuối được ghi trong `VERIFICATION.md`; gallery có hình ở `index.html`, không chỉ link tài liệu. Toàn bộ screenshot QA và log nằm trong `src_FE/visual-qa/` của worktree, không đưa vào production bundle.
