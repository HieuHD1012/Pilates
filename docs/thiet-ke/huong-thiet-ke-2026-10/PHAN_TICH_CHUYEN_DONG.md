# Phân tích chuyển động — nên động ở đâu, đứng yên ở đâu

Ngày 03/10/2026. Câu hỏi của chủ studio: có nên thêm animation khi cuộn tới, và
liệu nó có làm trang mất vẻ sang, thành trẻ con. Cách trả lời: đọc nghiên cứu
trước, rồi xét từng cụm layout theo việc khách đang làm ở cụm đó, mới quyết định
động hay không. Mặc định là **không động**; một cụm chỉ được động khi chỉ ra
được chuyển động đó giúp khách hiểu hoặc cảm nhận điều gì.

## 1. Nghiên cứu nói gì

| Nguồn | Kết luận dùng được cho Soul |
| --- | --- |
| NN/g — *Scroll-Triggered Text Animations Delay Users* | Người dùng khó chịu khi chữ chính phải đợi cuộn tới mới hiện: "giống như trang đang tải". Chỉ dành hiệu ứng cuộn cho **nội dung phụ**, không cho thân chữ. Chỉ chạy **lần đầu** cuộn xuống. Trang thiên về tác vụ thì nên tránh. |
| NN/g — *Scroll Fading 101* | Mờ-hiện dài hơn 500ms khiến người đọc bỏ qua chữ. Nên 100–400ms. Mỗi lần chỉ một loại phần tử (chữ hoặc ảnh, không cả hai). **Tránh hẳn trên điện thoại**: lỗi khả dụng nặng hơn trên màn nhỏ. Khoảng trắng lớn + nội dung ẩn tạo "ảo giác đã hết trang". |
| NN/g — *Executing UX Animations: Duration* | Phản hồi nhỏ ~100ms, thay đổi lớn 200–300ms, đa số 100–400ms; quá 500ms là "kéo lê". Vào màn hình dùng ease-out. Càng lặp lại nhiều thì càng phải ngắn và nhẹ. |
| NN/g — *Scrolljacking 101* | Can thiệp vào tốc độ/hướng cuộn làm người dùng mất phương hướng, người đang có việc sẽ bỏ đi. |
| Apple HIG — Motion | "Đừng thêm chuyển động chỉ để có chuyển động." Ưu tiên ngắn, chính xác; không dùng chuyển động làm cách duy nhất truyền thông tin; tôn trọng Reduce Motion. |
| Material 3 — Easing & duration | Vào màn hình dùng đường cong giảm tốc; thoát nhanh hơn vào 20–30%. |
| WCAG 2.3.3 (AAA) + `prefers-reduced-motion` | Chuyển động trang trí phải tắt được; trang trí không bao giờ là "thiết yếu". Bản thân việc nội dung trôi theo tay cuộn không tính là animation. |
| DebugBear — opacity và LCP | Phần tử bắt đầu ở `opacity: 0` không được tính là đã vẽ; mờ-hiện ảnh/tiêu đề đầu trang làm chậm LCP và có thể làm điểm LCP xấu đi vì một lý do thuần trang trí. |
| Thực tế site cao cấp (Aman và các phân tích "premium motion") | Sang đến từ **sự kiềm chế**: ít thứ động, động chậm vừa phải, có chủ ý. Nếu mọi thứ đều động thì không gì nổi bật. |
| CSS scroll-driven animations (`animation-timeline: view()`) | Chạy được không cần JS ở Chrome/Edge/Safari; Firefox ổn định chưa bật mặc định → phải có `@supports` và mặc định **hiện sẵn**. |

### Rút ra cho Soul

1. **Ba loại chuyển động, ba mức cho phép.**
   - *Phản hồi* (bấm, hover, đang gửi, đã gửi): luôn nên có, 100–200ms.
   - *Liên tục* (một thứ thay đổi ngay trước mắt: chọn buổi, mở menu, thanh đặt lịch hiện lên): nên có khi nó cho biết "cái gì vừa đổi, ở đâu", 150–250ms.
   - *Xuất hiện khi cuộn* (trang trí): chỉ ở cụm kể chuyện, chỉ cho phần tử phụ, chỉ trên máy tính, chỉ một lần.
2. **Trang tác vụ không có hiệu ứng cuộn.** Khách vào Lịch tập, Gói tập, Liên hệ, Nhận tư vấn, Ưu đãi để làm một việc. Mọi mili-giây chờ chữ hiện là mili-giây cản họ.
3. **Không bao giờ động:** tiêu đề và ảnh đầu trang (LCP), giá, giờ học, trạng thái còn chỗ, nút kêu gọi, ô form, chính sách hủy/hoàn, menu.
4. **Điện thoại: không có hiệu ứng cuộn.** Chỉ giữ phản hồi và liên tục.
5. **Nội dung luôn có sẵn.** Không JS, trình duyệt cũ, hoặc bật giảm chuyển động → thấy ngay toàn bộ, không có gì kẹt ở trạng thái ẩn.

