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
| Cứ có ảnh studio thật ở hero là chứng minh được dịch vụ. | `composition-after/home-1440.png` và `app/routes/public/home.tsx` nói rõ **reformer** trong lời bán hàng nhưng ảnh hero là **Cadillac**; caption lại phải giải thích sự lệch đó. Nhánh `photos/composition-v2` chọn ảnh reformer khác nhưng tách từ `main`, chưa tích hợp với B/C. | Trượt cổng hình ảnh nếu máy/người/không gian trong ảnh không xác nhận đúng lời hứa ngay cạnh. Ưu tiên xét ảnh reformer của nhánh ảnh rồi review cả trang, không bê nguyên branch. |
| Bộ 21 ảnh là một buổi chụp, chỉ cần giảm số ảnh. | `app/content/photography.ts` phân biệt ảnh 01–09,17 thiên về ghi thiết bị và ảnh 11–15,19–21 thiên về người trước rèm. Hai ngôn ngữ ảnh khác nhau. | Chọn theo cảnh và nhiệm vụ từng trang; không coi mọi crop từ cùng nguồn là cùng chất lượng hoặc cùng vai trò. |

**Chỗ thiếu lớn nhất của cả hai báo cáo:** trang bán dịch vụ vẫn chưa có địa chỉ, số liên hệ, giờ mở cửa, giá/gói xác nhận và chân dung HLV. `studio-18.jpg` có dữ kiện của J Pilates; chủ đã nói cùng nơi/cùng chủ, nhưng tên giao dịch và việc dùng nguyên thông tin trên site Soul vẫn cần xác nhận rõ khi chuẩn bị phát hành. Đây không phải đầu việc của vòng nghiên cứu UI/UX hiện tại. Mô tả phòng tập cũ nói “không có gương phủ kín tường” trong khi ảnh phòng có gương; cần loại câu đó khi biên tập nội dung ở vòng sau.

**Phán đoán thị giác hiện tại:** bản `ui/composition` đã chữa bố cục ảnh mồ côi, nhưng [ảnh chụp trang chủ 1440px](screenshots/composition-after/home-1440.png) vẫn giống một bài trình bày về phương pháp hơn một nơi khách mới có thể tin và đặt buổi: ảnh Cadillac cạnh lời hứa reformer; caption làm khách phải đọc để hiểu ảnh; khối lịch demo và nhiều hàng chữ nhỏ tạo nhịp “bảng thông tin”; bằng chứng về nơi, người dạy và cách đến studio còn thiếu. Đây là vấn đề của nội dung và thứ bậc toàn trang, không thể giải bằng thêm ảnh hoặc siết spacing.

## 2. Cổng duyệt bắt buộc cho **mỗi** màn hình

1. **Một việc chính:** viết câu “Người ở màn hình này muốn ___; sau 5 giây họ thấy ___; hành động tiếp theo là ___.” Nếu không trả lời được, sửa thứ tự nội dung trước khi sửa style.
2. **Ảnh chụp trạng thái:** xem first viewport và toàn trang ở 1440, 1024, 768, 390px. Chụp menu, form/dialog mở; dữ liệu có, rỗng, đang tải, lỗi; tên và văn bản dài. Đo tràn ngang tài liệu và điểm ảnh bị cắt, không chỉ nhìn build pass.
3. **Đường đi:** đếm click/tap từ màn hình vào đến tác vụ chính. Quan sát 3 người đại diện, không hướng dẫn họ. Ghi thời gian, điểm dừng và hiểu sai; chiều cao ảnh chụp không thay cho phép đo này.
4. **Ảnh có nhiệm vụ:** với mỗi ảnh, ghi `vai trò / bằng chứng nhìn thấy / vì sao ở đây / crop desktop-mobile / quan hệ với câu chữ`. Nếu câu trả lời chỉ là “cho đỡ trống”, bỏ ảnh. Caption chỉ hiện khi nó cung cấp thông tin **không thể đọc từ nội dung cạnh ảnh**; mô tả truy cập ở `alt` vẫn bắt buộc.
5. **Hai tham chiếu:** mở hai nguồn phù hợp ở bảng dưới, ghi **một** chi tiết áp dụng và **một** chi tiết không sao chép. Không lấy giá, số lớp, thành tích, review hoặc ảnh của họ làm dữ kiện của Soul.
6. **Cổng chấp nhận:** đề nghị/việc chính rõ trong 5 giây; thứ bậc nhất quán; không ảnh mồ côi; không lặp CTA cạnh nhau; không tràn 390px; chữ Việt không cắt dấu; điều kiện/hậu quả giao dịch đọc được; API quyết định trạng thái; không bịa dữ kiện. Tự reject khi một mục sai và chụp lại sau sửa.
7. **Bàn giao:** lưu screenshot, ghi thay đổi và giới hạn, chạy `npm run verify`. Màn hình bán hàng còn thiếu dữ kiện thực thì **chưa đạt phát hành**, dù layout đã đạt.

