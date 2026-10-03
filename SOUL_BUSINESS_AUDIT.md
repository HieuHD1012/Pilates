# SOUL BUSINESS AUDIT

**Ngày audit:** 03/10/2026  
**Phạm vi chính:** mã sản phẩm ở `main` (frontend `src_FE/app`, backend `src_BE/app`), được đọc từ nhánh `ref/comparison` vì phần code trên nhánh này giống `main`. Các nhánh ELLA/Pearl và 12 bản inspired là nghiên cứu bố cục, không phải sản phẩm đang được audit. **Không có bằng chứng về cấu hình production, dữ liệu thật hoặc số liệu chuyển đổi.** Ảnh chụp bản dev có MSW là dữ liệu mẫu.

**Ranh giới rất quan trọng:** [soulpilates.com.vn](https://soulpilates.com.vn/) hiện tự nhận là **Soul Pilates Đà Nẵng**. Website đó có luồng đặt lớp, mua gói, đăng ký tài khoản và nội dung Group/Private khác repo Nha Trang; [trang booking](https://soulpilates.com.vn/booking/) còn hiển thị Mat, Duo và waitlist, [trang packages](https://soulpilates.com.vn/packages/) nêu Stripe. Không lấy các mục đó làm rule cho repo này. Repo đang ghi `Soul Pilates Nha Trang`, trong khi [thư mục ảnh được chủ cung cấp](docs/thiet-ke/anh-studio/README.md) ghi **J Pilates**. Quan hệ thương hiệu/tên cuối của cơ sở mới là **Unknown / Need confirmation**. Việc dùng Soul trong brief đính kèm được ghi nhận là yêu cầu định hướng, không phải bằng chứng giải quyết xung đột tên.

**Cách đọc trạng thái:** `Confirmed` = có hành vi hoặc dữ liệu cụ thể trong code; `Inferred` = mục đích hợp lý từ hành vi nhưng chưa được chủ xác nhận; `Unknown / Need confirmation` = code không đủ để kết luận. `Confirmed` ở đây xác nhận *sản phẩm được lập trình như vậy*, không xác nhận studio thực sự đang vận hành như vậy.

## 1. Business overview

| Câu hỏi | Kết luận | Trạng thái và evidence |
| --- | --- | --- |
| Dịch vụ | Pilates trên reformer với lớp nhóm và lớp riêng. Gói tập theo số buổi, thời hạn, gắn với một loại lớp. | **Confirmed** — [studio.ts](src_FE/app/content/studio.ts), [PackageType](src_BE/app/models/money.py), [ClassType](src_BE/app/domain/rules.py). |
| Khách mục tiêu | Nội dung hướng tới người muốn tập đều, người mới, người cần điều chỉnh tư thế hoặc tập riêng. Không có phân khúc tuổi, thu nhập, khách du lịch hay giới tính được xác nhận. | **Inferred** từ `CLASS_FORMATS.forWho`; đặc điểm nhân khẩu học **Unknown**. |
| Primary conversion công khai | Để lại tên và số điện thoại ở `/dat-tu-van`; nhân viên nhận lead rồi tư vấn/chuyển thành học viên. | **Confirmed** — [consultation.tsx](src_FE/app/routes/public/consultation.tsx), [leads.py](src_BE/app/api/leads.py). |
| Secondary conversions | Xem gói/lịch; đăng nhập để tự đặt lớp nếu đã có tài khoản và gói; xem liên hệ. | **Confirmed** — [routes.ts](src_FE/app/routes.ts), [schedule.tsx](src_FE/app/routes/public/schedule.tsx), [class-detail.tsx](src_FE/app/routes/student/class-detail.tsx). |
| Vai trò sản phẩm | Kết hợp giới thiệu thương hiệu, thu lead, công bố gói/lịch/HLV, và self-service cho học viên sau khi studio cấp tài khoản/gói. Bán gói và ghi nhận thanh toán nằm ở khu nhân viên, không có checkout công khai trong repo. | **Confirmed** — [public routes](src_FE/app/routes.ts), [staff packages](src_FE/app/routes/staff/packages.tsx), [payments.py](src_BE/app/api/payments.py). |

**Không thể kết luận:** tỷ lệ chuyển đổi, gói nào đang bán, giá thật, lịch thật, HLV thật, số chi nhánh đang được backend phục vụ, hay đã có tích hợp production. Dev bật [MSW](src_FE/app/lib/mocks.ts) mặc định và dùng [fixtures](src_FE/app/mocks/fixtures.ts).

## 2. Sitemap / information architecture hiện tại

Các URL dưới đây được khai trong [routes.ts](src_FE/app/routes.ts); navigation công khai nằm ở [nav.ts](src_FE/app/content/nav.ts). “Entry” là đường vào từ UI hiện có, không phải số liệu traffic.

| Page / section | Business purpose | Entry point | CTA chính → destination | CTA phụ |
| --- | --- | --- | --- | --- |
| `/` Home | Giới thiệu proposition, hai hình thức, phương pháp, lịch gần, cách bắt đầu | URL gốc | Đặt lịch tư vấn → `/dat-tu-van` | Xem lịch tập → `/lich-tap` |
| `/gioi-thieu` Studio | Giải thích không gian và nguyên tắc tập | Header/footer | Header Đặt lịch tư vấn → `/dat-tu-van` | Không có CTA riêng trong nội dung |
| `/dich-vu` Hình thức tập | So sánh Group và Private, điều kiện phù hợp và hủy | Header/footer | Đặt lịch tư vấn → `/dat-tu-van` ở cuối trang | — |
| `/goi-tap` Gói tập | Giải thích số buổi/thời hạn, hiển thị các gói backend đang bán | Header/footer | Nhận tư vấn gói phù hợp → `/dat-tu-van` | Nếu chưa có gói: Nhận bảng giá → cùng đích |
| `/huan-luyen-vien` HLV | Công bố HLV được phép hiển thị | Header/footer | Ở trạng thái rỗng: Đặt lịch tư vấn → `/dat-tu-van` | — |
| `/lich-tap` Lịch công khai | Xem lớp sắp tới và còn/hết chỗ | Header/footer, Home | Đăng nhập để đặt lớp → `/dang-nhap` | Đổi tuần/ngày |
| `/khuyen-mai` Ưu đãi & thông báo | Đọc thông báo đã công bố | Footer, không ở header | Khi rỗng: Hỏi studio về ưu đãi → `/dat-tu-van` | — |
| `/lien-he` Liên hệ | Xem các kênh, địa chỉ, giờ mở cửa | Header/footer | Đặt lịch tư vấn → `/dat-tu-van` | Gọi/nhắn/map chỉ khi có dữ kiện |
| `/dat-tu-van` Form | Gửi lead để studio liên hệ | Hầu hết CTA công khai | Gửi thông tin → `POST /public/leads` | Gửi thêm sau thành công |
| `/dang-nhap` | Vào khu học viên/HLV/nhân viên | Header/footer, lịch | Đăng nhập → khu theo vai trò | Quên mật khẩu |
| `/hv/lop-hoc`, `/hv/lop-hoc/:id` | Xem lớp có thể đặt; xem hệ quả trừ buổi; đặt lớp | Sau đăng nhập | Xác nhận đặt → `POST /bookings` | Xem gói/lớp khác |
| `/hv/lich-cua-toi`, `/hv/lich-su`, `/hv/goi-tap`, `/hv/tai-khoan` | Quản lý buổi đã đặt, lịch sử, số buổi, hồ sơ | Khu học viên | Hủy/đổi buổi khi backend cho phép | Xem lớp, liên hệ studio |
| `/hlv/*` | HLV xem lịch, lớp, điểm danh, hồ sơ | Sau đăng nhập | Điểm danh theo lớp | — |
| `/studio/*` | Nhân viên quản lý lead, học viên, HLV, lớp, gói, thanh toán, gia hạn, báo cáo | Sau đăng nhập | Theo nghiệp vụ từng màn | — |

## 3. User journeys thực tế

### J1 — Khách mới cần tư vấn (đường chuyển đổi chính, **Confirmed**)

1. **Entry:** Home hoặc bất cứ trang công khai có CTA tư vấn.
2. **Intent:** Biết lớp phù hợp và cách bắt đầu.
3. **Steps:** Đọc Group/Private hoặc gói → `/dat-tu-van` → nhập tên, điện thoại; loại lớp và nhu cầu là tùy chọn → form gửi `full_name`, `phone`, `need`, `source=website` → staff xem lead, cập nhật trạng thái/ghi chú, có thể chuyển thành học viên. [Form](src_FE/app/routes/public/consultation.tsx), [lead API](src_BE/app/api/leads.py), [lead detail](src_FE/app/routes/staff/lead-detail.tsx).
4. **Decision points:** Chọn Group/Private hoặc để trống; gửi hoặc rời form. Sở thích loại lớp được ghép vào trường ghi chú, chưa phải field riêng của lead.
5. **CTA:** “Đặt lịch tư vấn” → “Gửi thông tin”. Đây là **yêu cầu gọi lại**, không có chọn giờ tư vấn.
6. **Kết quả:** API trả thông báo nhận thông tin. Lead mới chỉ được tạo nếu không trùng số trong cửa sổ cấu hình và số đó chưa là học viên; người gửi vẫn thấy cùng thông báo trong các trường hợp này.
7. **Friction:** không có SLA gọi lại được định lượng; sau thành công UI gợi ý gọi trực tiếp nhưng số điện thoại đang `null`; không có chọn cơ sở nếu triển khai nhiều địa điểm.

### J2 — Khách muốn xem gói/giá trước khi quyết định (**Confirmed**)

Entry Home/nav → `/goi-tap` → đọc cách tính buổi/thời hạn → API chỉ trả `PackageType.is_selling=true` → giá có thể là `null` → CTA tư vấn. Không có mua gói công khai trong repo. Nếu danh mục rỗng/lỗi, fallback vẫn dẫn tới form tư vấn. **Friction:** mức giá thực tế là **Unknown** nếu backend chưa nhập; người muốn tự mua chưa có đường checkout. [packages.tsx](src_FE/app/routes/public/packages.tsx), [public.py](src_BE/app/api/public.py).

### J3 — Khách muốn biết lịch trước khi đến (**Confirmed**)

Entry Home/nav → `/lich-tap` → chọn tuần/ngày → xem loại lớp, giờ, HLV, còn/hết chỗ → “Đăng nhập để đặt lớp” → tài khoản do studio cấp → khu học viên. Lịch công khai không có ID hay liên kết đặt một buổi cụ thể, nên sau login học viên chọn lại trong danh sách riêng. Nếu chưa có tài khoản/gói, đường thực tế là tư vấn với studio, nhưng trang lịch không có CTA lead trực tiếp. [schedule.tsx](src_FE/app/routes/public/schedule.tsx), [public schema](src_BE/app/schemas/public.py), [login.tsx](src_FE/app/routes/auth/login.tsx).

### J4 — Học viên đã có tài khoản và gói (**Confirmed**)

Đăng nhập → `/hv/lop-hoc` → chọn ngày/loại → chi tiết buổi → backend trả điều kiện đặt được → xác nhận trừ **1 buổi** → xem `/hv/lich-cua-toi` → đổi/hủy trước hạn. Gói phải còn hiệu lực vào ngày hiện tại và ngày lớp, đúng loại lớp, còn buổi; lớp chưa bắt đầu/chưa hủy/chưa đầy. Sau hạn hủy, cả hủy và đổi bị khóa. [class-detail.tsx](src_FE/app/routes/student/class-detail.tsx), [booking_service.py](src_BE/app/services/booking_service.py), [my_schedule.py](src_BE/app/api/my_schedule.py).

### J5 — Khách quan tâm địa điểm (**Confirmed**, kết quả hiện thiếu)

Home/nav → `/gioi-thieu` hoặc `/lien-he` → đọc mô tả/phòng tập và thông tin liên hệ → CTA tư vấn. `STUDIO.address`, `mapUrl`, `phone`, `openingHours` đều `null`; ở `main`, [photography.ts](src_FE/app/content/photography.ts) còn `src:null` cho các khung ảnh. Khách chưa thể xác định địa chỉ hoặc mở đường đi từ sản phẩm này. Đây là thiếu dữ liệu đã được [content debt](src_FE/app/content/studio.ts) đánh dấu, không phải kết luận cơ sở không tồn tại.

### J6 — Vận hành lead → học viên → gói (**Confirmed**)

Staff vào `/studio/khach-quan-tam` → xem chi tiết, liên hệ ngoài hệ thống, lưu kết quả → “Chuyển thành học viên” → nhân viên tạo/bán gói và ghi nhận thanh toán tiền mặt hoặc chuyển khoản → cấp tài khoản để học viên tự đặt. Không có bằng chứng hệ thống tự gọi/nhắn, tự charge thẻ hoặc tự cấp gói sau khi khách gửi form. [lead-detail.tsx](src_FE/app/routes/staff/lead-detail.tsx), [package_sales.py](src_BE/app/services/package_sales.py), [payments.py](src_BE/app/services/payments.py), [login.tsx](src_FE/app/routes/auth/login.tsx).

## 4. Business entities

| Entity | Fields / information visible to whom | Relation | Evidence |
| --- | --- | --- | --- |
| Studio facts | Tên, thành phố; địa chỉ, map, phone, Zalo, email, giờ mở cửa nullable trên site | Một object nội dung duy nhất, chưa có ID chi nhánh | [studio.ts](src_FE/app/content/studio.ts) |
| Class format | Group/Private; mô tả, nhóm phù hợp, chính sách hủy công bố | Gắn với buổi lớp và loại gói | [studio.ts](src_FE/app/content/studio.ts), [rules.py](src_BE/app/domain/rules.py) |
| Class session | Giờ bắt đầu/kết thúc, loại, HLV, sức chứa, trạng thái | Nhiều booking, một HLV | [scheduling.py](src_BE/app/models/scheduling.py), [public.py](src_BE/app/api/public.py) |
| Package type | Tên, giá nullable, số buổi, số ngày, loại lớp, đang bán | Mẫu để staff bán; bản công khai chỉ loại đang bán | [money.py](src_BE/app/models/money.py), [public.py](src_BE/app/api/public.py) |
| Student package | Snapshot tên/giá/số buổi/loại, ngày bắt đầu-hết hạn, số dư/trạng thái | Thuộc một học viên; trả cho booking | [money.py](src_BE/app/models/money.py), [student packages](src_FE/app/routes/student/packages.tsx) |
| Booking / credit ledger | Buổi đã giữ, trạng thái; bút toán trừ/hoàn | Booking thuộc học viên, lớp, gói; sổ buổi ghi lịch sử | [scheduling.py](src_BE/app/models/scheduling.py), [money.py](src_BE/app/models/money.py) |
| Trainer | Tên, ảnh, bio công khai nếu bật; staff có thêm thông tin | Một HLV phụ trách mỗi buổi | [people.py](src_BE/app/models/people.py), [public.py](src_BE/app/api/public.py) |
| Lead | Tên, điện thoại, nhu cầu, nguồn, trạng thái, người phụ trách | Có thể chuyển thành học viên | [people.py](src_BE/app/models/people.py), [leads.py](src_BE/app/api/leads.py) |
| Student / account | Hồ sơ người tập, số điện thoại; account đăng nhập theo vai trò | Học viên có thể có tài khoản và nhiều gói/bookings | [people.py](src_BE/app/models/people.py), [user.py](src_BE/app/models/user.py) |
| Payment | Phương thức CASH/TRANSFER, trạng thái và lịch sử xác nhận/void | Gắn với bán gói; staff ghi nhận | [rules.py](src_BE/app/domain/rules.py), [payments.py](src_BE/app/services/payments.py) |
| Announcement / promotion | Tiêu đề, nội dung, ngày đăng, trạng thái publish | Staff tạo, public đọc khi đã phát hành | [people.py](src_BE/app/models/people.py), [promotions.tsx](src_FE/app/routes/public/promotions.tsx) |
| Renewal contact | Ngày liên hệ, kết quả, ngày hẹn tiếp | Gắn với học viên sắp hết hạn/buổi | [people.py](src_BE/app/models/people.py), [renewal_query.py](src_BE/app/services/renewal_query.py) |

Không có entity testimonial/review trong repo. `WaitlistEntry` còn trong model để đọc dữ liệu lịch sử nhưng **hàng chờ đang bị bỏ**, theo [rules.py](src_BE/app/domain/rules.py) và [business-rules.md](docs/business-rules.md); không đưa vào journey hiện hành. Không có entity location/branch ở backend.

## 5. Business rules ảnh hưởng người dùng

### BR-01 — Hình thức lớp
**Status:** Confirmed. **Rule:** danh mục công khai chỉ Group và Private; mỗi buổi có một HLV. Private mặc định sức chứa 1, backend cho staff đặt Private sức chứa 2 (Duo nội bộ), nhưng không phải offer công khai. **Evidence:** [studio.ts](src_FE/app/content/studio.ts), [scheduling.py](src_BE/app/services/scheduling.py), [PRODUCT.md](src_FE/docs/PRODUCT.md). **User impact:** khách chỉ được hướng dẫn chọn hai loại; không suy ra Nha Trang bán Duo.

### BR-02 — Danh mục gói và giá
**Status:** Confirmed. **Rule:** gói gồm số buổi, thời hạn, loại lớp; chỉ gói đang bán ra public; giá có thể chưa nhập (`null`). Staff bán gói, bản đã bán giữ snapshot điều khoản. **Evidence:** [PackageType/StudentPackage](src_BE/app/models/money.py), [public.py](src_BE/app/api/public.py), [packages.py](src_BE/app/api/packages.py). **User impact:** không tự thanh toán/mua gói trên site Nha Trang; giá hiển thị chỉ khi có dữ liệu thật.

### BR-03 — Tạo lead tư vấn
**Status:** Confirmed. **Rule:** không cần account; bắt buộc tên và số điện thoại; loại lớp/nhu cầu tùy chọn. Backend chặn gửi dồn và trùng số trong cửa sổ cấu hình, không tạo lead mới nếu đã là học viên, nhưng trả cùng thông điệp. **Evidence:** [consultation.tsx](src_FE/app/routes/public/consultation.tsx), [leads.py](src_BE/app/api/leads.py). **User impact:** form là yêu cầu liên hệ, không phải lịch hẹn đã được xác nhận.

### BR-04 — Điều kiện tự đặt lớp
**Status:** Confirmed. **Rule:** chỉ STUDENT tự đặt cho mình; cần gói ACTIVE đúng loại, còn buổi, hiệu lực cả hiện tại và ngày học; buổi chưa bắt đầu/chưa hủy/chưa đầy/chưa được đặt trùng. Nếu không chỉ định gói, backend chọn gói hợp lệ hết hạn sớm nhất. Đặt thành công trừ 1 buổi. **Evidence:** [bookings.py](src_BE/app/api/bookings.py), [booking_service.py](src_BE/app/services/booking_service.py). **User impact:** CTA đặt không tương đương thanh toán; người chưa có gói phải qua staff.

### BR-05 — Hủy và đổi lớp: có mâu thuẫn công khai
**Status:** Confirmed về backend; **Unknown / Need confirmation** về điều khoản phải công bố. **Backend:** Group trước ít nhất **4 giờ**, Private trước ít nhất **1 giờ**; đúng mốc vẫn được hủy/hoàn 1 buổi; sau mốc khóa cả hủy và đổi. Đổi = hủy cũ và đặt mới trong một giao dịch. **Frontend công khai lại ghi Private 8 giờ**. **Evidence:** [rules.py](src_BE/app/domain/rules.py), [booking_service.py](src_BE/app/services/booking_service.py), [services.tsx](src_FE/app/routes/public/services.tsx), [studio.ts](src_FE/app/content/studio.ts), [nguồn nghiệp vụ](docs/doi-chieu-nguon-va-nghiep-vu.md). **User impact:** khách có thể ra quyết định dựa trên chính sách sai; đây là sai lệch nghiêm trọng cần xử lý trước công bố.

### BR-06 — Studio hủy lớp
**Status:** Confirmed. **Rule:** buổi chưa điểm danh bị studio hủy thì hoàn các booking đang giữ; không có dời giờ trực tiếp. **Evidence:** [scheduling.py](src_BE/app/services/scheduling.py), [business-rules.md](docs/business-rules.md). **User impact:** học viên phải chọn/đặt buổi mới sau khi lớp bị hủy; không mặc nhiên chuyển booking.

### BR-07 — Lịch công khai và HLV
**Status:** Confirmed. **Rule:** lịch công khai chỉ buổi SCHEDULED sắp tới, trả loại lớp, giờ, tên HLV và `is_full` thay vì số chỗ; HLV public phải `is_public` và `is_active`. **Evidence:** [public.py](src_BE/app/api/public.py), [public schemas](src_BE/app/schemas/public.py). **User impact:** khách xem khả dụng, nhưng phải login mới chọn buổi để đặt; chỉ hồ sơ HLV được duyệt mới xuất hiện.

### BR-08 — Promotion / announcement
**Status:** Confirmed. **Rule:** chỉ bản `is_published=true` và `publish_at` không ở tương lai mới hiện. Không có engine mã giảm giá hoặc rule áp khuyến mãi vào đơn/gói trong repo. **Evidence:** [public.py](src_BE/app/api/public.py), [people.py](src_BE/app/models/people.py), [promotions.tsx](src_FE/app/routes/public/promotions.tsx). **User impact:** trang “Khuyến mãi” là kênh nội dung, không phải checkout ưu đãi.

### BR-09 — Gia hạn và thanh toán
**Status:** Confirmed. **Rule:** danh sách cần chăm sóc khi còn ≤6 buổi **hoặc** ≤15 ngày; nhân viên ghi lịch sử liên hệ, không có job tự nhắn. Thanh toán CASH/TRANSFER do staff ghi/xác nhận; gói được cộng buổi lúc bán chứ không chờ xác nhận tiền. **Evidence:** [rules.py](src_BE/app/domain/rules.py), [renewal_query.py](src_BE/app/services/renewal_query.py), [payments.py](src_BE/app/services/payments.py), [business-rules.md](docs/business-rules.md). **User impact:** lời “studio sẽ liên hệ” là quy trình phụ thuộc nhân viên, không phải automation được bảo đảm.

### BR-10 — Buổi đầu tiên
**Status:** Inferred về quy trình kinh doanh; Confirmed về copy. **Rule trong nội dung:** để lại thông tin → studio gọi → chọn gói/lịch → từ buổi thứ hai tự đặt. Backend không thấy chặn học viên tự đặt *buổi đầu* nếu đã có tài khoản/gói. **Evidence:** [FIRST_VISIT_STEPS](src_FE/app/content/studio.ts), [bookings.py](src_BE/app/api/bookings.py). **User impact:** đây là hướng dẫn journey, chưa phải điều kiện hệ thống; cần owner xác nhận trước khi viết như cam kết bắt buộc.

## 6. Content hierarchy

Home hiện trả lời theo thứ tự: **(1)** tập gì/ở đâu + CTA tư vấn → **(2)** Group hay Private → **(3)** phương pháp → **(4)** lịch bảy ngày → **(5)** cách bắt đầu → **(6)** tư vấn lần nữa. [home.tsx](src_FE/app/routes/public/home.tsx). Header đưa Studio, Hình thức, Gói, HLV, Lịch, Liên hệ lên cùng cấp; Khuyến mãi chỉ ở footer. [nav.ts](src_FE/app/content/nav.ts).

- **Xuất hiện sớm:** loại lớp trước giá và thông tin địa điểm; đó là lựa chọn của content hiện tại, không kết luận sai nếu mục tiêu là thu lead.
- **Xuất hiện muộn/khó tìm:** cách thật sự mua gói/cấp account nằm ở hướng dẫn buổi đầu và trang gói, không được nói rõ trên lịch công khai trước CTA đăng nhập. Giá nằm trang riêng và phụ thuộc API.
- **Trùng:** tư vấn xuất hiện ở hero, header ngoài Home, footer/closing và fallback nhiều trang; wording dao động giữa “Đặt lịch tư vấn”, “Nhận bảng giá”, “Để lại thông tin”, “Hỏi studio”. Chúng đều về cùng form, không phải các sản phẩm khác nhau.
- **Chưa trả lời:** địa chỉ, giờ, kênh liên hệ trực tiếp, bản đồ, giá thật, lịch thật/HLV thật nếu chưa kết nối backend; có buổi trải nghiệm hay không; tên thương hiệu chi nhánh. Mỗi mục được xem là thiếu dữ kiện hoặc cần xác nhận, không tự điền.
- **Không được đánh đồng:** website Đà Nẵng nói Mat, Duo, drop-in, Stripe, 1:3 Group và nhiều claim kết quả; repo Nha Trang không xác nhận các offer đó.

## 7. Conversion audit

| CTA | Appears at | Intent / action | Destination | Potential issue |
| --- | --- | --- | --- | --- |
| Đặt lịch tư vấn | Home, header các trang khác, cuối Home/Services, Contact, trạng thái rỗng Trainers | Primary lead | `/dat-tu-van` | Wording nghe như chọn lịch nhưng form chỉ xin callback; trên chính trang tư vấn, header còn lặp CTA về cùng trang. |
| Gửi thông tin | Form tư vấn | Primary submission | `POST /public/leads` | Không có chọn giờ; sau thành công lời gợi ý gọi trực tiếp thiếu số điện thoại. |
| Nhận tư vấn gói phù hợp / Nhận bảng giá | Trang gói | Secondary lead | `/dat-tu-van` | Hai tên mục đích nhưng cùng form, không truyền ngữ cảnh gói đã xem. |
| Xem lịch tập / Xem toàn bộ lịch | Home | Information | `/lich-tap` | Lịch công khai không có deep link sang đúng lớp khi login. |
| Đăng nhập để đặt lớp | Lịch | Secondary booking | `/dang-nhap` | Người mới không thể tự tạo account từ repo; phải qua staff/lead. |
| Đặt lớp này / Xác nhận đặt | Khu học viên | Booking transaction | `POST /bookings` | Chỉ khi backend cho phép; preview số dư có thể dùng gói ACTIVE đầu tiên khác gói backend thực chọn. |
| Đổi buổi / Hủy buổi | Lịch học viên | Booking management | API đổi/hủy | Chỉ hiện khi `can_cancel`; copy về “hủy bây giờ không hoàn” vẫn có thể hiện khi thao tác đã bị khóa. |
| Hỏi studio về ưu đãi | Trang Khuyến mãi trạng thái rỗng | Lead | `/dat-tu-van` | Form không mang theo ngữ cảnh ưu đãi. |
| Gọi/Zalo/WhatsApp/email/map | Contact/footer | Direct contact | External action nếu có dữ liệu | Hiện đều thiếu dữ kiện; nội dung nói các kênh đang được theo dõi nhưng không có link khả dụng. |

**Kết luận conversion:** primary ask tương đối nhất quán về đích (`/dat-tu-van`), nhưng không nhất quán về kỳ vọng: “đặt lịch” không đặt được slot, “nhận bảng giá” không tự đánh dấu nhu cầu bảng giá, và nút login là đường cụt với người chưa được cấp tài khoản. Không có bằng chứng site public bán gói online.

## 8. Multi-location readiness — trọng tâm

Không thấy `studio_id`, `location_id` hoặc `branch_id` trong các model/DTO/endpoint của backend. [ClassSession](src_BE/app/models/scheduling.py), [PackageType/StudentPackage](src_BE/app/models/money.py), [Trainer/Lead](src_BE/app/models/people.py) không thuộc một location. Quyền HLV cũng ghi rõ giả định [“một studio một cơ sở”](src_BE/app/core/permissions.py). Vì vậy đây là **mô hình một cơ sở**, không phải chỉ thiếu switcher trên giao diện.

| Feature / data | Current behavior | Multi-location ready? | Evidence |
| --- | --- | --- | --- |
| Brand, city, address, phone, hours, social, map | Một `STUDIO` object; tên/meta Nha Trang hard-code | **No** | [studio.ts](src_FE/app/content/studio.ts), [public routes](src_FE/app/routes/public) |
| URL/SEO/navigation | Một bộ URL `/`, `/lich-tap`, `/goi-tap`; không có location slug/selector | **No** | [routes.ts](src_FE/app/routes.ts), [nav.ts](src_FE/app/content/nav.ts) |
| Ảnh/gallery | Một bộ briefs ảnh, ở main chưa có ảnh thật; không có owner/location field | **No** | [photography.ts](src_FE/app/content/photography.ts) |
| HLV | Bản ghi có `is_public`/`is_active`, không có location; API public trả tất cả người được công bố | **No** | [people.py](src_BE/app/models/people.py), [public.py](src_BE/app/api/public.py) |
| Buổi lớp/lịch/sức chứa | ClassSession không có location; API public lấy toàn bộ upcoming scheduled | **No** | [scheduling.py](src_BE/app/models/scheduling.py), [public.py](src_BE/app/api/public.py) |
| Gói/giá | PackageType thuộc catalogue toàn hệ, không có branch; gói đã bán giữ snapshot | **No** cho giá theo cơ sở; **Yes** cho bảo toàn gói đã bán | [money.py](src_BE/app/models/money.py), [public.py](src_BE/app/api/public.py) |
| Booking | Chỉ class ID + student/package ID; không kiểm điều kiện dùng chéo cơ sở | **No** | [booking_service.py](src_BE/app/services/booking_service.py) |
| Lead tư vấn | `source=website`, không có location choice/assignment | **No** | [consultation.tsx](src_FE/app/routes/public/consultation.tsx), [people.py](src_BE/app/models/people.py) |
| Promotion/announcement | Published ở cấp toàn hệ; không có phạm vi cơ sở | **No** | [people.py](src_BE/app/models/people.py), [public.py](src_BE/app/api/public.py) |
| Tài khoản học viên, HLV, staff & báo cáo | Không thấy branch scope; staff views dùng cùng tập dữ liệu | **No** | [user.py](src_BE/app/models/user.py), [permissions.py](src_BE/app/core/permissions.py), [reports.py](src_BE/app/api/reports.py) |
| Múi giờ | Cố định Asia/Ho_Chi_Minh | **Có thể dùng chung trong Việt Nam**, nhưng không giải quyết branch scope | [rules.py](src_BE/app/domain/rules.py) |

**Quyết định business bắt buộc trước khi thêm location:** tên/quan hệ thương hiệu; site chung hay site riêng; khách chọn cơ sở lúc nào; lead chuyển tới nhân viên nào; gói dùng chung hay riêng, giá/khuyến mãi có khác nhau không; HLV dạy nhiều nơi không; lịch/booking/reporting phân cơ sở thế nào; account học viên có thể dùng tại cả hai không; quyền staff theo cơ sở ra sao; ảnh/SEO/contact của từng nơi; xử lý dữ liệu/gói đã có khi thêm branch. Các câu này là **Open Questions**, không được “giải” bằng một location dropdown.

## 9. UX/business friction có bằng chứng

### High impact

1. **Policy hủy Private mâu thuẫn 8h trên trang dịch vụ và 1h trong backend/tài liệu nguồn.** Khách đọc sai điều kiện hoàn buổi. [studio.ts](src_FE/app/content/studio.ts), [rules.py](src_BE/app/domain/rules.py).
2. **Thông tin đến studio và liên hệ trực tiếp đều thiếu.** Address, map, phone, Zalo, giờ mở cửa `null`; khách không thể tự đánh giá vị trí hay gọi. [studio.ts](src_FE/app/content/studio.ts), [contact.tsx](src_FE/app/routes/public/contact.tsx).
3. **Multi-location không có dữ liệu phân tách.** Nếu dùng cùng backend cho cơ sở mới, lớp/gói/HLV/lead có nguy cơ trộn; cần quyết định nghiệp vụ và mô hình dữ liệu trước. [models](src_BE/app/models), [public.py](src_BE/app/api/public.py).
4. **Live Soul Đà Nẵng và repo Nha Trang có offer/flow khác nhau.** Sao chép tên, giá, Duo/Mat, Stripe, waitlist hoặc địa chỉ từ live site sẽ làm khách hiểu sai cơ sở mới. [Soul live](https://soulpilates.com.vn/), [repo scope](src_FE/docs/PRODUCT.md).

### Medium impact

1. “Đặt lịch tư vấn” không có chọn giờ; “Nhận bảng giá” không gửi ngữ cảnh bảng giá; phần success gợi ý gọi số đang thiếu. [consultation.tsx](src_FE/app/routes/public/consultation.tsx), [packages.tsx](src_FE/app/routes/public/packages.tsx).
2. Lịch công khai đưa thẳng người mới đến login, nhưng tài khoản do studio cấp. Không có public signup/lead CTA ngay màn lịch. [schedule.tsx](src_FE/app/routes/public/schedule.tsx), [login.tsx](src_FE/app/routes/auth/login.tsx).
3. Trang lớp học viên hiển thị “số buổi còn lại” từ gói ACTIVE đầu tiên, backend chọn gói đúng loại hết hạn sớm nhất. Nếu học viên có nhiều gói, forecast trước đặt có thể sai. [class-detail.tsx](src_FE/app/routes/student/class-detail.tsx), [booking_service.py](src_BE/app/services/booking_service.py).
4. Trang “Lịch của tôi” có copy “hủy bây giờ sẽ không được hoàn buổi” khi `can_cancel=false`, nhưng backend khóa hủy hoàn toàn. [my-schedule.tsx](src_FE/app/routes/student/my-schedule.tsx), [my_schedule.py](src_BE/app/api/my_schedule.py).
5. Nút “Tuần trước” trên lịch công khai có thể cho cảm giác xem lịch sử; endpoint chỉ trả lớp tương lai và tuần quá khứ rỗng. [schedule.tsx](src_FE/app/routes/public/schedule.tsx), [queries.ts](src_FE/app/features/public/queries.ts).
6. Backend cho phép Private sức chứa 2 (Duo nội bộ), trong khi chi tiết lớp học viên ghi mọi Private là “1 kèm 1”. Nếu staff tạo buổi capacity 2, lời mô tả sẽ sai. [scheduling.py](src_BE/app/services/scheduling.py), [class-detail.tsx](src_FE/app/routes/student/class-detail.tsx).

### Low impact / clarity

1. Form tư vấn lưu lựa chọn Group/Private trong text `need`, khiến staff không có filter loại lớp riêng. [consultation.tsx](src_FE/app/routes/public/consultation.tsx), [Lead](src_BE/app/models/people.py).
2. Giá `0` được backend cho phép nhưng UI dùng kiểm tra truthy `pack.price ?`, nên sẽ hiện như chưa có giá nếu studio thực sự tạo gói 0 đồng. [packages.tsx](src_FE/app/routes/public/packages.tsx), [money.py](src_BE/app/models/money.py).
3. Contact nói các kênh “đều được theo dõi” trong khi tất cả còn pending; đây là claim chưa có dữ liệu xác nhận. [contact.tsx](src_FE/app/routes/public/contact.tsx), [studio.ts](src_FE/app/content/studio.ts).

## 10. Open questions cho Business Owner (ưu tiên)

**P0 — quyết định trước IA, copy và data model**

1. Cơ sở Nha Trang tên chính thức là **Soul Pilates Nha Trang**, **J Pilates** hay một brand khác? Quan hệ với Soul Đà Nẵng được thể hiện thế nào?
2. Một website chung cho mọi cơ sở, hay mỗi cơ sở có domain/site riêng? Nếu chung, URL, tìm kiếm và default location nên là gì?
3. Khách chọn cơ sở trước khi xem lớp/gói/HLV, trước khi gửi lead, hay khi bắt đầu booking? Có được chuyển cơ sở giữa journey không?
4. Gói tập, buổi còn lại và tài khoản dùng được ở cả hai cơ sở hay chỉ nơi mua? Nếu chuyển cơ sở, ai chịu doanh thu và số buổi?
5. Giá, loại lớp, capacity, chính sách hủy và ưu đãi có giống nhau không? **Private là 1 giờ hay 8 giờ** tại cơ sở mới?
6. HLV có thể dạy nhiều cơ sở không? Nhân viên chỉ xem lead/học viên/lịch của cơ sở mình hay xem chung?
7. Lead được chuyển cho cơ sở/nhân viên nào? Khách phải chọn location trên form hay dùng số điện thoại riêng từng cơ sở?

**P1 — nội dung và conversion trước go-live**

8. Địa chỉ chính thức, link map, điện thoại, Zalo, giờ mở cửa, kênh liên hệ được ai xác nhận và khi nào?
9. Danh mục gói và giá nào được công khai? Có drop-in, trial, first-visit offer, membership, Mat, Duo, mixed package không? Repo hiện không xác nhận các offer này.
10. Khách mới có được tự đăng ký/mua/đặt lớp online không, hay luôn phải tư vấn và staff tạo tài khoản/gói? Có SLA callback được cam kết không?
11. “Buổi thứ hai mới tự đặt online” là policy bắt buộc hay chỉ hành trình thường gặp?
12. Ảnh phòng, ảnh HLV, bio và gallery nào thuộc đúng cơ sở Nha Trang và được phép công bố? Chủ có duyệt việc xóa dấu J cũ trên ảnh không?
13. Promotion áp dụng toàn brand hay từng cơ sở? Có điều kiện, ngày bắt đầu/kết thúc, mã ưu đãi hay chỉ thông báo?

**P2 — vận hành và đo lường**

14. Ai chịu trách nhiệm cập nhật lịch, giá, gói, HLV, thông báo cho từng cơ sở? Có cần báo cáo doanh thu/lead theo cơ sở?
15. Điều gì được tính là conversion chính cần đo: gửi lead, được gọi, mua gói, đặt buổi đầu, hay đến lớp? Hiện repo không có số đo funnel được xác nhận.
16. Có cần liên thông với hệ thống đang chạy tại Soul Đà Nẵng? Nếu có, nguồn dữ liệu nào là authoritative và cách xử lý học viên/gói hiện hữu ra sao?

---

# DESIGN_INPUT

## Business goal
Giới thiệu đúng dịch vụ và cơ sở mới; chuyển khách mới thành lead tư vấn; giúp học viên đã có tài khoản/gói tự đặt và quản lý lớp. Chưa được giả định web bán gói trực tuyến.

## Target users
Khách mới cân nhắc Group/Private; người muốn xem gói, lịch, HLV, địa điểm; học viên đã được studio cấp tài khoản/gói. Phân khúc nhân khẩu học chưa xác nhận.

## Primary conversion
Gửi form yêu cầu studio liên hệ: tên + điện thoại, tùy chọn nhu cầu/loại lớp. Đây không phải booking giờ tư vấn.

## Secondary conversions
Xem lịch/gói/HLV; liên hệ trực tiếp khi dữ kiện đã xác nhận; học viên đăng nhập và đặt buổi bằng gói còn hiệu lực.

## Required sections
Giới thiệu dịch vụ/cơ sở → hai hình thức Group/Private → phương pháp/điểm khác biệt đã có bằng chứng → gói/giá thực từ API hoặc trạng thái chưa có → lịch thật → HLV thật nếu được công bố → cách bắt đầu và form tư vấn → địa chỉ/kênh liên hệ đúng cơ sở. Thứ tự là đề xuất cho designer, không phải rule đã được owner duyệt.

## Required business rules
Gói gắn loại lớp, số buổi và thời hạn; đặt lớp trừ 1 buổi; chỉ học viên có account/gói hợp lệ được tự đặt; hủy/đổi trước hạn mới được hoàn; backend hiện Group 4h, Private 1h **nhưng public copy Private 8h — phải giải quyết trước publish**. Chỉ dữ liệu lớp/giá/HLV/thông báo được công bố mới hiển thị.

## Location-specific content
Tên cơ sở, địa chỉ/map, phone/Zalo, giờ, ảnh, HLV, lịch, loại lớp, giá, gói, promotion, lead routing, SEO. Repo chưa có branch/location model; toàn bộ phạm vi dùng chung hay riêng cần owner quyết định.

## Required CTA
Khách mới: gửi tư vấn; người đã có account/gói: đăng nhập → chọn lớp → xác nhận đặt; kênh gọi/nhắn chỉ xuất hiện khi đã xác nhận. CTA phải nói đúng hành động thực tế.

## Content that must not be lost
Phân biệt Group/Private, số buổi/thời hạn gói, điều kiện hoàn buổi, bước nhân viên tư vấn, lịch và người dạy thật, trạng thái không có dữ liệu. Không chuyển offer/địa chỉ/giá/claim của Soul Đà Nẵng sang Nha Trang theo suy đoán.

## Known issues to improve
Mâu thuẫn Private 8h/1h và nhãn 1:1 khi backend cho Private sức chứa 2; thiếu contact/location; brand Soul/J chưa rõ; đường lịch → login khó cho khách mới; không có location routing; lead form không mang ngữ cảnh gói/ưu đãi; forecast số dư có thể sai khi nhiều gói.

## Open questions
Tên thương hiệu; site chung hay riêng; điểm chọn cơ sở; gói/giá/quyền dùng chéo cơ sở; HLV/staff/lead scope; chính sách hủy; cách khách mới mua/đặt; dữ kiện và ảnh được duyệt.

## Constraints
- Đây là sản phẩm cho cơ sở mới có quan hệ với Soul theo brief, nhưng tên Nha Trang chưa xác nhận.
- Không bỏ business rule để đổi bố cục.
- Không invent dịch vụ, package, giá, địa chỉ, HLV, review hay chính sách.
- Phân biệt luồng repo Nha Trang với website Soul Đà Nẵng đang online.