## 2. Bảng thông số (khi một cụm được phép động)

Bản đầu dùng 280–360ms theo ngưỡng 100–400ms của NN/g. Chạy thử cho thấy chủ
studio chỉ thấy "ẩn rồi hiện": ngưỡng đó dành cho nội dung người đọc phải chờ,
còn đường kẻ và ảnh ở đây không chặn ai đọc gì (chữ cạnh chúng đã hiện sẵn).
Đo trên trang: đường cong `--ease-measure` đi 70% quãng trong khoảng 100ms đầu,
và đường kẻ màu be trên nền kem chỉ đạt tương phản ~1,2:1, nên nét vẽ không
nhìn thấy được. Thông số đã sửa (03/10/2026):

| Thông số | Giá trị | Lý do |
| --- | --- | --- |
| Đường cong | `--ease-draw` = cubic-bezier(0.45, 0.05, 0.25, 1), chỉ cho hiệu ứng cuộn | Vào chậm, đi đều, lắng nhẹ: mắt theo được nét vẽ. Phản hồi thao tác vẫn dùng `--ease-measure`. |
| Đường kẻ nhãn mục | Vẽ từ trái sang trong 0,9 giây, bằng màu đồng sáng; vẽ xong mới lắng về màu be (0,6 giây) | Nét đồng đủ tương phản để thấy đang được kéo ra, rồi trả lại đúng màu hệ thống. |
| Ảnh | Hiện dần 0,8 giây; ảnh lắng từ 104% về 100% trong khung, khung đứng yên | Không trượt, không nảy. Chữ bên cạnh đã hiện sẵn nên độ chậm không chặn ai. |
| Tiêu đề (chỉ mức Đậm hơn) | Hiện dần và nhích lên 12px trong 0,5 giây | Tiêu đề là chữ chính, nên đây chỉ là phương án để so, không phải đề xuất. |
| Lệch nhịp giữa các phần tử | Không dùng | Hiệu ứng domino là dấu hiệu rõ nhất của "trẻ con". |
| Điểm kích hoạt | Khi phần tử lên tới khoảng 75% chiều cao màn hình | Diễn ở chỗ mắt đang nhìn, không ở mép dưới. |
| Đi vào trạng thái ẩn | Tức thì (transition chỉ có ở chiều hiện ra) | Cuộn nhanh không bắt gặp phần tử đang dở dang. |
| Số lần | Một lần mỗi lần tải trang | NN/g: chỉ lần đầu. |
| Điều kiện bật | Màn ≥ 1024px **và** chuột (`pointer: fine`) **và** không `prefers-reduced-motion` **và** trình duyệt hỗ trợ | Điện thoại và người nhạy chuyển động không bao giờ thấy. |
| Phần tử đã nằm trong khung nhìn lúc mở trang | Không diễn | Tránh chậm LCP và cảm giác "trang đang tải". |

## 3. Quyết định theo từng cụm — trang công khai

Ký hiệu: **Không** = đứng yên. **Phản hồi** / **Liên tục** = chuyển động theo
thao tác (mọi kích thước màn hình). **Cuộn** = xuất hiện khi cuộn tới (chỉ máy
tính, chỉ phần tử ghi rõ).

### Header, footer (mọi trang)

| Cụm | Khách đang làm gì | Quyết định | Lý do |
| --- | --- | --- | --- |
| Logo, menu 6 mục | Định hướng | **Phản hồi** — gạch chân đồng chạy ra khi hover (đã có, 200ms). Không gì khác. | Điều hướng phải đứng yên để tin được. |
| Nút "Nhận tư vấn", "Đăng nhập" | Hành động chính | **Phản hồi** — đổi màu khi hover/nhấn (đã có). | Nút động thêm (rung, phát sáng) là đúng kiểu "trẻ con" chủ studio lo. |
| Menu điện thoại | Mở danh sách trang | **Liên tục** — tấm menu hiện dần 200ms, đóng 150ms. | Cho biết lớp mới đang phủ lên trang, và đóng nhanh hơn mở. |
| Footer | Tra thông tin | **Không** | Thông tin tra cứu. |

### Trang chủ — trang duy nhất có phần kể chuyện