### Cổng thị giác cho trang bán dịch vụ

Trước khi code, vẽ wireframe trắng đen ở 1440 và 390px. Điền đúng câu chữ, giá trị và hành động; để ảnh là ô xám ghi vai trò. Chỉ đưa ảnh vào khi wireframe đã giải thích được đường đi **hiểu studio → chọn hình thức → tin bằng chứng → xem lịch/giá → liên hệ**. Với mỗi phương án, chụp **first viewport và toàn trang** rồi trả lời:

- Ảnh đang chứng minh dịch vụ nào? Nếu nói reformer mà ảnh là Cadillac/chair, phương án trượt, dù ảnh đẹp.
- Ở mobile, mặt người, động tác và máy còn đọc được không? Crop có chặt đầu/tay, che chữ hoặc đẩy hành động ra quá xa không?
- Ảnh có cùng trục bố cục và cùng nhịp với lời giới thiệu? Nếu bỏ ảnh đi, câu chuyện còn mạch lạc; nếu thay ảnh, ý nghĩa section có thay đổi thật?
- Có quá nhiều hàng kẻ, caption, nhãn đánh số hoặc bảng khiến studio giống tài liệu kỹ thuật? Một chi tiết chỉ được giữ khi giúp khách quyết định.
- Khách mở trang 5 giây có nói đúng tên dịch vụ, địa điểm, khác biệt, hành động tiếp theo? Chủ studio có thể xác nhận từng hình ảnh/câu chữ là cơ sở của mình?

Một câu trả lời “không” ở 1–2 hoặc ảnh mồ côi là **trượt**. Các câu còn lại phải được ghi nhận và sửa trước khi gọi bản thiết kế là đạt. Chiều cao trang hay PSNR không thay cho đánh giá này.

### Lượt soi đầu tiên trên chín trang công khai

Đây là **triage từ screenshot của `ui/composition` với MSW demo**, không phải kết quả nghiên cứu khách thật hay đánh giá production. P0 = cản lòng tin/chuyển đổi hoặc cản phát hành; P1 = cần sửa bố cục/nội dung trước khi chốt visual. Mỗi hàng là việc đầu tiên phải kiểm lại trên bản chạy được.

