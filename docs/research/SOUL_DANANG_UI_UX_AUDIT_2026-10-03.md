# Soul Đà Nẵng → Nha Trang: audit UI/UX từ chi tiết đến hành trình

**Ngày quan sát:** 03/10/2026 · **Nhánh nghiên cứu:** `codex/soul-ui-audit` · **Baseline so sánh:** `main` tại `9d64fb3` (không phải working tree `ui/warm-measure` của Claude).

**Phạm vi:** website công khai [Soul Đà Nẵng](https://soulpilates.com.vn/), trang [booking](https://soulpilates.com.vn/booking/) và [packages](https://soulpilates.com.vn/packages/); các route công khai của Nha Trang trong `src_FE/app/routes/public/`. Quan sát trực tiếp khoảng 1264×720 và 390×844; giá/lịch là dữ liệu động nên ví dụ thấy hôm nay không phải thông số thiết kế cố định. Đây là heuristic audit, chưa có user testing hay số liệu chuyển đổi.

## Kết luận thiết kế

Soul Đà Nẵng **mạnh ở cảm giác cơ sở có thật**: ảnh phòng ngay trong hero, màu ấm xuyên suốt, bằng chứng không gian/lớp học, bảng giá có cấu trúc và đường đi tới booking rõ. Baseline Nha Trang **mạnh ở sự chính xác nghiệp vụ và cấu trúc nhiều trang**, nhưng khung ảnh trống, thông tin địa điểm/liên hệ còn thiếu, gói và lịch cần dữ liệu thật. Khoảng cách chính là **proof** và **độ rõ ở điểm quyết định**, không phải thêm gradient, card hoặc ảnh cho mọi trang.

Không sao chép nguyên site Đà Nẵng. Hai cơ sở khác phòng, người, dịch vụ và luồng: Soul Đà Nẵng dẫn khách vào booking/mua online; repo Nha Trang dẫn khách mới tới form yêu cầu studio liên hệ. Tên thương hiệu Nha Trang còn chưa được chủ xác nhận (Soul/J). Theo quyết định mới của người dùng, prototype được dùng sáu ảnh trong `ui/image-language:src_FE/public/images/concept/` để duyệt bố cục, ghi rõ là minh họa, rồi thay bằng ảnh thật trước khi public. Hướng dẫn cũ “không AI image” trong `src_FE/docs/REFERENCE_LOCK.md` cần được đối chiếu với quyết định này; nó không chặn bản prototype đã được người dùng yêu cầu. Audit này không sửa UI Claude đang làm.

## 1. Từ các thành phần nhỏ

| Thành phần | Soul Đà Nẵng đang làm | Baseline Nha Trang | Đánh giá và nguyên tắc chuyển hóa |
| --- | --- | --- | --- |
| Nền, accent, độ tương phản | Kem/trắng, peach, copper, nâu rất đậm; cam dẫn mắt vào hành động. Bảng giá là một trường nâu riêng. | Nền sand và ink rất tiết chế; lacquer đỏ là accent. | Giữ **nhiệt độ ấm** và tương phản mạnh. Chủ thích be/cam/nâu; đã có bảng màu được đo trong `src_FE/docs/reference-variants/SOUL_THEME_TRANSFER.md` ở nhánh nghiên cứu trước. Dùng copper sáng cho nhấn lớn; chữ nhỏ và nút cần màu đậm hơn để đọc được. Không chuyển toàn bộ sang các gradient/card cam. |
| Typography | Hero serif đậm, rất lớn; body Inter/Syne, heading app sans. English-first dễ đặt chữ nhưng không phản ánh ngôn ngữ Nha Trang. | Newsreader + Be Vietnam Pro hỗ trợ tiếng Việt, scale editorial và số tabular. | Soul thắng về first impression; ta thắng về hệ chữ cho tiếng Việt và dữ liệu. Có thể tăng tính hiện diện của headline nhưng kiểm tra dấu, line break, khoảng dòng 390px. Không bê font/numeral của Soul qua. |
| Header & navigation | Trang chủ có 5 anchor và `BOOK NOW` nổi bật; app có nav riêng, mobile bottom nav. Header dính khi cuộn. | Nhiều route thật: Studio, hình thức, gói, HLV, lịch, liên hệ; header có đăng nhập và CTA ở các route con. | Cấu trúc nhiều trang của ta đúng với sản phẩm phức tạp hơn. Giữ danh mục ngắn và CTA theo mục đích. Trên Soul mobile, chọn một mục anchor khi menu đang mở đã cuộn trang nhưng menu vẫn phủ màn hình trong lần quan sát; đây là lỗi interaction cần tránh. |
| Nút & CTA | Cam bo tròn, rõ hit area. `BOOK NOW` lặp ở header/hero; hai thẻ dịch vụ có CTA riêng. | Nút góc nhỏ, text action và CTA tư vấn. Hero có một CTA chính + xem lịch. | Copy quan trọng hơn shape. “Đặt lịch tư vấn” của ta dẫn đến form **gửi thông tin, không chọn lịch hẹn**; đổi sang “Nhận tư vấn” hoặc “Để studio liên hệ” sau khi owner duyệt copy. Soul có thể nói “Book” vì site của họ có booking. |
| Ảnh & crop | Ảnh phòng thật full-bleed trong hero; collage không gian/thiết bị trong “Why Soul”; 8 ảnh gallery. Hero dùng lớp tối để chữ đọc được nhưng làm phòng thành nền texture. | `main` có art-directed slots `src:null`; hero split sẵn trong code nhưng ảnh trống. | Đây là khoảng cách thị giác lớn nhất. Dùng ảnh concept cho prototype, đặc biệt hero/coaching, room/group/private; kiểm tra crop khi thay ảnh thật. Ảnh phải trả lời một câu hỏi của khách. Không kéo 8 ảnh vào gallery chỉ vì Soul có 8 ảnh. |
| Trust signals | Dải Google Reviews 5.0 dưới hero, ảnh người/phòng, địa chỉ/map/giờ ở cuối. Dải rating trong lần quan sát không cho thấy liên kết kiểm chứng trực tiếp. | Chưa có review/địa chỉ/phone/giờ được xác nhận; các mục để “Đang cập nhật”. | Ảnh thật, địa chỉ, hướng đi, trainer thật là trust mạnh hơn một rating tự ghi. Chỉ hiện review khi có nguồn, quyền dùng và link xác minh. Đừng sao chép rating/địa chỉ của Đà Nẵng. |
| Cards & rules | 4 benefit cards gradient, 4 “Why Soul” cards, 3 milestone panels, 2 service cards, 4 price cards. Dễ scan nhưng tạo nhịp card lặp. | Rules/hairlines và bảng rõ cấu trúc; ít trang trí. | Dùng card khi người dùng **chọn hoặc so sánh** (Group/Private, gói). Dùng rule cho trình tự, điều khoản, lịch. Mỗi section không cần một card family mới. |
| Disclosure & state | Booking có skeleton, badge level, còn chỗ, detail và chính sách ngay sát nút. Trang gói có bộ lọc và giá tổng/giá mỗi buổi. | Empty/loading/error states đã có; public schedule chỉ trả `is_full`, giá có thể `null`. | Học cách làm rõ trạng thái và hậu quả của action. Không hiển thị số chỗ hay giá nếu backend Nha Trang chưa cung cấp. Đặt thông tin “còn/hết chỗ”, gói cần dùng, hoàn/hủy gần CTA khi có dữ liệu. |

## 2. Trang chủ Soul: section nào hợp lý, section nào không

| Section Soul | Nhiệm vụ và điều làm tốt | Điểm yếu quan sát được | Bài học cho Nha Trang |
| --- | --- | --- | --- |
| Hero | Một ảnh phòng thật, headline, nút đặt; khách hiểu ngay đây là studio reformer có không gian thật. Mobile giữ chủ thể và CTA trong màn đầu. | Overlay tối làm mất nhiều chất liệu ảnh; headline “Therapy for your Soul” đẹp nhưng chưa nói cụ thể Group/Private. | Giữ **liên hệ chặt giữa proposition, ảnh và CTA**. Prototype có thể dùng split hero với `hero-coaching.webp`; câu chữ của ta hiện cụ thể hơn. Đừng để ảnh rơi thành section vô cớ dưới copy. |
| Google Reviews strip | Đặt tín hiệu tin cậy ngay sau hero, đúng vị trí khách đang quyết định đọc tiếp. | Rating tự hiển thị mà chưa thấy đường kiểm chứng ngay tại strip; copy lặp “5.0 / 5 Stars”. | Khi có review thật, dẫn tới nguồn. Khi chưa có, ưu tiên ảnh thật/địa chỉ/HLV. |
| Why Pilates? | Bốn lợi ích với icon và màu khác nhau giúp scan nhanh. | Copy dài, nhiều khẳng định sức khỏe mạnh; trên 390px 4 card xếp dọc chiếm ~1.9k px. | Chỉ chọn 2–3 lợi ích liên quan quyết định đi tập; câu ngắn, không hứa phục hồi/chuyển đổi cơ thể khi thiếu bằng chứng. |
| Why Soul? | Điểm mạnh nhất sau hero: text cards và ba ảnh phòng/thiết bị cùng một vùng bố cục; ảnh chứng minh “ở đây trông như thế nào”. | Các nhãn “Expect”, “Diverse”, “We’re Different” hơi chung; một số ý không gắn bằng chứng cụ thể. | Trang Studio Nha Trang cần một ảnh phòng rộng thật + một chi tiết coaching/thiết bị; mỗi ảnh đứng cạnh một thông tin mà nó chứng minh. |
| Journey 5/10/20 | Có ý định hướng dẫn khách mới hình dung tiến trình, dùng số lớn dễ nhớ. | Rất dài (~2.1k px mobile). “You will be transformed” và kết quả thể chất theo số buổi là lời hứa mạnh, không phù hợp để bê sang. | Giữ **journey thực tế** của ta: gửi thông tin → studio liên hệ → chọn gói/lịch → tự đặt khi đủ điều kiện. Rút ngắn để khách biết bước tiếp theo, không dự báo cơ thể. |
| Group/Private | Hai lựa chọn đặt cạnh nhau trên desktop; mô tả, “best for”, CTA riêng. “Không chắc?” có kênh trợ giúp. | Card nhiều chữ, chiếm ~1.8k px mobile; chi tiết 1:3, Cadillac, drop-in thuộc Đà Nẵng. | Trang hình thức tập Nha Trang cần một màn so sánh nhanh: khác nhau ở mức hướng dẫn, hợp với ai, rồi CTA nhận tư vấn. Dùng ảnh group và private như **chứng cứ về hai trải nghiệm**, không như poster. |
| Pricing | Nền nâu làm section thành điểm quyết định; tab Group/Private; mỗi gói có tổng giá và giá/buổi, gói nổi bật. | Nhiều badge “SAVE”/quà tặng dễ chuyển trọng tâm từ chất lượng huấn luyện sang sale. Dữ liệu giá được tải động, trạng thái lỗi cũng có thể xuất hiện. | Nếu chủ cung cấp giá, đưa **giá, số buổi, hạn, loại lớp** lên gần đầu trang gói và cho so sánh rõ. Nếu không có giá, CTA hỏi giá kèm ngữ cảnh gói, không dựng con số demo. |
| Gallery | Ảnh thật cho thấy phòng, người tập, thiết bị và sinh hoạt; tăng cảm giác nơi này tồn tại. | 8 ảnh + caption dài (~3.65k px mobile) làm trang dài; caption cảm tính không giải thích thêm. | Chọn 3–5 ảnh khác vai trò, crop nhất quán; bỏ caption kiểu tài liệu dưới từng ảnh. Bản prototype chỉ ghi một disclosure “ảnh minh họa”. |
| Visit + footer | Địa chỉ, bản đồ, giờ và social khép lại journey bằng thông tin đi được. | Đặt khá sâu sau gallery; khách muốn biết vị trí sớm có thể phải cuộn nhiều. | Địa chỉ/map/kênh liên hệ của Nha Trang là **P0 dữ liệu**, nên nằm dễ tìm ở nav/footer và trang Liên hệ khi được xác nhận. |

**Độ dài quan sát:** trang chủ Soul khoảng 8.5k px desktop và 14.9k px mobile ở phiên kiểm tra. Con số này chỉ mô tả phiên render đã xem; bài học là cắt bớt lặp lại và đưa quyết định lên sớm, không tối ưu theo một chiều cao tuyệt đối.

## 3. Các trang giao dịch và hành trình

### Booking Soul Đà Nẵng

- Sau `BOOK NOW`, người dùng đến lịch. Trên mobile: chọn Group/Private → ngày dạng rail ngang → level → class card (giờ, tên, HLV, duration, spot status) → chi tiết lớp → nút `Book This Class` và chính sách hủy nằm ngay dưới. Đây là **information hierarchy rất tốt** cho người đã sẵn sàng đặt.
- Pop-up “FREE Grip Socks” xuất hiện phủ gần toàn màn hình ngay sau khi lịch tải trong lần quan sát. Nó chặn tác vụ chính và tạo cảm giác khuyến mại trước khi người dùng hiểu lớp; không nên mượn. Sau khi đóng, lịch dễ scan.
- Booking có bottom navigation, khác visual density trang marketing nhưng vẫn dùng logo/cam. Nha Trang có application thực; cần cùng nhận diện nhưng **không** đưa hero/editorial vào lịch/booking.
- Soul có số chỗ, class level, Mat/Duo, waitlist và checkout theo hệ riêng. API Nha Trang public chỉ trả `is_full`; không thêm controls hay dữ liệu vì thấy Soul có.

### Packages Soul Đà Nẵng

- Headline trả lời giá trị gói, filter format, card có giá tổng lẫn giá/buổi và nội dung gói. Mobile có bottom nav dẫn qua Booking/Buy/My Bookings.
- Tính dễ so sánh đáng học. Baseline Nha Trang đặt bốn đoạn giải thích cơ chế gói **trước** bảng giá; khách chỉ muốn biết giá có thể thấy nhiều chữ mà chưa thấy quyết định. Đề xuất đưa bảng gói thật và lời giải thích ngắn lên trước; các rule chi tiết xuống dưới hoặc disclosure. Phụ thuộc dữ liệu được owner nhập/duyệt.
- Nha Trang không có checkout công khai. Giữ CTA tư vấn; khi chuyển từ một gói sang form, mang theo tên gói/loại lớp nếu backend và chính sách dữ liệu cho phép.

### Khách mới của Nha Trang

`main` có form tư vấn dễ hiểu: tên, số điện thoại, lựa chọn hình thức/nội dung tùy chọn, và mô tả ba bước “sau khi gửi”. Đây là lợi thế so với đưa mọi người thẳng vào lịch đăng nhập. Nhưng nhãn CTA “Đặt lịch tư vấn” dễ làm khách tưởng sẽ chọn giờ. Cần nói rõ **gửi yêu cầu → studio liên hệ**, và có thể cho khách xem lịch/gói trước mà không bị đẩy vào login.

## 4. So sánh từng màn hình Nha Trang với bài học Soul

| Màn hình Nha Trang (`main`) | Giữ | Nâng cấp sau audit | Không chuyển từ Soul |
| --- | --- | --- | --- |
| Home `/` | Proposition tiếng Việt rõ, luồng Group/Private → phương pháp → lịch → cách bắt đầu → tư vấn. | Dùng concept hero/coaching trong cùng composition; giữ CTA rõ; thêm proof thực khi có. Xem lại chiều cao/nhịp sau khi ảnh vào. | Hero copy mơ hồ, review giả, 4+4 card lợi ích, 20-class transformation. |
| Studio `/gioi-thieu` | Trang riêng cho trải nghiệm không gian. | Phải có ảnh phòng thật/cảnh đến nơi, thông tin thực tế về thiết bị, lối đi, ánh sáng; concept chỉ để dựng bố cục. | Ảnh phòng Đà Nẵng hoặc tiện ích chưa xác nhận. |
| Hình thức `/dich-vu` | Hai loại Group/Private và “phù hợp với ai”. | Đưa so sánh ngắn, ảnh lớp nhóm vs một kèm một, CTA nhận tư vấn ở đúng thời điểm chọn. Xác nhận chính sách hủy trước khi in. | 1:3, Cadillac, Duo, trial/drop-in của Đà Nẵng. |
| Gói `/goi-tap` | Không bịa giá; số buổi/thời hạn đúng domain. | Ưu tiên danh sách gói thật trước văn bản dài; format/giá/hạn rõ; form giữ ngữ cảnh gói đã xem. | Stripe, buy now, “SAVE %”, quà tặng chưa duyệt. |
| HLV `/huan-luyen-vien` | Chỉ hiện hồ sơ public được duyệt. | Ảnh chân dung thật, tên/bio và coaching có bằng chứng; nếu chưa có, giữ trạng thái rỗng tử tế. | Người trong ảnh AI như HLV có thật; profile Đà Nẵng. |
| Lịch `/lich-tap` | Có view lịch công khai và trạng thái còn/hết chỗ. | Làm rõ date selection, class type, trạng thái, đường “mới đến → nhận tư vấn” và “đã có gói → đăng nhập”. | Số chỗ, level, Mat/Duo, waitlist khi API không hỗ trợ. |
| Liên hệ `/lien-he` | Form lead là đường chính. | Bổ sung địa chỉ, map, giờ, phone/Zalo đúng Nha Trang khi chủ cung cấp; nếu chưa có chỉ dùng thông tin được xác nhận, đừng để nhiều hàng “Đang cập nhật” áp đảo. | Địa chỉ và social Soul Đà Nẵng. |
| Tư vấn `/dat-tu-van` | Ít trường bắt buộc, “sau khi gửi” dễ hiểu. | Đổi tên action chính xác; thông báo gửi thành công và bước tiếp theo nhất quán; cho form nhận ngữ cảnh gói/lớp. | Buộc tạo tài khoản, modal khuyến mại chặn form. |
| Login/student/staff | Mật độ và chức năng riêng, không nhét marketing hero. | Duy trì token thương hiệu và clarity của state/consequence như booking Soul. | Trang chủ một page, card/gradient marketing vào màn tác vụ. |

## 5. Best practice dùng làm tiêu chí, không làm phong cách mặc định

1. **Một bước, một kết quả rõ.** Nhãn CTA phải khớp kết quả thật: form yêu cầu gọi lại ≠ lịch hẹn đã đặt; lớp còn chỗ ≠ quyền đặt được khi chưa có gói. Đây là “match with the real world” và “visibility of system status” trong [NN/g heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).
2. **Đưa chứng cứ gần lời hứa.** “Có người theo sát” → ảnh một người đang chỉnh tư thế; “phòng tập” → ảnh phòng thật; “lớp nhóm nhỏ” → ảnh nhóm thật. Ảnh mood không được thay chứng cứ. Nếu ảnh không nói thêm điều gì, bỏ.
3. **So sánh theo thuộc tính khách chọn.** Với lớp: độ kèm riêng, đối tượng phù hợp, quy mô đã xác nhận, đường bắt đầu. Với gói: loại, buổi, hạn, giá thật. Badge/sale chỉ khi đó là thông tin kinh doanh đã duyệt. [Nghiên cứu Baymard về scannability và filtering](https://baymard.com/blog/product-listing-page-plp-ux) là tham khảo cho màn gói nhiều lựa chọn; đây là suy luận ứng dụng từ e-commerce, cần kiểm chứng với khách studio.
4. **Phản hồi loading/error/empty phải chỉ đường tiếp.** Soul booking có skeleton và class state; ta đã có nhiều QueryBoundary/EmptyState, nhưng cần kiểm tra màn thực tế cho biết khách làm gì khi lịch/gói trống. [NN/g: visibility of system status](https://www.nngroup.com/articles/ten-usability-heuristics/).
5. **Màn mobile là composition riêng.** Hero phải còn chủ thể + CTA; ảnh group/private phải phân biệt được; menu mở phải đóng sau chọn; các rail ngang cần dấu hiệu còn nội dung bên phải. Nút/chip cần vùng chạm hoặc khoảng cách đủ theo [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).
6. **Form phải có nhãn, lỗi và kết quả rõ.** Giữ label thường trực, lỗi cụ thể, xác nhận thành công và bước tiếp theo; theo [W3C Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions) và [Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification).
7. **Tin cậy là dữ kiện có thể kiểm tra.** Ảnh studio, địa chỉ/map, HLV, chính sách, lịch/giá thật. Không dùng ảnh concept, review, claim y tế hoặc thông tin Đà Nẵng như bằng chứng cho Nha Trang. Ảnh minh họa chỉ là dụng cụ duyệt bố cục.

## 6. Thứ tự triển khai cho Claude / chủ cơ sở

| Ưu tiên | Việc | Điều kiện hoàn thành |
| --- | --- | --- |
| P0 | Home: hero + ảnh concept tạo cùng composition, rà lại nhịp full page | 1440/1024/768/390, CTA và chủ thể còn đọc được; ảnh không như một khối chèn. |
| P0 | Xác nhận tên thương hiệu, địa chỉ/map, giờ, phone/Zalo, quy mô lớp, chính sách hủy | Các thông tin được owner duyệt; không mang dữ kiện Đà Nẵng sang. |
| P0 | Studio + dịch vụ: ảnh có vai trò chứng minh phòng/coaching/Group/Private | Mỗi ảnh có role, reason, vị trí, crop, replacement shot. |
| P1 | Gói và lịch: đưa dữ liệu quyết định lên đầu, tối ưu empty/error và CTA cho khách mới | Không có giá/slot bịa, không làm mất chức năng đã có. |
| P1 | Tư vấn: sửa nhãn action và truyền ngữ cảnh lớp/gói | Người gửi hiểu rõ chưa đặt được giờ; lead nhận được ngữ cảnh khi backend hỗ trợ. |
| P1 | Photo shoot brief từ 6 concept assets | Chụp đúng người/phòng thực, ảnh đủ resolution/crop; kiểm tra thay ảnh ở 4 viewport. |
| P2 | Review/testimonial nếu chủ có nguồn thật; tinh chỉnh nội dung lợi ích | Link kiểm chứng/permission; bỏ lời hứa kết quả thể chất không có bằng chứng. |

## 7. Quy trình kiểm từng màn hình

1. **Question:** người mở màn này đang muốn biết/chọn/làm gì? Một màn có một đối tượng chính.
2. **First viewport:** trong 5 giây đầu, khách nhìn thấy lời hứa cụ thể, bằng chứng liên quan và đường tiếp theo chưa? Với màn tác vụ, thấy trạng thái và action chưa?
3. **Image audit:** role, lý do, vị trí, kích thước, quan hệ với text, crop desktop/mobile, shot thật thay thế. Không hợp lý thì bỏ.
4. **Decision audit:** có đủ thông tin trước CTA không? Bấm CTA sẽ đến đúng điều nó hứa không? Login hay form có xuất hiện quá sớm không?
5. **State audit:** loading/error/empty/success và dữ liệu thiếu có đường tiếp theo rõ không? Không nhầm demo với thật.
6. **Visual flow:** screenshot toàn trang 1440 và 390; nhìn thứ tự thông tin, nhịp đặc/rỗng, grid và ảnh. Sau đó kiểm 1024/768 cho crop và wrap.
7. **Trust audit:** tên, người, phòng, địa chỉ, giá, lịch, review và claim nào đã được chủ xác nhận? Concept chỉ được gọi là minh họa.
8. **Usability:** dùng menu bằng chạm/bàn phím, tab qua form/filter, thử lỗi form, kiểm vùng chạm, thứ tự focus và độ tương phản.

## Nguồn và giới hạn

- Trang nguồn: [Soul home](https://soulpilates.com.vn/), [booking](https://soulpilates.com.vn/booking/), [packages](https://soulpilates.com.vn/packages/). Quan sát trực tiếp ngày 03/10/2026; giá, ưu đãi, lịch, rating và ảnh có thể đổi.
- Baseline repo: `src_FE/app/routes/public/`, `src_FE/app/content/photography.ts`, `src_FE/docs/DESIGN_SYSTEM.md`, `src_FE/docs/REFERENCE_LOCK.md`, `SOUL_BUSINESS_AUDIT.md` (ở nhánh `ref/comparison`, chưa có trong `main`).
- [NN/g heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [W3C WCAG 2.2 Understanding](https://www.w3.org/WAI/WCAG22/Understanding/), [Baymard product listing research](https://baymard.com/blog/product-listing-page-plp-ux). Đây là tiêu chí kiểm, không phải bằng chứng Soul/Nha Trang có conversion tốt/xấu.
- Chưa kiểm thử với khách hàng thật, chưa đo Core Web Vitals, SEO, analytics, đọc bằng screen reader, hoặc mọi trạng thái xác thực của Soul. Nhận định thẩm mỹ là đánh giá chuyên môn dựa trên màn đã xem, không phải kết quả A/B test.