| Cụm | Khách hỏi | Quyết định | Lý do |
| --- | --- | --- | --- |
| Hero: tiêu đề + ảnh | "Đây là gì" | **Không** | Là LCP. Mờ-hiện ở đây làm chậm cảm nhận và điểm tốc độ. Sang = hiện ngay, chắc chắn. |
| Ba dữ kiện dưới hero | "Tập trên gì, ai dạy" | **Không** | Nằm ngay khung nhìn đầu; là dữ kiện. |
| Đường kẻ trên nhãn mục ("01 Hai hình thức tập", "02 Phương pháp"…) | — (cấu trúc) | **Cuộn** — đường kẻ vẽ từ trái sang, 360ms. Chữ nhãn đứng yên. | Đây là chữ ký "Measure": cây thước đo. Không che chữ nào, không ai phải đợi. Đây là chuyển động duy nhất lặp lại trên trang chủ. |
| Thẻ hình thức lớp (tên + 1:3 + checklist) | "Nhóm hay riêng hợp với tôi" | **Không** | Bản đang chạy không có ảnh trong thẻ; toàn bộ là chữ chính. Không thêm ảnh chỉ để có chỗ động. |
| Phương pháp (ảnh tràn trái + 3 ghi chú) | "Họ dạy thế nào" | **Cuộn** — chỉ **ảnh tràn lề** mờ-hiện 280ms. | Ảnh tràn lề là khoảnh khắc "không khí" của trang; chữ phương pháp là nội dung chính, đứng yên. |
| Lịch 7 ngày tới | "Gần đây có lớp lúc nào" | **Không** | Thông tin tác vụ (giờ, còn chỗ). |
| Bốn bước bắt đầu | "Tôi phải làm gì" | **Không** | Đã cân nhắc cho chạy lần lượt để nhấn "thứ tự", nhưng đó là thân chữ chính và là hiệu ứng domino. Số thứ tự 1–4 đã nói thứ tự. |
| Form cuối trang | "Để lại số" | **Phản hồi** — vạch "đang gửi" (đã có); khi gửi xong, khối form chuyển sang lời cảm ơn bằng mờ-chéo 200ms. | Xác nhận rằng việc đã xong — chuyển động có thông tin. |

### Trang tác vụ — không có hiệu ứng cuộn

| Trang / cụm | Quyết định | Lý do |
| --- | --- | --- |
| **Lịch tập** — công tắc hình thức, dải 14 ngày | **Phản hồi** — nền ô chọn đổi màu 200ms (đã có). | Lọc là tác vụ, phải tức thì. |
| Lịch tập — danh sách buổi khi đổi ngày | **Liên tục** — danh sách mới mờ-hiện 150ms. | Nếu đổi tức thì, hai ngày có lịch giống nhau trông như "không có gì xảy ra". 150ms đủ để mắt thấy đã đổi, không đủ để thấy chờ. |
| Lịch tập — thẻ buổi được chọn | **Phản hồi** — viền và nền đổi 200ms (đã có). | |
| Lịch tập — khung "Buổi bạn chọn" (máy tính) | **Không** | Nội dung đổi tại chỗ; chuyển động thêm sẽ lôi mắt khỏi danh sách đang chọn. |
| Lịch tập — thanh đặt lịch dính đáy (điện thoại) | **Liên tục** — trượt lên 220ms khi lần đầu chọn buổi. | Đây là thứ mới xuất hiện ở mép màn hình; không có chuyển động, khách dễ không nhận ra nút tiếp theo đã có. |
| **Gói tập** — bảng giá, điều nên biết | **Không** | Giá và điều kiện là thứ khách so sánh; bất kỳ độ trễ nào đều cản so sánh. |
| **Hình thức tập** — ảnh, bảng so sánh | **Không** | Trang so sánh. Ảnh đã có chỗ dành sẵn nên không giật. |
| **Studio** — ảnh phòng, ba nguyên tắc | **Không**, trừ đường kẻ nhãn mục như trang chủ | Ảnh phòng là LCP. |
| **Huấn luyện viên** — thẻ chân dung | **Không** | Gương mặt và tên là thông tin chính; hiệu ứng lần lượt trên lưới chân dung là mẫu "template" nhất. |
| **Liên hệ**, **Ưu đãi** | **Không** | Tra cứu. |
| **Nhận tư vấn**, **Đăng nhập** | **Phản hồi** — vạch đang gửi, lỗi hiện tại chỗ, nút hiện/ẩn mật khẩu. | Form. |

## 4. Khu học viên, huấn luyện viên, studio

