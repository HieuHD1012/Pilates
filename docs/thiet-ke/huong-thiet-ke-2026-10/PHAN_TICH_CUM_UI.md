# Phân tích từng cụm UI — trang công khai

Ngày 03/10/2026 · nhánh `codex/ui-cluster-audit`

Mỗi cụm được hỏi bốn câu:

1. **Cụm này để làm gì?** Khách đang hỏi câu gì khi nhìn vào nó?
2. **Mắt đọc nó theo đường nào?**
3. **Đường đọc đó có đúng best practice không?**
4. **Đã sửa thế nào?**

## Nguyên tắc dùng để chấm

| Mẫu bố cục | Dùng khi | Không dùng khi |
| --- | --- | --- |
| **Xếp chồng** (nhãn trên, giá trị dưới) | Thông tin dạng "nhãn – giá trị" đọc riêng từng cái: địa chỉ, giờ, chi tiết một buổi. Mắt đi một đường thẳng xuống, nhãn và giá trị không bao giờ rời nhau. | — |
| **Thẻ** (đọc dọc trong thẻ, so ngang giữa các thẻ) | So sánh vài lựa chọn cùng loại: gói giá, hình thức lớp, huấn luyện viên. Mỗi thẻ là một quyết định trọn vẹn; cùng một loại thông tin nằm ở cùng độ cao trên mọi thẻ. | Chỉ có một thứ để xem. |
| **Bảng** (cột thuộc tính, cột lựa chọn) | So sánh 2–4 lựa chọn theo nhiều tiêu chí, và chỉ những tiêu chí khác nhau. | Hai ô trong một hàng giống hệt nhau, hoặc dữ liệu chỉ có một cột giá trị. |
| **Hàng ngang nhãn trái, giá trị phải** | Bảng đối soát thực sự có tiêu đề cột, các bản ghi đồng nhất và cần so sánh xuống cột. Cặp ngắn có thể đứng cùng hàng nếu vẫn tạo thành một nhóm rõ. | Không có ngưỡng 120px được nghiên cứu nào ở đây chứng minh. Xét quan hệ gần–xa, độ dài nội dung, khả năng nhận đúng hàng và nhu cầu so sánh của người dùng. Không kéo một cặp thông tin đơn lẻ ra hai mép trang. |
| **Cột trạng thái bên phải** | Danh sách mà mỗi hàng là một hành động (mũi tên, nút). Biểu tượng hành động thuộc về cả hàng, đặt ở mép là đúng. | Thông tin dùng để quyết định (còn chỗ hay không) mà bị tách khỏi đối tượng nó mô tả. |

## Header và footer (mọi trang)

| Cụm | Ý nghĩa | Đường đọc trước | Đánh giá | Sau khi sửa |
| --- | --- | --- | --- | --- |
| Logo | "Tôi đang ở đâu" | Chữ SOUL mảnh 17px, gạch nối lệch xuống dưới | Yếu, thua cả menu | 22px, gạch nối căn giữa |
| Menu 6 mục | "Có những trang nào" | Ngang, 13px | Đúng mẫu menu chính, nhưng chữ nhỏ | 15px từ 1280px; 1024px giữ 13px để vừa |
| Đăng nhập + Nhận tư vấn | Hai lối đi cho hai loại khách | Phải header | Đúng: lối chính có màu, lối phụ là link | Giữ; ẩn nút ở những trang chính nó đã là lời mời |
| Footer "Đến studio" | Địa chỉ, điện thoại, giờ | Hàng ngang: nhãn rộng 80px, giá trị bên phải | Hàng ngang nhãn–giá trị | Xếp chồng nhãn trên giá trị; giờ mở cửa ngắt đúng chỗ "ngày / giờ" |
| Dòng cuối footer | Bản quyền, ghi chú ảnh | 11px, giãn chữ | Khó đọc | 12px, không giãn |

