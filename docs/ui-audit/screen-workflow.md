# Quy trình duyệt từng màn hình — Soul Pilates Nha Trang

Ngày 26/09/2026. Tài liệu này dùng cho người thiết kế, lập trình và chủ studio khi xem bản chạy được. Các website bên ngoài là **tham khảo cho một cách giải quyết cụ thể**, không phải mẫu để sao chép màu, ảnh, câu chữ hay chính sách.

## 1. Kết luận sau khi kiểm lại hai bản tổng hợp

| Nhận định | Kiểm chứng độc lập | Quyết định |
| --- | --- | --- |
| A chỉ sửa CSS nên chưa giải quyết luồng tìm lớp. | `ui/base..ui/a` và ảnh `version-a`: ngày đầu rỗng, lịch nhân viên còn vùng giờ trống. | Giữ sửa lỗi responsive; không lấy A làm hướng sản phẩm. |
| B giải quyết thứ tự công việc và nén lịch tuần; C đưa lớp có thể đặt và việc cần xử lý lên đầu. | Các nhánh `ui/a`, `ui/b`, `ui/c` cùng tách từ `41beb45`; ảnh và số đo ở `version-comparison.md` là fixture, không phải thời gian thao tác. | Lấy danh sách lớp của C và hàng việc dashboard C; giữ lịch B/C làm hai phương án cần thử với nhân viên. |
| Ảnh đúng nguồn là đủ để trang sang. | `composition-after/home-1440.png` vẫn có caption như tài liệu thiết bị và nhiều vùng thông tin trình bày như bảng. `photos/composition-v2` lại bỏ caption và dùng ảnh tràn mép; đó là một nhánh khác tách từ `main`. | Đánh giá **vai trò, crop và nhịp toàn trang**. Không gộp kết quả hai nhánh thành một thành công đã được kiểm chứng. |
| Pipeline AVIF/WebP, PSNR và giới hạn 1088px là chuẩn chất lượng thị giác cho mọi ảnh. | Đây là đo kỹ thuật cho các crop của `photos/g3-*`; ảnh gốc #15 rộng 1280px, và cảm nhận thương hiệu không được suy ra từ PSNR. | Tối ưu file sau khi chốt composition; ảnh rõ và tải nhanh đều cần, nhưng không dùng số nén để duyệt mỹ thuật. |
| Soul-1 hơn Soul-2 vì ít card; Soul-2 có 103 lỗi accessibility. | `soul-1/` và `soul-2/` **có source** trong repo lân cận `soul-pillate`, dù không nằm trong Git refs của repo này. Soul-2 thật có avatar ở danh sách, card/bo góc ở trang public. Con số 103 của HTML report là phép đo trên build cũ, chưa phải audit màn hình hiện tại. | Giữ tính trung thực, contrast và dòng đọc ngắn. Không dùng số card hoặc con số lỗi lịch sử như tiêu chí thắng. |
| C/B chắc chắn cải thiện chuyển đổi hoặc tốc độ thao tác. | Không có analytics hay thử nghiệm khách/học viên/nhân viên thật; `version-comparison.md` cũng nói rõ giới hạn này. | Chỉ gọi là giả thuyết. Đo nhiệm vụ trước khi chốt. |

**Chỗ thiếu lớn nhất của cả hai báo cáo:** trang bán dịch vụ vẫn chưa có địa chỉ, số liên hệ, giờ mở cửa, giá/gói xác nhận và chân dung HLV. `studio-18.jpg` có dữ kiện của J Pilates; chủ đã nói cùng nơi/cùng chủ, nhưng tên giao dịch và việc dùng nguyên thông tin trên site Soul vẫn cần xác nhận rõ khi chuẩn bị phát hành. Đây không phải đầu việc của vòng nghiên cứu UI/UX hiện tại. Mô tả phòng tập cũ nói “không có gương phủ kín tường” trong khi ảnh phòng có gương; cần loại câu đó khi biên tập nội dung ở vòng sau.

