# So sánh ba giả thuyết UI

Ngày đánh giá: 26/09/2026. Các nhánh cùng bắt đầu từ `72f7789` (nhánh `codex/ui-base`), sau khi hợp nhất UI nhiếp ảnh với API trên `main`. Đây là ba bản chạy được trong ba worktree độc lập, không phải ba bộ màu.

| Bản | Nhánh / commit | Giả thuyết được thử | Kết quả quan sát được |
| --- | --- | --- | --- |
| A | `codex/ui-a` / `18508ed` | Sửa thi công responsive và nhịp trang là đủ. | Hết tràn ngang; dashboard gọn hơn. Lịch vẫn trải một khoảng trống dài giữa buổi sáng và chiều, học viên vẫn phải chọn ngày trước khi thấy lớp đặt được. Giả thuyết **không đủ**. |
| B | `codex/ui-b` / `3b736fa` | Thứ tự thông tin và nhóm tác vụ là nguyên nhân chính. | Việc cần xử lý lên trước số liệu; ngày đầu tiên có lớp đặt được được chọn sẵn; lịch tuần tách sáng/chiều và giữ so sánh theo cột. Cân bằng tốt giữa thay đổi và tính quen thuộc. |
| C | `codex/ui-c` / `3405546` | Mỗi vai trò cần mặt giao diện theo công việc của mình. | Dashboard thành hàng việc; lịch mặc định là danh sách theo ngày và vẫn có lưới tuần; học viên thấy bốn ngày có lớp đặt được ngay; trang chủ dẫn tới lịch bằng thông điệp cụ thể. Đường tới hành động rõ nhất, đổi lại lịch desktop dài hơn và mất cái nhìn không gian ở chế độ mặc định. |

## Phương pháp và chứng cứ

Script `src_FE/scripts/ui-audit-capture.mjs` chụp Chromium ở 1440, 1024, 768 và 390px với dữ liệu demo MSW. Mỗi bản có ảnh trang chủ, dashboard/lịch nhân viên, lớp học/lịch của học viên; riêng 390px có menu công khai và hộp tạo lớp. Script đợi lịch công khai tải xong trước khi chụp. Ảnh [trạng thái đang tải](screenshots/integrated/home-loading-390.png) của bản nền được giữ riêng. Các [số đo bản nền](screenshots/integrated/measurements.json) và [A](screenshots/version-a/measurements.json), [B](screenshots/version-b/measurements.json), [C](screenshots/version-c/measurements.json) ghi chiều rộng tài liệu.

Các con số dưới đây là kích thước ảnh toàn trang của fixture cụ thể, **không phải thời gian hoàn thành tác vụ**. Nội dung thực tế, tên dài, trạng thái lỗi hiếm và hành vi người dùng chưa được kiểm chứng đầy đủ.

| Màn hình / số đo | Nền tích hợp | A | B | C |
| --- | ---: | ---: | ---: | ---: |
| Lịch nhân viên, chiều rộng tài liệu ở viewport 390px | **472px** | 390px | 390px | 390px |
| Dashboard nhân viên, chiều cao ở 390px | 1083px | 852px | 924px | 844px |
| Lịch nhân viên, chiều cao ở 1440px | 1249px | 1249px | **900px** | 1318px |
| Trang chủ, chiều cao ở 1440px | 5026px | 4686px | 4157px | **4018px** |
| Trang chủ, chiều cao ở 390px | 5488px | **5112px** | 5377px | 5384px |

Không bản nào còn tràn **chiều rộng tài liệu** tại bốn breakpoint đã chụp. Danh sách điều hướng nhân viên vẫn cuộn ngang trong chính vùng điều hướng ở màn hình hẹp. Chiều cao trang chủ trên điện thoại giảm rất ít ở B/C vì các phần nội dung chính vẫn còn; thay đổi của hai bản này chủ yếu là **thứ tự ra quyết định**, không phải rút ngắn trang.

## Đối chiếu theo công việc

### Khách mới: hiểu đề nghị và tìm bước kế tiếp

- [A desktop](screenshots/version-a/home-1440.png) giữ hero ảnh lớn và thứ tự cũ, chỉ tiết chế khoảng cách. Trải nghiệm vẫn mang nhịp bài biên tập: lịch nằm sau phần giới thiệu hình thức và phương pháp.
- [B desktop](screenshots/version-b/home-1440.png) đặt ảnh cạnh lời giới thiệu, đưa lịch lên trước phương pháp nhưng vẫn dẫn bằng câu khẩu hiệu. Sự lựa chọn hình thức tập vẫn là phần đầu sau hero.
- [C desktop](screenshots/version-c/home-1440.png) nói rõ “lớp nhóm nhỏ và lớp riêng tại Nha Trang”, đặt “Xem lịch tập” là hành động chính, rồi cho thấy lịch ngay sau hero. Cũng xem [C mobile](screenshots/version-c/home-390.png). Đây là lời dẫn sát việc khách muốn quyết định nhất, nhưng toàn trang mobile vẫn dài 5384px và thông tin địa chỉ/giờ/điện thoại thực vẫn thiếu.