## Trang chủ

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Hero: tiêu đề + ảnh | "Đây là gì, có cho tôi không" | Chữ trái, ảnh phải, chung mép | Đúng | Giữ |
| Ba dữ kiện dưới hero | "Tập trên gì, mấy hình thức, ai dạy" | Desktop 3 cột (nhãn trên); mobile hàng ngang nhãn 96px | Mobile sai mẫu | Xếp chồng ở mọi cỡ màn hình |
| Thẻ hình thức lớp | "Nhóm hay riêng hợp với tôi" | Nhãn "Group" trái, "1:3" tít phải; danh sách "phù hợp với" là các hàng kẻ ngang hết bề rộng | Tỷ lệ bị tách khỏi tên; ba cụm từ ngắn bị kéo thành bảng | "1:3" đứng ngay cạnh tên lớp; danh sách đổi thành checklist có dấu tích, khoảng cách gần |
| Phương pháp (3 ghi chú) | "Họ dạy theo cách nào" | Hàng ngang thuật ngữ 8rem / giải thích | Đọc như bảng | Thuật ngữ và câu giải thích xếp chồng |
| Lịch 7 ngày tới | "Gần đây có lớp lúc nào" | Một hàng 4 cột: ngày, giờ, lớp, trạng thái tít phải; ngày lặp lại ở mọi hàng | Mắt phải quét ngang qua 840px; ngày bị lặp | Nhóm theo ngày (tiêu đề ngày đọc một lần), mỗi buổi: giờ lớn, rồi lớp, HLV và trạng thái xếp ngay cạnh nhau |
| Bốn bước bắt đầu | "Tôi phải làm gì" | 4 cột, số lớn trên tiêu đề | Đúng mẫu quy trình | Giữ; chữ 15px |
| Form cuối trang | "Để lại số ở đâu" | Hai ô, nhãn 12px | Nhãn nhỏ | Nhãn 13px, ô cao 48px |

## Lịch tập

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Công tắc hình thức + giờ GMT+7 | "Lọc cho tôi" | Thanh công cụ, công tắc trái, ghi chú phải | Đúng mẫu toolbar | Giữ |
| Dải 14 ngày | "Hôm nào có lớp" | Ngang, cuộn được, chấm đếm số lớp | Đúng mẫu đặt lịch | Giữ; số ngày trống đủ tương phản |
| Thẻ buổi tập | "Giờ nào, lớp gì, ai dạy, còn chỗ không" | Giờ trái, lớp giữa, "Còn chỗ" tít mép phải | Trạng thái quyết định bị tách xa đối tượng | "Còn chỗ" nằm ngay dưới tên HLV trong cùng cụm; mép phải chỉ còn mũi tên (hành động của cả thẻ) |
| Khung "Buổi bạn chọn" | "Tôi vừa chọn gì, bước tiếp là gì" | 4 hàng "Ngày ……… Thứ bảy" kéo hai mép | Chính là lỗi bạn nêu | Một khối tóm tắt đọc liền: ngày → giờ lớn + giờ kết thúc → lớp + tỷ lệ → "với HLV…" → trạng thái → nút → điều kiện |
| Khung "Chưa có gói tập?" | "Tôi chưa có tài khoản thì sao" | Thẻ có tiêu đề, câu, nút | Đúng | Giữ |

## Gói tập

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Ba khái niệm (Số buổi / Thời hạn / Hình thức) | "Gói hoạt động thế nào" | 3 cột, mỗi cột đọc dọc | Đúng | Giữ |
| **Bảng giá** | "Gói nào hợp ngân sách và lịch của tôi" | Mỗi gói một hàng: tên trái, giá tít phải; lần sửa trước ép hai thẻ hẹp trên điện thoại | Dò hai mép khó; hai cột mobile lại làm tên, giá và điều kiện bị vụn | Thẻ đọc dọc: số buổi → tên → **Tổng giá gói** → giá mỗi buổi → thời hạn → tư vấn. Mobile một cột, tablet hai, desktop rộng bốn. Tên và vùng giá có cùng chiều cao tối thiểu khi so ngang. Chỉ đánh dấu giá mỗi buổi thấp nhất khi toàn bộ nhóm đã có giá; phần trăm nêu rõ gói làm mốc. Link mang tên gói sang form và nội dung gửi studio, không làm mất lựa chọn. |
| Điều nên biết | "Hủy, hoàn, gia hạn ra sao" | Hàng ngang thuật ngữ 11rem / giải thích | Bảng giả | Lưới 2×2, mỗi quy định là tiêu đề và câu giải thích xếp chồng |