Không có hiệu ứng cuộn ở bất cứ đâu (Reference Lock: "bề mặt vận hành phản hồi
ngay và tránh đường"). Chỉ giữ:

- Hộp thoại hiện lên 200–240ms (đã có).
- Menu ⋯ ở cuối hàng hiện dần 120ms, đóng tức thì.
- Vạch "đang xử lý" trên nút (đã có).
- Con số đổi sau khi lưu (ví dụ số buổi sau điều chỉnh) **không** đếm chạy: nhảy thẳng sang số mới. Số đếm chạy là trang trí và có thể đọc nhầm giữa chừng.

## 5. Những thứ cố ý không làm, dù phổ biến

| Hiệu ứng | Vì sao không |
| --- | --- |
| Parallax ảnh, chữ trượt theo chuột | Reference Lock cấm; gây chóng mặt; NN/g ghi nhận làm người dùng mất phương hướng. |
| Chữ hiện từng từ / từng dòng | Thân chữ phải đọc được ngay (NN/g). Với tiếng Việt, cắt chữ còn dễ làm vỡ dấu. |
| Phóng to ảnh khi hover | Ảnh không bấm được thì không nên giả vờ bấm được. |
| Số đếm chạy (0 → 1.500.000) | Giá là cam kết, không phải màn trình diễn. |
| Chuyển trang có hiệu ứng | Trang công khai được dựng sẵn để mở nhanh; hiệu ứng chuyển trang làm mất chính lợi thế đó. |
| Con trỏ tùy biến, nút "từ tính" | Đúng thứ làm trang trông như template agency, không phải studio. |

## 6. Cách làm (khi được duyệt)

- Bật bằng một lớp trên `<html>` do JS thêm khi đủ điều kiện ở mục 2; CSS chỉ ẩn
  phần tử khi có lớp đó, nên mặc định mọi thứ hiện sẵn.
- Phần tử đã nằm trong khung nhìn lúc mở trang được đánh dấu "đã diễn" ngay,
  không ẩn.
- Một thuộc tính duy nhất trong JSX (`data-reveal="rule"` / `data-reveal="image"`),
  đặt đúng ở các cụm ghi **Cuộn** trong bảng trên: đường kẻ nhãn mục (trang chủ,
  Studio) và ảnh Phương pháp. Không có chỗ nào khác.
- Kiểm tra: không thay đổi LCP và CLS trước/sau; bật "giảm chuyển động" thì
  không thấy gì động; tắt JS thì thấy đủ nội dung.

## Nguồn

- [NN/g — Scroll-Triggered Text Animations Delay Users](https://www.nngroup.com/articles/scroll-animations/)
- [NN/g — Scroll Fading 101](https://www.nngroup.com/articles/scroll-fading-101/)
- [NN/g — Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/)
- [NN/g — Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/)
- [Apple Human Interface Guidelines — Motion](https://developers.apple.com/design/human-interface-guidelines/foundations/motion)
- [Material 3 easing và duration (tóm tắt)](https://note.com/pajero/n/n9a5f2393f30e?hl=en)
- [W3C — Technique C39: prefers-reduced-motion](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html)
- [Deque — WCAG 2.3.3 Animation from Interactions](https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions)
- [DebugBear — How CSS Opacity Animations Can Delay LCP](https://www.debugbear.com/blog/opacity-animation-poor-lcp)
- [Josh W. Comeau — Scroll-Driven Animations](https://www.joshwcomeau.com/animation/scroll-driven-animations/)
- [Aphyx — Premium Website Animations: What Actually Makes a Site Feel Expensive](https://aphyx.live/blog/premium-website-animations)
- [TYPZA — Minimalist luxury websites (Aman)](https://www.typza.com/blog/10-minimalist-luxury-websites)

## 7. Quyết định (03/10/2026)

Chủ studio so bốn mức trên web (Không, Tiết chế, Đậm hơn, Chậm hơn nữa) và chọn
**Tiết chế**. Bảng công tắc và các mức khác đã gỡ khỏi code.

Đang chạy:

- Hiệu ứng cuộn (trang chủ và Studio, máy tính có chuột): đường kẻ nhãn mục vẽ
  0,9 giây bằng màu đồng sáng rồi lắng về màu be; ảnh Phương pháp hiện và lắng
  từ 104% về 100% trong 0,8 giây. Ảnh kích hoạt khi vào màn hình 10%, đường kẻ
  khi vào 15%.
- Chuyển động theo thao tác (mọi cỡ màn hình): danh sách Lịch tập đổi ngày
  mờ-hiện 150ms; thanh "buổi bạn chọn" trên điện thoại trượt lên 220ms; form gửi
  xong chuyển sang lời cảm ơn 200ms; menu điện thoại mở 200ms, đóng tức thì.
- Tiêu đề và mọi chữ khác luôn hiện sẵn.