### Học viên: tìm buổi có thể đặt

- [A mobile](screenshots/version-a/student-classes-390.png) chứng minh CSS gọn không chữa được điểm khởi đầu: ngày hôm nay có thể chỉ có lớp đã đặt, trong khi ngày khác có chỗ.
- [B mobile](screenshots/version-b/student-classes-390.png) đánh số lớp trên tab ngày và chọn sẵn ngày đầu có lớp đặt được. Tốt hơn rõ rệt khi người học muốn chọn theo ngày; vẫn chỉ nhìn một ngày mỗi lần.
- [C mobile](screenshots/version-c/student-classes-390.png) liệt kê theo thời gian các lớp đặt được trong 14 ngày, hiển thị bốn ngày có lớp đầu tiên và cho mở thêm. Nút “Xem tất cả” bộc lộ cả lớp đã đặt/không đủ điều kiện. Tìm buổi kế tiếp không cần dò tab, đổi lại danh sách dài hơn. Quyết định có thể đặt vẫn lấy từ API, không suy từ số chỗ trên giao diện.

### Nhân viên: xử lý việc và xem lịch

- [A dashboard](screenshots/version-a/staff-dashboard-390.png) làm bốn số liệu gọn hơn nhưng vẫn cho số liệu đứng trước việc cần xử lý. [A lịch desktop](screenshots/version-a/staff-calendar-1440.png) vẫn có khoảng trống giữa 06:00 và 17:30.
- [B dashboard](screenshots/version-b/staff-dashboard-390.png) đặt gia hạn/thanh toán trước; [B lịch desktop](screenshots/version-b/staff-calendar-1440.png) chia sáng và chiều/tối, đưa toàn bộ tuần demo vào khoảng một viewport 900px. Đây là bản dễ giữ nếu nhân viên cần so sánh các ngày theo cột.
- [C dashboard](screenshots/version-c/staff-dashboard-390.png) là danh sách việc có đường dẫn trực tiếp; [C lịch mobile](screenshots/version-c/staff-calendar-390.png) và [desktop](screenshots/version-c/staff-calendar-1440.png) là agenda không dành hàng trăm pixel cho giờ không có lớp. Chế độ “Lưới tuần” vẫn có trên desktop. Lịch mặc định dài hơn B và cần kiểm thử với người trực lịch để biết họ có cần thấy vị trí các lớp trên trục thời gian ngay lập tức hay không.

Hộp [tạo lớp trên mobile của C](screenshots/version-c/staff-create-dialog-390.png) và [menu công khai](screenshots/version-c/public-menu-390.png) đã được kiểm tra ở trạng thái mở. Lỗi menu công khai vốn có trên bản nền được sửa chung trước khi tách ba giả thuyết.

## Kiểm tra chức năng và giới hạn

- `npm run verify` đã đạt trên A, B và C: typecheck, lint, 66 unit tests, build, build contract và content code gate. Sau đó chỉ thêm cấu hình Vite cho font trong worktree và chỉnh script chụp; lint cuối đạt trên cả bốn nhánh.
- Trên C, E2E công khai desktop/mobile đạt **24/24**. Hai luồng học viên “đặt rồi đổi” và “đặt rồi hủy” đạt **2/2** sau khi bộ chọn E2E được cập nhật theo nhãn “Đặt được” và đợi mutation hoàn tất.
- Lần chạy toàn bộ E2E cũ trên C trước cập nhật có **32/59 đạt, 27 lỗi**. Nhiều bài vẫn giả định mock/route/ID trước khi API được hợp nhất (ví dụ `s-...` thay vì ID số, trường biểu mẫu và tên tệp CSV cũ); một ca tài khoản cũng lỗi trên nhánh nền với vai trò staff. Vì chưa đối chiếu từng ca với backend thật, không suy rằng mọi lỗi đều có sẵn hoặc đều do C. Đây là cổng hồi quy chưa sạch, cần cập nhật riêng trước release.
- `check:content` qua phần code nhưng **không cho release**: còn thiếu địa chỉ, số điện thoại, giờ mở cửa, URL Zalo và URL bản đồ cùng owner/hạn xử lý. Không phiên bản UI nào được phép bịa các dữ kiện này.

## Hướng tiếp tục

**C là ứng viên chính để kiểm thử công việc thực tế** vì nó đưa hành động cần làm và lớp có thể đặt ra ngay đầu mỗi màn hình. Giữ B như đối chứng cho lịch nhân viên: bản này rút lịch desktop còn 900px trong fixture và giữ so sánh theo cột. A chứng minh sửa thi công là cần thiết nhưng không giải quyết cách tìm lớp và thứ tự ưu tiên. Trước khi chọn một bố cục để nhập lại, nên cho nhân viên thực hiện tác vụ tạo/xem/đổi lớp trên B và C, và cho học viên tìm một buổi phù hợp trên B và C; đo số bước, thời gian và lỗi hiểu sai. Ảnh chụp chỉ hỗ trợ chọn giả thuyết, không chứng minh chuyển đổi hoặc tốc độ thao tác.