## 2. Cổng duyệt bắt buộc cho **mỗi** màn hình

1. **Một việc chính:** viết câu “Người ở màn hình này muốn ___; sau 5 giây họ thấy ___; hành động tiếp theo là ___.” Nếu không trả lời được, sửa thứ tự nội dung trước khi sửa style.
2. **Ảnh chụp trạng thái:** xem first viewport và toàn trang ở 1440, 1024, 768, 390px. Chụp menu, form/dialog mở; dữ liệu có, rỗng, đang tải, lỗi; tên và văn bản dài. Đo tràn ngang tài liệu và điểm ảnh bị cắt, không chỉ nhìn build pass.
3. **Đường đi:** đếm click/tap từ màn hình vào đến tác vụ chính. Quan sát 3 người đại diện, không hướng dẫn họ. Ghi thời gian, điểm dừng và hiểu sai; chiều cao ảnh chụp không thay cho phép đo này.
4. **Ảnh có nhiệm vụ:** với mỗi ảnh, ghi `vai trò / bằng chứng nhìn thấy / vì sao ở đây / crop desktop-mobile / quan hệ với câu chữ`. Nếu câu trả lời chỉ là “cho đỡ trống”, bỏ ảnh. Caption chỉ hiện khi nó cung cấp thông tin **không thể đọc từ nội dung cạnh ảnh**; mô tả truy cập ở `alt` vẫn bắt buộc.
5. **Hai tham chiếu:** mở hai nguồn phù hợp ở bảng dưới, ghi **một** chi tiết áp dụng và **một** chi tiết không sao chép. Không lấy giá, số lớp, thành tích, review hoặc ảnh của họ làm dữ kiện của Soul.
6. **Cổng chấp nhận:** đề nghị/việc chính rõ trong 5 giây; thứ bậc nhất quán; không ảnh mồ côi; không lặp CTA cạnh nhau; không tràn 390px; chữ Việt không cắt dấu; điều kiện/hậu quả giao dịch đọc được; API quyết định trạng thái; không bịa dữ kiện. Tự reject khi một mục sai và chụp lại sau sửa.
7. **Bàn giao:** lưu screenshot, ghi thay đổi và giới hạn, chạy `npm run verify`. Màn hình bán hàng còn thiếu dữ kiện thực thì **chưa đạt phát hành**, dù layout đã đạt.

## 3. Website tham khảo đã mở và bài học có thể chuyển giao

R1–R7 và R15–R17 là website studio để **người thiết kế tự xem bố cục, ảnh, chữ và hành trình** trên desktop/mobile. R18–R20 có ảnh minh họa giao diện nghiệp vụ để tham khảo thứ bậc và mật độ thông tin. R8–R14 là tài liệu chính thức về **luồng thao tác**; không lấy chúng làm chuẩn thẩm mỹ. Những nhận xét dưới đây dựa trên nội dung và cấu trúc trang đã kiểm tra; chưa chấm điểm chất lượng thị giác của site ngoài bằng screenshot cùng viewport.