## Hình thức tập

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Hai ảnh + mô tả | "Hai hình thức trông thế nào" | Ảnh ngang (nhóm), ảnh dọc (riêng) | Đúng | Tỷ lệ cạnh tên; checklist; link "Xem lịch lớp …" lọc sẵn |
| Bảng so sánh | "Khác nhau ở đâu" | 6 hàng, 2 hàng giống hệt ở hai cột, 1 hàng gần như trùng | Bảng là đúng mẫu, nhưng chứa hàng không khác nhau | Chỉ giữ 4 hàng khác nhau; điểm chung gom thành một câu bên dưới |

## Studio

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Ảnh phòng + tiêu đề chồng góc | "Phòng tập trông ra sao" | Đúng | Đúng | Giữ |
| Ba nguyên tắc | "Họ cam kết gì" | Hàng ngang thuật ngữ 11rem / câu | Bảng giả | Ba khối ngang hàng, mỗi khối: số, tiêu đề, câu |

## Huấn luyện viên

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Danh sách HLV | "Ai sẽ dạy tôi" | Ảnh ở cột 1–3, tên bắt đầu ở cột 5, cách ảnh ~240px | Mặt và tên bị tách rời | Thẻ chân dung: ảnh, tên, giới thiệu trong một cột; 4 thẻ một hàng |

## Liên hệ

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Thông tin liên hệ | "Đến bằng cách nào, gọi ai" | 4 hàng ngang nhãn 8rem / giá trị, trộn hai mục đích | Hàng ngang; không nhóm theo ý định | Hai nhóm "Đến studio" (địa chỉ, giờ) và "Liên lạc" (điện thoại, Zalo); nhãn trên giá trị |

## Ưu đãi

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| Mỗi thông báo | "Có gì mới, từ bao giờ" | Ngày ở cột trái, tiêu đề cách 3 cột | Ngày tách khỏi tin nó đánh dấu | Ngày ngay trên tiêu đề |

## Nhận tư vấn và đăng nhập

| Cụm | Khách hỏi | Trước | Đánh giá | Sau |
| --- | --- | --- | --- | --- |
| "Sau khi bạn gửi" | "Rồi chuyện gì xảy ra" | Số và nội dung sát nhau | Đúng | Giữ |
| Form | "Điền gì" | Nhãn trên ô | Đúng mẫu form | Nhãn 13px, ô 48px |

## Cơ sở đánh giá và giới hạn

Đây là đánh giá chuyên gia trên code, ảnh chụp và tương tác thực tế. Nó không thay cho thử nghiệm với khách hàng; không có dữ liệu chứng minh tỷ lệ chuyển đổi hoặc khả năng đọc đã tăng bao nhiêu.