| Màn hình | Ảnh đã xem | Phát hiện và việc đầu tiên |
| --- | --- | --- |
| `/` · P0 | [1440](screenshots/composition-after/home-1440.png) · [390](screenshots/composition-after/home-390.png) | Hero bán reformer nhưng ảnh Cadillac; caption cố giải thích. Đổi bằng chứng hình ảnh đúng dịch vụ hoặc thử hero chữ; giảm cảm giác bảng ở phần lịch demo. |
| `/gioi-thieu` · P1 | [1440](screenshots/composition-after/about-1440.png) · [390](screenshots/composition-after/about-390.png) | Ảnh chỉ thấy một máy ladder barrel, chưa chứng minh bố trí **cả phòng** như lời kể. Cần ảnh góc rộng thật hoặc thu hẹp claim; kiểm lại câu về gương với phòng thực tế. |
| `/dich-vu` · P1 | [1440](screenshots/composition-after/services-1440.png) · [390](screenshots/composition-after/services-390.png) | Ảnh một người trên reformer xác nhận loại máy nhưng chưa cho thấy khác biệt nhóm/riêng. Thử khối so sánh hai lựa chọn và hành động ngay sau mỗi quyết định; chỉ dùng ảnh thêm nếu nó chứng minh khác biệt. |
| `/goi-tap` · P0 | [1440](screenshots/composition-after/packages-1440.png) · [390](screenshots/composition-after/packages-390.png) | Fixture hiển thị gói **DEMO 3.000.000 đ** cạnh gói “Đang cập nhật”; dễ bị chụp gửi cho khách như bảng giá thật. Không dùng ảnh demo làm bản bàn giao; chỉ phát hành sau khi có bảng giá/điều kiện đã xác nhận. |
| `/huan-luyen-vien` · P0 | [1440](screenshots/composition-after/trainers-1440.png) | Chỉ có “DEMO Huấn luyện viên” và mô tả mẫu. Cần tên, chân dung và năng lực được studio xác nhận; nếu chưa có, cân nhắc bỏ đường vào trang khỏi điều hướng công khai cho tới khi có nội dung. |
| `/lich-tap` · P0 | [1440](screenshots/composition-after/schedule-1440.png) · [390](screenshots/composition-after/schedule-390.png) | Fixture mở ra tuần có sáu ngày “Không có lớp”, một buổi DEMO; trông như studio không hoạt động. Với dữ liệu thật, ưu tiên các buổi sắp tới có thể tham gia và giải thích rõ khi lịch chưa mở. |
| `/khuyen-mai` · P1 | [1440](screenshots/composition-after/promotions-1440.png) | Trang chỉ có thông báo DEMO. Không giữ link “Khuyến mãi” trong nav khi chưa có offer thật; nếu cần thông báo lịch nghỉ, đặt đúng nơi người học cần thấy. |
| `/lien-he` · P0 | [1440](screenshots/composition-after/contact-1440.png) | Sáu dòng “Đang cập nhật” làm trang liên hệ không thực hiện được việc của nó. Cần ít nhất một kênh đang hoạt động, địa chỉ và giờ thực; sau đó biên tập lại theo cách khách muốn đến/gọi/nhắn. |
| `/dat-tu-van` · P1 | [1440](screenshots/composition-after/consultation-1440.png) | Form đã có đường gửi rõ, nhưng câu “gọi lại trong giờ làm việc” cần giờ và quy trình thật. Thử mobile, lỗi nhập, lỗi mạng, trạng thái gửi thành công và lead tới quầy. |

**Kết luận triage:** không nên trình chín screenshot demo này như một website đã sẵn sàng cho khách mua. Những trang P0 cần nội dung thật và một vòng composition mới; việc “xong CSS” không xử lý được chúng.

## 3. Website tham khảo đã mở và bài học có thể chuyển giao

R1–R7, R15–R17 và R21 là website studio để **xem bố cục, ảnh, chữ và hành trình** trên desktop/mobile. Tôi đã mở 10 site ở 1440/390px, nên bảng cũng ghi điều **không nên học**: Red Spring cắt chữ ở 390px, Silo và Luma để lớp consent che hero; Pilates by Ang đặt chữ lên ảnh tối. R18–R20 có ảnh minh họa giao diện nghiệp vụ để tham khảo thứ bậc và mật độ thông tin. R8–R14 là tài liệu chính thức về **luồng thao tác**, không phải chuẩn thẩm mỹ. Website tham khảo có thể đổi theo thời gian; kiểm lại trước khi vẽ.