| Mã | Nguồn chính thức | Chỉ học điểm này |
| --- | --- | --- |
| R1 | [Red Spring Pilates](https://www.redspringpilates.com/) | Nói rõ phương pháp, cho ai và bước đặt buổi đầu trong cùng luồng đọc. |
| R2 | [Pilates by Ang](https://www.pilatesbyang.com/) | Người dạy, không gian thật và FAQ giúp chứng minh lời giới thiệu. |
| R3 | [Reformed Body](https://reformedbody.co.uk/) | Phân loại lớp/gói, thời hạn và địa điểm theo câu hỏi khách cần quyết định. |
| R4 | [Thirty Eleven Pilates](https://thirtyelevenlondon.com/) | Danh mục lớp và gói có khác biệt rõ, điều kiện offer đọc được. |
| R5 | [Club Pilates](https://www.clubpilates.com/) | Đường vào buổi giới thiệu cho người mới và giải thích thiết bị. |
| R6 | [Pilates by Ang — appointments](https://www.pilatesbyang.com/appointments) | Gói và lớp riêng có đơn vị, thời hạn, mức cam kết rõ; Soul phải chờ giá thật. |
| R7 | [Move With Studio — class schedule](https://movewith.studio/class-schedule) | Lịch là nơi chọn giờ/lớp, cần nối thẳng với hành động. |
| R8 | [ClassPass — tìm lớp](https://help.classpass.com/hc/en-us/articles/204312229-How-do-I-search-for-classes) và [đặt lớp](https://help.classpass.com/hc/en-us/articles/204335689-How-do-I-make-a-reservation) | Thời gian, loại lớp, trạng thái, kiểm lại trước khi xác nhận. |
| R9 | [ClassPass — quản lý hủy](https://help.classpass.com/hc/en-us/articles/204335739-How-do-I-cancel-a-fitness-class-or-wellness-reservation) | Hậu quả hủy phải hiển thị trước xác nhận; trạng thái sau hủy phải rõ. |
| R10 | [Momence — việc quầy lễ tân](https://help.momence.com/en/articles/12030135-front-desk-staff-faq-s) | Công việc bắt đầu từ lớp/khách cụ thể; giảm tìm kiếm vòng quanh. |
| R11 | [Momence — lịch và điểm danh](https://help.momence.com/en/articles/12027801-settings-restrictions-faq-s-classes) | Lịch, lớp cụ thể và roster cần giữ quan hệ rõ. |
| R12 | [Momence — lead dashboard](https://help.momence.com/en/articles/8475375-leads-a-tour-of-the-dashboard) | Nguồn, giai đoạn và hành động tiếp theo của lead, không chỉ tổng số. |
| R13 | [Momence — subscriptions](https://help.momence.com/en/articles/12030160-subscription-general-faq-s) | Quyền sử dụng gói phải rõ ở đúng lớp, không suy từ số dư trên frontend. |
| R14 | [Momence — funnels](https://help.momence.com/en/articles/9764461-funnels) | Báo cáo theo hành trình lead → buổi đầu → học viên; chỉ làm khi backend có dữ liệu. |
| R15 | [RÉME HOUSE](https://www.remehouse.club/) | Tự xem cách giới thiệu ba hình thức trải nghiệm và vai trò của ảnh trong từng đoạn; kiểm tra xem nhịp này có phù hợp một studio nhỏ ở Nha Trang. |
| R16 | [Nouva Pilates](https://nouvapilates.com/) | Tự xem giọng thương hiệu boutique, ảnh người/không gian và đường vào đặt lớp; tránh bê lời hứa kết quả từ họ. |
| R17 | [Silo Studios](https://www.silostudios.london/) | Tự xem cách studio quy mô nhỏ giải thích sự chú ý cá nhân và lớp học; chỉ dùng số liệu khi Soul có số liệu thật. |
| R18 | [Mindbody — Pilates software](https://www.mindbodyonline.com/en-au/business/fitness/pilates-software) | Xem ảnh minh họa màn hình đặt lớp, lịch HLV và quản lý; phân biệt ảnh marketing của phần mềm với giao diện vận hành thực. |
| R19 | [Mindbody — Business App](https://www.mindbodyonline.com/business/business-app) | Xem mô hình lịch, khách, thanh toán và phân quyền trên mobile; kiểm tra việc quan trọng có nằm trước thống kê. |
| R20 | [Teamup — gym staff scheduling](https://www.teamup.com/learn/manage-availability/gym-staff-scheduling-software/) | Xem lịch nhân sự đặt cạnh nhau và cách biểu diễn người sẵn sàng; chỉ áp dụng nếu lịch studio có bài toán phân ca tương tự. |

**Bài tập tham khảo nhanh:** với mỗi website studio, xem trang đầu trong 5 giây rồi cuộn hết ở desktop và 390px. Ghi lại (1) ảnh đầu giúp hiểu điều gì, (2) ảnh sau có bổ sung chứng cứ mới không, (3) các mép lề có thống nhất không, (4) hành động đặt lớp/liên hệ có tìm lại được sau mỗi đoạn lớn không. Chỉ chọn một quy luật hữu ích cho Soul; không sao chép toàn bộ bố cục của bất kỳ nguồn nào.

## 4. Checklist theo từng màn hình

**Công khai — mục tiêu là tin tưởng và liên hệ.** Mỗi hàng cần kiểm ở desktop/mobile, trạng thái thiếu dữ liệu và hành trình từ đầu trang đến hành động. Không thêm ảnh vào trang dữ liệu để “đồng bộ” với trang chủ.

| URL | Câu hỏi phải trả lời khi review | Tham khảo |
| --- | --- | --- |
| `/` | Trong 5 giây có biết đây là reformer tại Nha Trang, hai hình thức tập và bước kế tiếp? Ảnh có thể hiện **đúng reformer** và còn rõ người/máy ở 390px? Lịch demo có bị hiểu là lịch thật? | R15, R17 |
| `/gioi-thieu` | Ảnh có chứng minh **phòng thật** mà không che các điểm chưa đẹp? Câu chữ nào nói quá những gì ảnh/nguồn xác nhận? Địa chỉ thật có thể tìm? | R2, R17 |
| `/dich-vu` | Khách mới có phân biệt lớp nhóm/lớp riêng trong một lần nhìn? “Phù hợp với” có tránh hứa hẹn phục hồi y khoa? Thời hạn hủy có dễ thấy? | R1, R16 |
| `/goi-tap` | Chưa có giá thì có giải thích cách gói hoạt động và dẫn đến hỏi đúng chỗ, không tạo cảm giác giấu giá? Khi có giá, số buổi/thời hạn/điều kiện phải cùng một khối. | R3, R6 |
| `/huan-luyen-vien` | Chưa có chân dung/tiểu sử thì có tránh avatar giả và lời khen vô nguồn? Khi có hồ sơ, năng lực nào được xác minh? | R2, R1 |
| `/lich-tap` | Ngày/giờ/loại lớp/trạng thái có quét được trên điện thoại? Lớp hết chỗ, lỗi mạng và lịch chưa mở có câu trả lời riêng? | R7, R8 |
| `/khuyen-mai` | Offer có điều kiện, hạn, đối tượng và CTA thật? Nếu chưa có, trang có nói thẳng thay vì bán một khuyến mãi không tồn tại? | R4, R3 |
| `/lien-he` | Có cách liên hệ **đang hoạt động** và vị trí thật? Nếu dữ kiện còn thiếu, một lời báo trung thực có tốt hơn sáu dòng “đang cập nhật”? | R2, R3 |
| `/dat-tu-van` | Form hỏi tối thiểu, xác nhận rõ đã gửi/chưa gửi, không hứa thời gian gọi lại chưa xác nhận? Có thể hoàn thành bằng một tay ở 390px? | R5, R2 |

**Tài khoản và học viên — mục tiêu là đặt đúng lớp, hiểu hậu quả.** Hai nguồn mỗi hàng là tham khảo luồng, không phải mỹ thuật marketing.

| URL | Câu hỏi phải trả lời khi review | Tham khảo |
| --- | --- | --- |
| `/dang-nhap` | Một tác vụ nổi bật; bàn phím, lỗi email/mật khẩu và trở về đúng nơi sau đăng nhập? Ảnh desktop không cản form? | R8, R5 |
| `/quen-mat-khau` | Có nói bước tiếp theo mà không lộ tài khoản có tồn tại? Lỗi và thành công dễ phân biệt? | R8, R5 |
| `/dat-lai-mat-khau` | Token hết hạn, mật khẩu mới hợp lệ, nút quay lại rõ? | R8, R5 |
| `/hv` | Buổi kế tiếp và việc cần làm xuất hiện trước số liệu phụ? | R8, R9 |
| `/hv/lop-hoc` | Không bị kẹt ở ngày rỗng; lớp **backend cho đặt** xuất hiện trước; lọc không giấu lớp cần so sánh? | R8, R13 |
| `/hv/lop-hoc/:classId` | Ngày/giờ, loại, HLV, gói sẽ dùng, trạng thái và hậu quả đặt ở ngay trước nút xác nhận? | R8, R13 |
| `/hv/lich-cua-toi` | Buổi sắp đến và hạn hủy đọc được; đổi/hủy đưa ra xác nhận và trạng thái mới? | R9, R8 |
| `/hv/lich-su` | Đã tập, đã hủy, vắng có phân biệt rõ, tìm được buổi cụ thể? | R9, R8 |
| `/hv/goi-tap` | Số buổi, hiệu lực, hết hạn và lớp có thể dùng lấy từ backend; `null` khác `0`? | R13, R8 |
| `/hv/tai-khoan` | Thông tin cá nhân đọc/sửa được, lỗi và lưu thành công rõ; không đòi dữ kiện không cần? | R13, R8 |

**HLV — mục tiêu là đến đúng lớp và điểm danh đúng người.**

| URL | Câu hỏi phải trả lời khi review | Tham khảo |
| --- | --- | --- |
| `/hlv` | Lớp tiếp theo và việc chưa điểm danh nằm ở đầu; không có KPI vô ích? | R10, R11 |
| `/hlv/hom-nay` | Giờ, địa điểm/lớp, roster và trạng thái hôm nay có quét được trong vài giây? | R11, R10 |
| `/hlv/lich-day` | Lịch tuần hỗ trợ tìm ngày và lớp; khoảng trống không ăn phần lớn viewport? | R11, R20 |
| `/hlv/lop/:classId` | Danh sách người, trạng thái đến/vắng và thời điểm cho phép điểm danh rõ; lỗi lưu không làm tưởng đã thành công? | R11, R10 |
| `/hlv/ho-so` | Dữ liệu nào HLV tự sửa được, dữ liệu nào studio xác nhận? Không bịa chứng chỉ. | R2, R10 |

**Nhân viên/chủ — mục tiêu là xử lý việc có hậu quả, không ngắm dashboard.**

| URL | Câu hỏi phải trả lời khi review | Tham khảo |
| --- | --- | --- |
| `/studio`, `/studio/tong-quan` | Việc chờ điểm danh/gia hạn/thanh toán và đường vào bản ghi có trước bốn số liệu? | R10, R12 |
| `/studio/lich` | 390px không tràn; desktop thử B (lưới hai ca) và C (agenda), đo việc tìm/đổi/tạo lớp cùng người trực lịch. | R20, R18 |
| `/studio/lich/:classId` | Trạng thái, người đặt, sửa/hủy và hậu quả hoàn buổi có ngay trước xác nhận? | R11, R10 |
| `/studio/khach-quan-tam`, `/:leadId` | Lead chưa xử lý nổi lên; nguồn, nhu cầu, liên hệ và bước sau rõ? | R12, R14 |
| `/studio/hoc-vien`, `/:studentId` | Tìm nhanh tên/số, phân biệt người trùng tên; hồ sơ không biến thành năm tab khó dò? | R10, R13 |
| `/studio/huan-luyen-vien`, `/:trainerId` | Lịch, lớp và quyền của HLV rõ; không dùng chân dung mặc định như hồ sơ thật. | R20, R19 |
| `/studio/goi-tap` | Gói, thời hạn, số buổi, giá xác nhận và trạng thái bán/ẩn dễ so sánh? | R13, R6 |
| `/studio/thanh-toan` | Khoản chờ xác nhận nổi rõ, gắn đúng học viên/gói, lỗi nhập tiền không âm thầm bỏ qua? | R10, R13 |
| `/studio/so-buoi` | Lần cộng/trừ nào, do ai, vì sao, số dư trước/sau; `null` không thành `0`? | R13, R10 |
| `/studio/gia-han` | Ai cần liên hệ trước, vì sao, lần liên hệ gần nhất và kết quả ở cùng vùng nhìn? | R12, R10 |
| `/studio/bao-cao`, `/doanh-thu`, `/lop-hoc`, `/huan-luyen-vien` | Khoảng thời gian, định nghĩa số, nguồn dữ liệu, xuất file; không vẽ KPI backend không có. | R14, R11 |
| `/studio/tai-khoan` | Chỉ admin thấy; tạo/sửa/vô hiệu hóa và quyền hậu quả được xác nhận? | R10, R13 |

`*` (404): phải có đường về site và không tiết lộ khu vực được bảo vệ. Tham chiếu gần nhất là điều hướng công khai R1/R2.

## 5. Thứ tự nghiên cứu và giả thuyết cho vòng thiết kế sau

1. **Bắt đầu với public site:** chụp bản gốc ở `/`, `/gioi-thieu`, `/dich-vu`, `/goi-tap` tại 1440 và 390px. Khoanh các ảnh không gắn với lời giới thiệu hoặc làm lệch trục bố cục. Thử trên giấy ba hướng hero (chia đôi, ảnh tràn khung có chủ đích, hoặc không ảnh) trước khi chọn ảnh. Chọn bằng cảm giác tin cậy của toàn trang, khả năng đọc và tác vụ kế tiếp, không chọn vì riêng ảnh đẹp.
2. **Kiểm tra các giả thuyết, chưa coi là quyết định:** ảnh reformer có thể làm bằng chứng cho trang đầu; ảnh phòng thật có thể làm bằng chứng cho `/gioi-thieu`; ảnh lặp trên `/dich-vu` có thể bỏ. So sánh lớp nhóm/lớp riêng trong một vùng nhìn có thể giúp ra quyết định. Hướng C cho danh sách lớp và dashboard, hướng B/C cho lịch nhân viên chỉ là ứng viên; bằng chứng hiện có là screenshot/fixture.
3. **Thử luồng với người thật:** cho ít nhất ba người đại diện làm các việc tìm lớp phù hợp, liên hệ studio, tìm buổi kế tiếp, hủy buổi, xử lý lead và tìm lớp cần sửa. Ghi số lần chạm, thời gian và hiểu sai theo đúng vai trò. Những phép thử liên quan đến nghiệp vụ cần dữ liệu giả có trạng thái đầy đủ.
4. **Lập kế hoạch ảnh nếu sau này chụp mới:** một khung rộng phòng gọn, chân dung từng HLV thật, một tương tác HLV chỉnh động tác có đồng ý sử dụng. Ảnh hiện tại chỉ một người/một buổi chụp; nhiều crop của cùng buổi không tự tạo cảm giác phong phú.
5. **Để giai đoạn chuẩn bị phát hành:** xác nhận tên giao dịch, địa chỉ, liên hệ, giờ mở cửa, map, gói/giá và hồ sơ HLV. Chủ đã ưu tiên nghiên cứu UI/UX lúc này, vì vậy không lấy các dữ kiện còn thiếu làm lý do dừng audit.
6. **Đo sau phát hành:** lượt xem trang → bắt đầu form → gửi thành công; khách mở lịch → tạo tài khoản/đặt lớp; tỉ lệ lỗi form; người học tìm được lớp; nhân viên xử lý lead. Không tuyên bố “tăng chuyển đổi” dựa trên screenshot.

## 6. Phiếu review một màn hình

```text
Màn hình / vai trò / viewport / trạng thái dữ liệu:
Việc chính và bằng chứng nó hiện trong 5 giây:
Số bước đến hành động:
Ảnh (nếu có): vai trò / bằng chứng / vị trí / crop / alt:
Hai tham chiếu và điều áp dụng / không sao chép:
Điểm thất bại về hierarchy, layout, nội dung, tương tác, API:
Ảnh chụp trước / sau:
Kết quả 3 người thử nhiệm vụ (thời gian, lỗi hiểu sai):
Quyết định: đạt / sửa rồi chụp lại / chờ dữ kiện thật:
```