- [NN/g — Proximity](https://www.nngroup.com/articles/gestalt-proximity/): quan hệ gần–xa phải phản ánh quan hệ về ý nghĩa, kể cả sau khi responsive đổi bố cục. Áp dụng cho giá–gói, tên–trạng thái, nhãn–giá trị, lỗi–trường nhập.
- [NN/g — Comparison tables](https://www.nngroup.com/articles/comparison-tables/): chọn cấu trúc theo nhu cầu so sánh. Không kết luận mọi hàng ngang đều sai; bảng báo cáo nhân viên vẫn có mục đích đọc xuống cột.
- [W3C — Labels](https://www.w3.org/WAI/tutorials/forms/labels/): nhãn phải tồn tại, gắn đúng trường và dễ nhận ra. Dùng nhãn trên ô, phân biệt bắt buộc/không bắt buộc và lỗi tại ô.
- [W3C — Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): kiểm tra kích thước và khoảng cách vùng chạm. Mức 24 CSS px của WCAG có ngoại lệ; 40–48px trong bản này là lựa chọn thiết kế, không tuyên bố WCAG bắt buộc 44px ở mọi nơi.
- [W3C — Table headers](https://www.w3.org/WAI/tutorials/tables/two-headers/): tiêu đề cột/hàng mang ý nghĩa, không chỉ căn chữ. Bảng lớn có vùng cuộn nhận focus, chỉ dẫn và cột nhận diện được giữ khi phù hợp.

## Audit màn hình học viên

| Màn hình / cụm | Tác vụ và đường đọc mong muốn | Phát hiện | Xử lý / lý do giữ |
| --- | --- | --- | --- |
| Shell / nhận diện | Nhận studio → chọn một trong bốn tác vụ | Active desktop chỉ khác màu; tên dài có thể tranh chỗ logo | Active có đường kẻ; tên được giới hạn bề rộng và xuống dòng. Bottom nav giữ 4 mục, cao 56px. |
| Lớp học / gói đang dùng | Biết số buổi và hạn trước khi chọn lịch | Số buổi và gói bị đẩy ra hai mép trên desktop | Một khối dọc: số dư → tên gói + hạn. Không suy diễn thêm eligibility. |
| Lớp học / ngày | Chọn ngày rồi đọc lớp bên dưới | Dùng `role=tab` nhưng không có tương tác bàn phím của tabs | Nhóm button `aria-pressed`, nhãn có đủ thứ/ngày/tháng/năm; Tab và Enter dùng hành vi native. |
| Lớp học / hình thức | Thu hẹp danh sách | Nút thấp, chữ 12px | Vùng chạm 44px, chữ UI 14px, trạng thái pressed được công bố. |
| Lớp học / mỗi buổi | Giờ → hình thức → thông tin lớp → khả năng đặt | Badge tách khỏi lớp ở mép phải | Badge vào cùng luồng đọc, toàn cụm là link. Giữ cả lớp không đặt được để người dùng hiểu danh sách. |
| Chi tiết lớp / nhận diện | Ngày + giờ + loại lớp nhận diện chính xác buổi sắp đặt | Loại lớp xuất hiện lại trong danh sách chi tiết | Bỏ dòng hình thức lặp; giữ thời gian ở header. |
| Chi tiết lớp / dữ kiện | Ai dạy, còn chỗ, còn bao lâu | Label rộng 9rem làm value mất chỗ trên mobile | Dùng `DetailList`: nhãn trên value; một cột mobile, hai cột rộng. |
| Chi tiết lớp / hệ quả | Biết trừ bao nhiêu, thay đổi số dư ra sao, đọc điều kiện trước commit | Hàng ngang giống hồ sơ; con số dễ đọc nhầm | Gom dưới tiêu đề “Khi bạn đặt lớp này”, điều kiện ngay trước CTA. Giữ backend làm chủ quyết định đặt được. |
| Xác nhận đặt | Nhận đúng ngày/giờ → đọc số buổi bị trừ → xác nhận | Đã có nội dung trước commit và pending | Giữ; sửa vùng chạm, đóng, wrap footer qua primitive dialog/button. |
| Lịch của tôi / booking | Ngày → giờ → lớp → HLV → trạng thái → điều kiện → đổi/hủy | Badge ở mép; hai text button thấp và sát | Cụm dọc; nút đổi/hủy cao tối thiểu 44px. Hệ quả hoàn buổi vẫn lấy từ backend. |
| Đổi buổi / hủy | Biết buổi đang giữ và hậu quả trước khi thay đổi | Confirmation đã nêu không trừ thêm hoặc được/không được hoàn | Giữ; form/dialog nhận tăng kích thước ô, vùng chạm và khả năng cuộn. Kiểm tra cả trạng thái lỗi. |
| Gói của tôi | Tên + trạng thái → thời gian hiệu lực → còn/đã dùng | Trạng thái ở mép; số dư và đã dùng có thể không vừa | Trạng thái cùng luồng đọc; hai số được wrap theo chiều rộng. Không coi “hết buổi” là enum mới. |
| Lịch sử | Buổi → kết quả → hoàn buổi hay không | Kết quả tách xa thông tin lớp | Badge theo cùng cụm; giữ thông báo hoàn/không hoàn và studio hủy. |
| Tài khoản / hồ sơ | Nhận diện từng thuộc tính, sau đó sửa | Email dài trong cột value cố định | Nhãn trên; value được wrap-anywhere; hai field trên desktop, một trên mobile. |
| Tài khoản / gói | Số dư và hạn là thông tin quyết định | Số dư chỉ ngang cấp text hồ sơ | Số dư lớn hơn; label còn lại và tổng buổi gần nhau. |
| Tài khoản / mật khẩu, logout | Mỗi giao dịch có tiêu đề, form, nút và hệ quả | Cấu trúc đúng; kích thước primitive nhỏ | Giữ nhóm riêng; tăng field/button; logout vẫn có xác nhận. |

## Audit màn hình huấn luyện viên

| Màn hình / cụm | Ý nghĩa / scan | Phát hiện | Xử lý / lý do giữ |
| --- | --- | --- | --- |
| Shell | Nhận diện → ba mục công việc → logout | Logo bị ép trên 390px, menu và logout cùng một hàng | Mobile hai hàng: logo/logout rồi ba mục. Active có đường kẻ. |
| Hôm nay | Thứ tự buổi sớm → muộn; mở học viên trước giờ dạy | Fixture trả 17:30 trước 07:00; hàng không có lối vào lớp; capacity nằm tít phải | Sort bản sao theo thời gian, không mutate cache; giờ/lớp/capacity đọc dọc; link mở roster/điểm danh rõ. |
| Lịch dạy / ngày | Xem mật độ theo tuần trên desktop, theo ngày trên mobile | WeekList giữ capacity xa tên lớp | Gom capacity vào cụm; thêm “Xem lớp”, sort theo giờ. WeekGrid vẫn giữ trục ngày–giờ vì nó làm nhiệm vụ phát hiện lịch. |
| Lớp / học viên | Ngày/giờ → tên lớp → danh sách → điểm danh | Tên và trạng thái cách hết cột | Tên + badge gần nhau, controls ngay dưới người tương ứng. Giữ backend và dữ liệu đang có quyết định mở điểm danh. |
| Hồ sơ / thông tin | Đọc dữ kiện cá nhân, sau đó sửa bio | Label/value fixed columns | Primitive hồ sơ xếp trên/dưới; bio và chuyên môn vẫn là form riêng. |
| Hồ sơ / số tháng này | So số lớp và sức chứa | Metric đã đặt nhãn trên số, có giải thích phạm vi | Giữ; thang chữ hỗ trợ tăng lên. |

## Audit màn hình nhân viên

| Màn hình / cụm | Câu hỏi người dùng / scan | Phát hiện | Xử lý / lý do giữ |
| --- | --- | --- | --- |
| Shell | Tôi đang ở nhóm công việc nào, sang đâu? | Mobile dải ngang rất dài che hầu hết mục; logout chỉ desktop | “Menu studio” mở dialog chia nhóm giống desktop; đủ destination theo quyền + logout. Có main landmark. |
| Tổng quan / 4 số | Việc nào cần chú ý → bấm đi tới danh sách | Nhãn trên số, đúng công việc; null không bị giả thành 0 | Giữ Metric và route drill-down. |
| Tổng quan / mỗi lớp | Giờ → HLV → sĩ số/trạng thái → mở lớp | Ba cột cố định trên điện thoại | Cụm flex wrap theo bề rộng, trạng thái không bị ép ngoài viewport. |
| Lịch / toolbar | Tạo lớp; hoặc duyệt tuần; hoặc lọc | Actions không wrap khiến page tràn ở 390px | PageHeader action row được wrap. Bộ lọc nằm trước dữ liệu, label trên control. |
| Lịch / lưới tuần | So vị trí ngày/giờ để phát hiện lịch | Tên tiếng Việt bị đè vào chip hẹp khi tăng text | Cột ngày tối thiểu rộng hơn, cuộn trong vùng riêng. Mobile là WeekList, không ép lưới bảy ngày lên điện thoại. |
| Lịch / xem nhanh | Nhận đúng buổi → ai dạy/sức chứa/trạng thái → mở lớp | Duplicate Row 7.5rem label | Đổi sang cùng primitive record; không trộn với layout so sánh. |
| Tạo lớp / lịch lặp | Hình thức/HLV → ngày/giờ → thời lượng/sức chứa → xem trước/commit | Form theo nhóm đã đúng, footer sticky giữ action | Giữ nghiệp vụ; tăng ô nhập/label/close; thử validation và cuộn form. |
| Chi tiết lớp | Giờ → HLV + sĩ số/trạng thái → học viên | Fact pairs ở header có khoảng cách nhỏ, không kéo hai mép | Giữ; action đổi HLV/hủy wrap, roster theo từng người. Không thay quyết định eligibility trong frontend. |
| Khách quan tâm / danh sách | Tìm khách theo trạng thái rồi mở nhu cầu | Desktop bảng đồng nhất; mobile các đoạn tên/số/nhu cầu/ngày | Giữ bảng desktop và list mobile; text/actions hưởng primitive mới. |
| Khách quan tâm / chi tiết | Nhu cầu quan trọng hơn nguồn và mã người phụ trách | Nhu cầu bị bó vào cột value hẹp | Nhu cầu chiếm cả bề rộng; metadata nhỏ hơn ở dưới. Outcome form và conversion vẫn riêng. |
| Học viên / tìm kiếm | Tên hoặc điện thoại + trạng thái → danh sách | Search có label; row có link thật bên cạnh row click | Giữ, tăng chữ/field. Không biến bảng đối soát thành một dãy thẻ giá. |
| Học viên / tổng quan | Thông tin cá nhân rồi tình trạng gói | Email, sinh nhật, số dư, gói, ghi chú tất cả cùng một danh sách | Tách “Tình trạng gói tập”; số dư 24px; ghi chú full width; nhãn gần value. |
| Học viên / gói & thanh toán | Theo gói: còn/hạn/giá → gia hạn/sổ; theo phiếu: tiền/phương thức/trạng thái/thời gian | PaymentTable mobile cần cuộn cả bốn cột | Mobile mỗi phiếu thành một record dọc đủ dữ kiện; desktop giữ bảng. |
| Học viên / lịch sử lớp | Khi nào → hình thức → HLV → trạng thái | Bảng 42rem trên điện thoại | List mobile theo từng buổi; bảng desktop giữ so theo cột. |
| Học viên / ảnh | Nhận mốc chụp tiến trình | Copy đưa token và kiểm quyền vào UI | Copy nói về mốc tiến trình; giữ ngày/giờ và người tải. Không thêm nút xem ảnh khi route không có chức năng đó. |
| Huấn luyện viên / danh sách | Ai đang dạy → chuyên môn → public status | Nội dung cùng người; pending text opacity thiếu contrast | Giữ records; PendingFact không giảm opacity. |
| Huấn luyện viên / chi tiết | Bio/chuyên môn → liên hệ → tài khoản → thống kê | Fixed label columns; bio dài | Bio full width; dữ kiện nhãn trên; số tháng vẫn Metric. |
| Gói tập / catalogue | Đối soát tên/số buổi/hạn/giá/hình thức/trạng thái | Đây là bảng quản lý, khác quyết định mua của khách | Giữ bảng desktop, record mobile; tăng table heading; trạng thái và toggle cùng row. |
| Thanh toán | Lọc → đối soát → xác nhận/hủy đúng phiếu | Text actions nhỏ và sát nhau; axe bắt target-size | Hai actions tách khoảng cách, cao 40px. Dialog nêu hậu quả và yêu cầu lý do. |
| Sổ buổi | Chọn gói → xem bút toán → delta và số dư → điều chỉnh | Bảng ledger có nhiệm vụ audit, số dư không phải giá | Giữ cột desktop; list mobile có delta và số dư ngay tại mỗi bút toán; adjustment form giữ hệ quả trước commit. |
| Gia hạn | Ai → vì sao → số buổi/hạn → lịch liên hệ → ghi nhận | Cụm facts và follow-up gần nhau; desktop form bên mỗi người | Giữ; tăng label/input/button. Flags lấy từ backend, không tính lại threshold. |
| Báo cáo / index | Chọn câu hỏi kinh doanh cần trả lời | Copy hứa Excel “sẽ có” dù một report đã xuất được; report HLV hứa occupancy mà payload không có | Sửa mô tả khớp tính năng và dữ liệu hiện tại. |
| Doanh thu / theo phương thức | So tiền mặt/chuyển khoản và tỷ trọng | Mỗi nhãn ở trái, tiền tít phải cả trang | Hai cụm cạnh nhau desktop, mỗi cụm nhãn → số tiền → tỷ trọng → số giao dịch. Mobile xếp dọc. |
| Doanh thu / từng giao dịch | Từ tổng truy xuống phiếu | Bảng lớn khiến mobile nhìn mỗi cột đầu | Records mobile: người/gói → tiền → phương thức → thời gian xác nhận; bảng desktop giữ. |
| Lớp học / metrics | Xếp/hủy/booking/capacity/occupancy là số gì | Metric và lời giải thích đã có | Giữ; không biến null thành 0. |
| Lớp học / bảng sĩ số | So số lớp theo quy mô 1–5 học viên và HLV | Cột “1,2,3” thiếu đơn vị; vùng cuộn không nhận focus | Header ghi “1 học viên…”; nhận diện HLV sticky; có hướng dẫn cuộn và region focusable. Đây là matrix cần so nhiều cột nên giữ bảng. |
| Báo cáo HLV | So khối lượng phân công, hủy, lượt đăng ký | Mobile chỉ thấy tên; caption nói occupancy không tồn tại | Mobile từng HLV có ba chỉ số label trên; desktop bảng; copy nói đúng ba chỉ số. |
| Tài khoản | Nhận diện người/email/quyền/trạng thái → khóa/mời lại | Table desktop + records mobile phù hợp; dialog facts cột hẹp | Giữ list/table; dialog record nhãn trên; action cao và wrap, kiểm quyền giữ nguyên. |

## Audit primitive đến cấp phần tử

| Phần tử | Tiêu chí | Thay đổi |
| --- | --- | --- |
| Label / value | Label còn nhìn thấy, không cắt dữ kiện, hỗ trợ tên/email dài | DetailRow nhãn trên; value wrap; long description full width. |
| Typography | Chữ phụ đọc được bằng cỡ thực tế, không chỉ ở ảnh thu nhỏ | Token UI 14px, supporting 13px, auxiliary 12px. Giữ tiếng Việt sentence case và leading theo dấu. |
| Button | Vùng chạm, xuống dòng, pending không đổi ý nghĩa | `min-height` thay `height`; 40/44/48px; max-width 100%; text có thể wrap. |
| Input/select | Nhãn trên; type/inputMode/autocomplete; lỗi gần trường | Cao 44px; field public 48px; mobile text 15px theo token base. Chưa tuyên bố đã tối ưu zoom của Safari vì chỉ kiểm tra Chromium. |
| Hint/error | Gắn qua describedBy, invalid; không chỉ dùng màu | Giữ cơ chế Field; optional trên form tư vấn được ghi rõ. |
| Dialog | Nhận diện giao dịch; đóng/thoát; focus trap; footer không tràn | Radix giữ focus/escape; close 44px, footer wrap, body cuộn. |
| Status | Có chữ, không chỉ chấm màu; thuộc đúng object | Badge class/booking trong cùng cụm. Status không dùng để decorate brand. |
| PendingFact | Chưa có khác với 0 và record hợp lệ không có dữ liệu | Bỏ opacity gây thiếu contrast; vẫn nói “Đang cập nhật”. |
| Table | Header mang đơn vị; alignment số để so; chỉ cuộn vùng bảng | Header 14px, focusable named region, hướng dẫn mobile; bảng sĩ số giữ cột nhận diện. |
| Day/filter buttons | Semantic đúng hành vi bàn phím | Button group + pressed, không khai báo radio/tab rồi thiếu arrow-key behavior. |
| Navigation | Active nhận ra không chỉ bằng màu; mục và vai trò rõ | Student/trainer active rule; mobile staff chia nhóm trong dialog. |
| Image | Thể hiện người/dịch vụ/không gian trong cùng composition, không tranh với việc đọc | Bỏ overlay chú thích từng ảnh theo yêu cầu trước của chủ; disclosure concept một lần tại footer. |
| CTA mỗi gói | Lựa chọn đi xuyên suốt sang bước tiếp | Query tên gói → nhận diện trong form → ngữ cảnh gửi studio. |
| Header CTA | Không cạnh tranh với nút cùng transaction trong first viewport | Không lặp CTA trên Home, Tư vấn, Gói tập, Liên hệ khi nội dung trang đã mang lời mời. |

## Workflow kiểm lại mỗi màn hình

1. Xác định người dùng và quyết định chính; đọc từng cụm bằng câu hỏi thực tế của họ.
2. Liệt kê dữ kiện cần quyết định, thứ tự đọc và trạng thái/hành động liên quan.
3. Chọn record, choice, comparison table, calendar hoặc form theo việc đó. Không chọn theo sở thích hairline/card.
4. Kiểm tra khoảng cách **trong một cụm nhỏ hơn giữa các cụm**; không bắt nhớ label khi tìm value ở mép khác.
5. Xem screenshot đầy đủ và cỡ thật ở 390/768/1024/1440; kiểm tra overflow, wrap, type, optical alignment, ảnh và fixed controls.
6. Thử một tác vụ thật: chọn, quay lại, gửi thiếu dữ kiện, chờ, nhận lỗi/thành công, đóng dialog; không chỉ kiểm tra landing state.
7. Kiểm tra keyboard/accessible names/axe. Axe không chứng minh bố cục đẹp hoặc người dùng hiểu.
8. Ghi rõ giữ/sửa, lý do và bằng chứng. Chỉ gọi đã hoàn thành khi việc đọc và thao tác đã được kiểm lại ở state thực tế.

## Bằng chứng kiểm tra

Chạy lại từ `src_FE`:

```powershell
npm run verify
npx playwright test e2e/ui-clusters.app.spec.ts --project=app --workers=2
node scripts/audit-clusters.mjs http://localhost:5199 visual-qa/clusters-after 1440,390,768,1024
```

Script audit bao phủ **41 màn hình × 4 viewport**, gồm public/auth/student/trainer/admin/404. Detail routes dùng mẫu dữ liệu có thật trong MSW; các trạng thái có tương tác được kiểm tra bổ sung bằng Playwright. Đây là demo API, không phải bằng chứng backend thật hoặc dữ liệu studio đã sẵn sàng phát hành.