| Mã | Nguồn chính thức | Chỉ học điểm này |
| --- | --- | --- |
| R1 | [Red Spring Pilates](https://www.redspringpilates.com/) | Desktop: lời hứa Reformer + Tower nằm **cạnh ảnh đúng hai loại máy** và CTA buổi đầu. **Không học mobile:** ở 390px chữ bị cắt ngang. |
| R2 | [Pilates by Ang](https://www.pilatesbyang.com/) | Hồ sơ người dạy, lớp, giá và FAQ mang dữ kiện cụ thể. **Không học** overlay tối/chữ đè lên người hoặc banner consent che nội dung. |
| R3 | [Silo Studios — gói và lớp](https://www.silostudios.london/) | Nêu hình thức tập và mức cam kết cạnh hành động mua/đặt; xem cách người mới tìm lại giá. **Không học** CTA dày và popup che hero. |
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
| R15 | [Pilates Studio South](https://pilatesstudiosouth.com/) | Hero dựa vào chữ rõ ràng; ảnh phòng xuất hiện sau lời hứa và CTA trên mobile. Đây là phương án đáng thử khi ảnh không đủ mạnh để làm hero. **Không sao chép** số lượng máy/điểm bán của họ. |
| R16 | [Aloe Pilates](https://www.aloepilates.com/) | Phân biệt phòng, lớp, giá, HLV và lịch bằng dữ kiện; ảnh lớp có ngữ cảnh bổ sung chứng cứ sau lời giới thiệu. **Không sao chép** lượng chữ dài, chỉ số và chứng chỉ của họ. |
| R17 | [Silo Studios](https://www.silostudios.london/) | Ảnh người/không gian tạo không khí và lời giới thiệu nêu lợi ích của lớp nhỏ; [trang đội ngũ](https://www.silostudios.london/team/) cho người dạy một chỗ riêng. **Không học** popup che trang hoặc quảng cáo lặp. |
| R18 | [Mindbody — Pilates software](https://www.mindbodyonline.com/en-au/business/fitness/pilates-software) | Xem ảnh minh họa màn hình đặt lớp, lịch HLV và quản lý; phân biệt ảnh marketing của phần mềm với giao diện vận hành thực. |
| R19 | [Mindbody — Business App](https://www.mindbodyonline.com/business/business-app) | Xem mô hình lịch, khách, thanh toán và phân quyền trên mobile; kiểm tra việc quan trọng có nằm trước thống kê. |
| R20 | [Teamup — gym staff scheduling](https://www.teamup.com/learn/manage-availability/gym-staff-scheduling-software/) | Xem lịch nhân sự đặt cạnh nhau và cách biểu diễn người sẵn sàng; chỉ áp dụng nếu lịch studio có bài toán phân ca tương tự. |
| R21 | [Luma Pilates](https://www.lumaclt.com/) | Một phương án không khí phòng ấm, hình máy cùng lời hứa và nút buổi đầu; **chỉ lấy bố cục/ánh sáng**, không mặc định ảnh hay claim của họ là bằng chứng cho Soul. Mobile cần kiểm lại độ đọc khi có banner consent. |

**Bài tập tham khảo nhanh:** với mỗi website studio, xem trang đầu trong 5 giây rồi cuộn hết ở desktop và 390px. Ghi lại (1) ảnh đầu giúp hiểu điều gì, (2) ảnh sau có bổ sung chứng cứ mới không, (3) các mép lề có thống nhất không, (4) hành động đặt lớp/liên hệ có tìm lại được sau mỗi đoạn lớn không. Chỉ chọn một quy luật hữu ích cho Soul; không sao chép toàn bộ bố cục của bất kỳ nguồn nào.

## 4. Checklist theo từng màn hình

**Công khai — mục tiêu là tin tưởng và liên hệ.** Mỗi hàng cần kiểm ở desktop/mobile, trạng thái thiếu dữ liệu và hành trình từ đầu trang đến hành động. Không thêm ảnh vào trang dữ liệu để “đồng bộ” với trang chủ.

| URL | Câu hỏi phải trả lời khi review | Tham khảo |
| --- | --- | --- |
| `/` | Trong 5 giây có biết đây là reformer tại Nha Trang, hai hình thức tập và bước kế tiếp? **Hiện ảnh Cadillac không đạt câu hỏi này.** Crop 390px còn rõ người/máy? Lịch demo có bị hiểu là lịch thật? | R1 (ảnh đúng lời hứa), R15 (hero không cần ảnh), R21 (không khí) |
| `/gioi-thieu` | Ảnh có chứng minh **phòng thật** mà không che các điểm chưa đẹp? Câu chữ nào nói quá những gì ảnh/nguồn xác nhận? Địa chỉ thật có thể tìm? | R16 (phòng/ảnh thật), R17 (bản sắc studio nhỏ) |
| `/dich-vu` | Khách mới có phân biệt lớp nhóm/lớp riêng trong một lần nhìn? Máy trong ảnh có khớp cả hai format? “Phù hợp với” có tránh hứa hẹn phục hồi y khoa? | R1 (dịch vụ cạnh ảnh), R16 (so sánh format), R17 (mô tả lớp) |
| `/goi-tap` | Chưa có giá thì có giải thích cách gói hoạt động và dẫn đến hỏi đúng chỗ, không tạo cảm giác giấu giá? Khi có giá, số buổi/thời hạn/điều kiện phải cùng một khối. | R3 (phân cấp gói), R6 (đơn vị và hạn), R16 (gói/điều khoản) |
| `/huan-luyen-vien` | Chưa có chân dung/tiểu sử thì có tránh avatar giả và lời khen vô nguồn? Khi có hồ sơ, năng lực nào được xác minh? | R2 (hồ sơ thật), R16 (chuyên môn theo người), R17 (trang đội ngũ) |
| `/lich-tap` | Ngày/giờ/loại lớp/trạng thái có quét được trên điện thoại? Lớp hết chỗ, lỗi mạng và lịch chưa mở có câu trả lời riêng? | R7 (lịch→đặt), R8 (tìm lớp), R16 (lịch lặp vs chỗ thật) |
| `/khuyen-mai` | Offer có điều kiện, hạn, đối tượng và CTA thật? Nếu chưa có, trang có nói thẳng thay vì bán một khuyến mãi không tồn tại? | R4 (offer), R16 (điều kiện), R15 (CTA tiết chế) |
| `/lien-he` | Có cách liên hệ **đang hoạt động** và vị trí thật? Nếu dữ kiện còn thiếu, một lời báo trung thực có tốt hơn sáu dòng “đang cập nhật”? | R16 (địa chỉ/đường liên hệ), R17 (địa điểm), R15 (footer) |
| `/dat-tu-van` | Form hỏi tối thiểu, xác nhận rõ đã gửi/chưa gửi, không hứa thời gian gọi lại chưa xác nhận? Có thể hoàn thành bằng một tay ở 390px? | R5 (người mới), R16 (chuyển sang đặt), R2 (câu hỏi thường gặp) |

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
| `/studio` | Chuyển thẳng sang tổng quan đúng quyền, không nhấp nháy trang rỗng hoặc lộ dữ liệu? | R10, R19 |
| `/studio/tong-quan` | Việc chờ điểm danh/gia hạn/thanh toán và đường vào bản ghi có trước bốn số liệu? | R10, R12 |
| `/studio/lich` | 390px không tràn; desktop thử B (lưới hai ca) và C (agenda), đo việc tìm/đổi/tạo lớp cùng người trực lịch. | R20, R18 |
| `/studio/lich/:classId` | Trạng thái, người đặt, sửa/hủy và hậu quả hoàn buổi có ngay trước xác nhận? | R11, R10 |
| `/studio/khach-quan-tam` | Lead mới/chưa trả lời nổi lên; bộ lọc và thời điểm liên hệ cuối có quét được? | R12, R14 |
| `/studio/khach-quan-tam/:leadId` | Nhu cầu, nguồn, số liên hệ, lịch sử và hành động tiếp theo cùng một luồng đọc? | R12, R10 |
| `/studio/hoc-vien` | Tìm nhanh tên/số và phân biệt người trùng tên; danh sách dài còn quét được ở 390px? | R10, R19 |
| `/studio/hoc-vien/:studentId` | Gói, lịch, thanh toán và lịch sử của một người dễ tìm; `null` khác `0`; tab không giấu tác vụ? | R10, R13 |
| `/studio/huan-luyen-vien` | Tìm đúng người, lịch/phân công và trạng thái tài khoản rõ; không dùng chân dung mặc định như hồ sơ thật. | R20, R19 |
| `/studio/huan-luyen-vien/:trainerId` | Lịch dạy, lớp đã xếp, thông tin liên hệ và quyền sửa nằm đúng thứ tự công việc? | R20, R10 |
| `/studio/goi-tap` | Gói, thời hạn, số buổi, giá xác nhận và trạng thái bán/ẩn dễ so sánh? | R13, R6 |
| `/studio/thanh-toan` | Khoản chờ xác nhận nổi rõ, gắn đúng học viên/gói, lỗi nhập tiền không âm thầm bỏ qua? | R10, R13 |
| `/studio/so-buoi` | Lần cộng/trừ nào, do ai, vì sao, số dư trước/sau; `null` không thành `0`? | R13, R10 |
| `/studio/gia-han` | Ai cần liên hệ trước, vì sao, lần liên hệ gần nhất và kết quả ở cùng vùng nhìn? | R12, R10 |
| `/studio/bao-cao` | Mỗi báo cáo trả lời một câu hỏi có thật; nhãn liên kết có hứa đúng số liệu trang đích? | R14, R18 |
| `/studio/bao-cao/doanh-thu` | Ngày, phương thức thu, khoản chờ/đã xác nhận và đơn vị tiền tách bạch; export khớp bộ lọc? | R14, R19 |
| `/studio/bao-cao/lop-hoc` | Tỉ lệ lấp đầy dùng mẫu số backend có thật; trường hợp chưa có lớp không thành 0% gây hiểu sai? | R11, R18 |
| `/studio/bao-cao/huan-luyen-vien` | Chỉ báo số lớp và lượt đăng ký mà API có; **không gọi đó là tỉ lệ lấp đầy**; xuất file cùng khoảng ngày? | R11, R18 |
| `/studio/tai-khoan` | Chỉ admin thấy; tạo/sửa/vô hiệu hóa và quyền hậu quả được xác nhận? | R10, R13 |

`*` (404): phải có đường về site và không tiết lộ khu vực được bảo vệ. Tham chiếu gần nhất là điều hướng công khai R1/R2.

## 5. Thứ tự nghiên cứu và giả thuyết cho vòng thiết kế sau

1. **Bắt đầu với public site:** chụp bản gốc ở `/`, `/gioi-thieu`, `/dich-vu`, `/goi-tap` tại 1440 và 390px. Khoanh các ảnh không gắn với lời giới thiệu hoặc làm lệch trục bố cục. Thử trên giấy ba hướng hero (chia đôi, ảnh tràn khung có chủ đích, hoặc không ảnh) trước khi chọn ảnh. Chọn bằng cảm giác tin cậy của toàn trang, khả năng đọc và tác vụ kế tiếp, không chọn vì riêng ảnh đẹp.
2. **Kiểm tra các giả thuyết, chưa coi là quyết định:** ảnh reformer có thể làm bằng chứng cho trang đầu; ảnh phòng thật có thể làm bằng chứng cho `/gioi-thieu`; ảnh lặp trên `/dich-vu` có thể bỏ. So sánh lớp nhóm/lớp riêng trong một vùng nhìn có thể giúp ra quyết định. Hướng C cho danh sách lớp và dashboard, hướng B/C cho lịch nhân viên chỉ là ứng viên; bằng chứng hiện có là screenshot/fixture.
3. **Thử luồng với người thật:** cho ít nhất ba người đại diện làm các việc tìm lớp phù hợp, liên hệ studio, tìm buổi kế tiếp, hủy buổi, xử lý lead và tìm lớp cần sửa. Ghi số lần chạm, thời gian và hiểu sai theo đúng vai trò. Những phép thử liên quan đến nghiệp vụ cần dữ liệu giả có trạng thái đầy đủ.
4. **Lập kế hoạch ảnh nếu sau này chụp mới:** một khung rộng phòng gọn, chân dung từng HLV thật, một tương tác HLV chỉnh động tác có đồng ý sử dụng. Ảnh hiện tại chỉ một người/một buổi chụp; nhiều crop của cùng buổi không tự tạo cảm giác phong phú.
5. **Để giai đoạn chuẩn bị phát hành:** xác nhận tên giao dịch, địa chỉ, liên hệ, giờ mở cửa, map, gói/giá và hồ sơ HLV. Chủ đã ưu tiên nghiên cứu UI/UX lúc này, vì vậy không lấy các dữ kiện còn thiếu làm lý do dừng audit.
6. **Đo sau phát hành:** lượt xem trang → bắt đầu form → gửi thành công; khách mở lịch → tạo tài khoản/đặt lớp; tỉ lệ lỗi form; người học tìm được lớp; nhân viên xử lý lead. Không tuyên bố “tăng chuyển đổi” dựa trên screenshot.

### Buổi duyệt với chủ studio và người dùng

Đừng chỉ hỏi “đẹp chưa?”. Đưa bản mobile trước, không thuyết minh, và cho mỗi người làm một việc thật: khách mới tìm lớp nhóm phù hợp rồi gửi tư vấn; học viên tìm buổi đặt được rồi kiểm hậu quả hủy; lễ tân tìm lead mới rồi xác nhận khoản chờ; HLV mở roster lớp sắp dạy. Hỏi chủ studio ba câu riêng: “Cảnh nào đúng là cơ sở của mình?”, “Điều gì khách sẽ hiểu sai?”, “Nếu ngày mai gửi link cho khách, chỗ nào làm anh/chị ngại nhất?”. Ghi nguyên câu trả lời và vị trí dừng; sửa theo lỗi lặp lại thay vì biện hộ bằng intent của designer. Một bản chụp đẹp chỉ là ứng viên; bản được chọn phải giúp khách hiểu đúng và hoàn thành việc.

**Bằng chứng bàn giao mỗi màn hình:** ảnh 1440/390 đầu trang và toàn trang; ảnh trạng thái rỗng/lỗi/đang tải cần thiết; một phiếu review đã điền; danh sách blocker còn mở; link commit. Với public site, chủ xác nhận ảnh và sự thật kinh doanh trước phát hành. Với cổng vận hành, người trực nghiệp vụ xác nhận trạng thái và hậu quả thao tác. Gọi bản thiết kế “đạt thị giác” và “đạt phát hành” là hai quyết định khác nhau.

## 6. Phiếu review một màn hình

```text
Màn hình / vai trò / viewport / trạng thái dữ liệu:
Việc chính và bằng chứng nó hiện trong 5 giây:
Số bước đến hành động:
Ảnh (nếu có): vai trò / bằng chứng / vị trí / crop / alt:
Hai tham chiếu và điều áp dụng / không sao chép:
Ảnh/sự thật nào chủ studio đã xác nhận:
Điểm thất bại về hierarchy, layout, nội dung, tương tác, API:
Ảnh chụp trước / sau:
Kết quả 3 người thử nhiệm vụ (thời gian, lỗi hiểu sai):
Quyết định: đạt / sửa rồi chụp lại / chờ dữ kiện thật:
```
