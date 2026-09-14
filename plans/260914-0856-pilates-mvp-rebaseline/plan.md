---
title: "Pilates Studio MVP — re-baseline & triển khai 58 hạng mục (Soul-1 · FastAPI)"
description: "Dựng mới BE (FastAPI/PostgreSQL) và FE (React/TS) cho web quản lý & đặt lớp Pilates một cơ sở; 58 hạng mục / 527 giờ + 15% rework; hướng giao diện Soul-1 đã chốt; re-baseline mốc sau khi 5/8 tuần dev trôi qua với 0 dòng code."
status: pending
priority: P1
branch: ""
tags: [pilates, mvp, fastapi, react, soul-1, re-baseline]
blockedBy: []
blocks: []
created: "2026-09-14T02:01:18.063Z"
createdBy: "ck:plan"
source: skill
---

# Pilates Studio MVP — re-baseline & triển khai 58 hạng mục

## Overview

Web quản lý & đặt lớp cho một studio Pilates tại Nha Trang. Bốn nhóm người dùng: khách xem website, studio/nhân viên, huấn luyện viên, học viên. Hai loại lớp: Group và Private (Duo = Private 2 khách).

Phạm vi: **58 hạng mục / 11 nhóm tính năng / 527 giờ công** + **15% quỹ rework**. Team: 1 BA/PM/Test + 1 BE + 1 FE.

Trạng thái xuất phát: `src_BE/` và `src_FE/` **rỗng**, chưa có git repo. Dựng mới hoàn toàn, BE và FE tách riêng, 2 người làm song song qua API contract chốt ở F00.

> **Tiền đề chưa xác minh — việc chặn số 1.** Kế hoạch này giả định dựng mới hoàn toàn. Nhưng `soul-doi-chieu.html` ghi đã đo DOM/CSSOM + axe-core trên **hai dev server chạy song song ngày 25.08**, sáu màn hình mỗi bản (gồm cả màn vận hành), và `brief-thiet-ke-soul-1.html` — đề ngày 14.09, tức hôm nay — viết thẳng: *"Không cần dựng lại toàn bộ 58 màn hình — hệ đã có và đang chạy."* Nếu bản dựng 25/08 còn dùng được, ngân sách FE đang bị thổi lên tới ~100h và mốc dưới đây sớm hơn đáng kể. Chủ dự án sẽ chốt sau; plan hiện baseline theo giả định dựng mới. Xem câu hỏi mở #6.

### Nguồn đầu vào

| Tài liệu | Vai trò |
|---|---|
| [docs/thiet-ke/soul-doi-chieu.html](../../docs/thiet-ke/soul-doi-chieu.html) | Đối chiếu Soul-1 / Soul-2 (25.08). **Soul-1 được chọn.** |
| [docs/thiet-ke/brief-thiet-ke-soul-1.html](../../docs/thiet-ke/brief-thiet-ke-soul-1.html) | Brief thiết kế: 5 bất biến, ngưỡng đo, quy tắc nội dung P3 |
| [docs/nguon/pham-vi-xac-nhan.xlsx](../../docs/nguon/pham-vi-xac-nhan.xlsx) | 51 chức năng + 15 câu xác nhận nghiệp vụ đã có đáp án |
| [docs/nguon/ke-hoach-mvp-noi-bo-2026.xlsm](../../docs/nguon/ke-hoach-mvp-noi-bo-2026.xlsm) | 58 hạng mục, effort theo vai, timeline gốc |

> **Xung đột nguồn đã xử lý:** sheet "Phạm vi & giả định" trong `.xlsm` (ảnh chụp 24.08) ghi ngưỡng hủy lớp "chưa điền". File `.xlsx` (13.09, mới hơn) đã có đáp án **Group 4h / Private 1h**. `.xlsx` là baseline nghiệp vụ; xác nhận mới của chủ dự án ngày 2026-09-14
được ưu tiên khi khác baseline. Xem [đối chiếu nguồn](../../docs/doi-chieu-nguon-va-nghiep-vu.md).

---

## Re-baseline tiến độ

Kế hoạch gốc: dev 10/08 → MVP 02/10. Ảnh chụp 24/08 của `.xlsm` ghi cả 58 hạng mục "Chưa bắt đầu". Hôm nay 14/09 — 5/8 tuần dev đã trôi qua, cửa sổ F02–F06 đều quá hạn.

### Chính sách: phạm vi cố định, thời gian là biến số

Quyết định ở phiên validate ban đầu: làm đủ 58 hạng mục; nếu trượt thì điều chỉnh lịch.
**Phạm vi đã được chủ dự án điều chỉnh ngày 2026-09-14:** bỏ hàng chờ và đặt hộ,
thêm điểm danh, khóa hủy sau hạn và kiểm gói tại ngày học.
Chốt tiếp: không dời lịch/ân hạn, không cần lịch sử ngày gia hạn; tự sửa hồ sơ
qua GET/PATCH /auth/me, dashboard đếm lượt đăng ký kể cả đã điểm danh. Các cắt bỏ này đã
được xác nhận; không cần xin lại. Số 58/527h ở kế hoạch là baseline hợp đồng,
chưa phải số lượng/ước lượng của phạm vi hiện tại. Thay đổi khác cần chốt riêng.

Hệ quả trực tiếp: các ngưỡng kích hoạt trong plan này là **tín hiệu để dự báo lại ngày**, không phải lệnh tự động cắt việc.

**Critical path tính theo từng vai, giờ không chuyển giữa BE và FE được:**

| Vai | Hợp đồng | Bổ sung sau red team + validate | Tổng | +15% rework | Ở nhịp 7h/ngày |
|---|---|---|---|---|---|
| BE (gồm 19h F10) | 215h | +4h transactional email | 219h | 252h | 36 ngày |
| **FE (gồm 17h F10)** | 195h | +20h cổng CI · +20h hệ token & specimen · +15h 4 màn admin | **250h** | **288h** | **42 ngày ← ràng buộc** |
| BA/PM/Test | 117h | — | 117h | 135h | 19 ngày |

| Mốc | Ngày |
|---|---|
| Dev hoàn tất (FE là vai sau cùng) | **11/11/2026** |
| Kiểm thử F10 (chạy chồng) | 12/10 → 11/11 |
| UAT + nhập liệu + PROD | 12/11 → 18/11 |
| **MVP** | **18/11/2026** |
| Tuần dự phòng | 19/11 → 25/11 |

> **Critical path đã chuyển từ BE sang FE.** Ba khoản bổ sung đều không nằm trong 58 hạng mục hợp đồng: cổng CI trên mọi màn hình bàn giao, hệ token + specimen tiếng Việt + đặc tả chip (FE tự làm, quyết định ở phiên validate — brief vốn giao cho bên thiết kế), và 4 màn "nội dung đơn giản" bị định giá dưới thực tế do bỏ Django admin. Đây là lý do mốc đi từ 10/11 sang 18/11.

Nhịp 7h/ngày cao hơn nhịp 5,4h/ngày mà kế hoạch gốc ngụ ý — hợp lý vì giả định "có AI hỗ trợ" đã ghi trong sheet, nhưng đây là **cam kết về nhịp làm việc**, không phải quan sát. Nếu thực tế về 5,4h/ngày thì MVP lùi thêm khoảng 2 tuần.

Mốc 02/10 cũ cần được đàm phán lại với khách.

**Các đòn rút ngắn — chỉ dùng khi được duyệt từng lần, không tự quyết:**
1. Xác minh bản dựng 25/08 (chủ dự án sẽ chốt sau) — nếu dùng được, trả lại tới ~100h FE, đúng vai đang là ràng buộc.
2. Thu cổng CI về bộ 8 màn đại diện — trả lại ~12h FE.
3. Hoãn F08 + F09 sang sau nghiệm thu — 20h BE, nhưng BE không còn là critical path nên gần như không rút ngắn được ngày.
4. Thêm 1 FE — vai đang thắt; chỉ có lãi nếu vào sớm.

---

## Quyết định đã khoá

### Công nghệ
- **Backend:** FastAPI + PostgreSQL + SQLAlchemy 2.x + Alembic + Pydantic v2.
- **Frontend:** React + TypeScript + Vite. Không SSR.
- **Múi giờ:** toàn hệ thống `Asia/Ho_Chi_Minh`. Mọi mốc thời gian lưu `timestamptz`. **Cấm naive datetime** ở tầng lint. Xem F00.
- **Lịch:** dùng thư viện có sẵn, **không tự xây calendar**. Phải override được tới cấp DOM để đạt chip Soul-1.
- **Hệ quả của FastAPI:** không có admin sẵn như Django. 527h được định giá **dưới giả định có trang quản trị sẵn cho nội dung đơn giản** (sheet "Phạm vi & giả định"), nên khoá phạm vi ở 58 hạng mục **không** tự thu hồi được số giờ đó. Bốn màn chịu ảnh hưởng — thông báo/khuyến mãi, danh sách tài khoản, khách quan tâm, tạo/sửa loại gói — được cộng thêm ~15h FE trong bảng rủi ro trên. `sqladmin` được giữ cho nội dung nội bộ hiếm dùng và **được tuyên bố là công cụ nội bộ, không phải màn hình bàn giao**, nên không nằm trong phạm vi cổng Soul-1; điều này ghi rõ ở F10 để tuyên bố "mọi màn hình bàn giao" không bị sai.

### Hướng giao diện — Soul-1

Cấu trúc đến từ chữ và đường kẻ. Ràng buộc áp cho mọi màn hình bàn giao:

| Ràng buộc | Mức |
|---|---|
| Card (khối bo góc ≥6px có nền/viền) | **0** |
| Pill (chip bo tròn hoàn toàn) | **0** — badge bo 2px, gần vuông |
| Node có đổ bóng | **0**, trừ lớp nổi thật: dialog, dropdown |
| Giá trị bo góc toàn hệ | ≤ 3 |
| Bậc chữ trên một màn hình | ≤ 6 |
| Bộ chữ | Newsreader + Be Vietnam Pro (không đổi) |
| Độ dài dòng, trung vị | **~55 cpl** |
| Lỗi axe-core serious + critical | **0** |
| Tương phản | WCAG AA, **chế độ sáng** |
| Thông tin mã hoá bằng màu | luôn có tầng thứ hai: chữ, ký hiệu hoặc vị trí |
| Chữ số cột so sánh | `tabular-nums`, canh phải |
| Dấu trừ trong sổ buổi | **U+2212**, không dùng hyphen |

> Các con số "0 card · 0 pill · 63 cpl" trong `soul-doi-chieu.html` là **số đo của bản dựng 25/08**, không phải trạng thái hiện tại của mã nguồn — hiện chưa có mã nguồn nào. Bảng trên là **ngưỡng mục tiêu**, không phải mô tả hiện trạng.

> **Dark mode đã bị cắt khỏi MVP.** Brief ghi "WCAG AA cả sáng và tối", nhưng brief đang mô tả một hệ đã có sẵn cả hai chế độ. Dựng theme thứ hai cho 58 màn hình từ đầu là 20–30h FE và không nằm trong 58 hạng mục nào. Nếu bản dựng 25/08 được thu hồi và đã có dark mode thì khôi phục lại miễn phí.

**Năm bất biến P1–P5:** một màn hình một chủ thể · một điều nói một lần · không bịa dữ kiện · một token một chức năng · tiếng Việt quyết định typography.

**Năm hạng mục thiết kế phải làm:** siết measure →55cpl (F00) · điểm neo mép trái cho danh sách dài (F03, F07) · tô nền cột "hôm nay" ở lịch tuần (F06) · nhãn cho ô ảnh đang chờ (F02) · thu thước giờ về khung thật studio dạy (F06).

> **Hệ token do FE tự làm** (quyết định ở phiên validate). Brief vốn gửi cho bên thiết kế và liệt kê thứ phải nhận về: hệ token, specimen tiếng Việt kèm ngưỡng leading từng bậc, 5 hạng mục ở cả desktop và 400px, đặc tả chip lớp, trạng thái rỗng. Team không có designer nên FE gánh toàn bộ, **cộng ~20h vào F00** — đây là một trong ba lý do FE trở thành critical path. Đổi lại: không phụ thuộc bên ngoài, không rủi ro chờ bàn giao, không rủi ro token sai từ đầu rồi phải sửa ở 58 màn hình.

### Quy tắc nội dung P3 — rủi ro cao nhất

**Cấm xuất hiện trên trang công khai:** chứng chỉ/bằng cấp/số năm kinh nghiệm HLV · tên Việt trông như thật trong dữ liệu mẫu (dùng `Học viên Demo 01`) · giờ mở cửa · số liệu kinh doanh (doanh thu, % tăng, tổng học viên) · cụm **"tối đa 3 người mỗi lớp"** (con số cơ sở Đà Nẵng).

**Giá gói:** dòng phạm vi khách đã xác nhận ghi *"Khách xem được nội dung**/giá** do studio công bố"*, và câu 12 khách đồng ý cung cấp thông tin gói. Quy tắc đúng là **hiện giá khi studio cung cấp, trạng thái rỗng có nhãn khi chưa có** — không phải cấm giá. Cấm bịa giá, không cấm giá. Đang chờ khách xác nhận (câu hỏi mở #2b).

**Phân biệt cần giữ:** lịch lớp công khai hiển thị các buổi *đã được xếp* là sự kiện có thật, hợp lệ. "Giờ mở cửa 7:30–19:30" là một khẳng định về studio mà chưa ai cung cấp — vẫn cấm.

**Cách xử lý chỗ trống:** giữ nguyên hình học cuối cùng, nhưng có nhãn nói thật — "Ảnh studio — đang chờ", không phải "Sắp ra mắt". Số chưa có thì **để trống, không để 0**.

**Cưỡng chế:** cổng CI grep bundle **không đủ** — nội dung công khai nằm trong DB (`announcement.body`, `trainer.bio`) do nhân viên nhập sau khi go-live. Bắt buộc thêm **validator phía server khi ghi** cho mọi trường đăng công khai. Xem F02.

### Quy tắc nghiệp vụ (từ `docs/nguon/pham-vi-xac-nhan.xlsx`)

| # | Quy tắc |
|---|---|
| 1 | Một cơ sở. Web responsive desktop + điện thoại. Chưa làm app. |
| 2 | Lớp: Group, Private. Duo = Private 2 khách. **Một HLV mỗi lớp.** |
| 3 | **Trừ 1 buổi ngay khi đăng ký thành công.** |
| 4 | Hủy đúng hạn → hoàn buổi. Ngưỡng: **Group 4 giờ, Private 1 giờ** trước giờ học, tính theo `Asia/Ho_Chi_Minh`. |
| 5 | Sau hạn → khóa hủy/đổi, giữ lượt và buổi đã trừ. **Admin được trả buổi thủ công** cho ca đặc biệt, bắt buộc lý do + người thực hiện. |
| 6 | Bỏ hàng chờ. Lớp đầy từ chối đăng ký, không trừ buổi; đăng ký thành công không cần xác nhận. |
| 7 | Chỉ học viên tự đăng ký/hủy/đổi cho chính mình; nhân viên và HLV không thao tác hộ. |
| 8 | Thanh toán: nhân viên ghi nhận tiền mặt/chuyển khoản. Không cổng online. |
| 9 | Nhắc gia hạn khi còn **≤6 buổi hoặc ≤15 ngày** — chỉ hiện danh sách, không tự gửi tin. |
| 10 | Zalo/WhatsApp: chỉ nút mở kênh. |
| 11 | Ảnh tiến trình: **Admin + HLV phụ trách + chính học viên đó**. Mặc định an toàn là HLV phụ trách, đang chờ khách xác nhận (câu hỏi mở #2a). |
| 12 | Studio cung cấp logo, ảnh, bài giới thiệu, thông tin gói và HLV. |
| 13 | Dữ liệu ban đầu nhập bằng file Excel. |
| 14 | Doanh thu **chỉ tính giao dịch đã xác nhận**. |
| 15 | **Chọn gói khi đặt lớp:** gói còn hạn cả hôm nay và ngày học, còn buổi, khớp loại lớp, có `end_date` sớm nhất. Quy tắc tất định, khai một chỗ. |
| 16 | **Gói hết hạn:** buổi chưa dùng **không bị thu hồi**; số dư hiển thị chỉ tính gói còn hiệu lực. Đang chờ khách xác nhận (đây là quy tắc tiền). |
| 17 | **VOID thanh toán:** **chặn `VOID` nếu gói đã tiêu buổi.** Buộc dùng `ADMIN_ADJUST` có lý do, để số buổi đã tiêu là một quyết định của con người có dấu vết, không phải hệ quả âm thầm của một lần đổi trạng thái. `VOID` chỉ cho phép khi gói chưa tiêu buổi nào. |

### Ngoài phạm vi giai đoạn này
Thanh toán online · tự gửi Zalo/WhatsApp/SMS · QR check-in, đánh giá HLV/lớp, ghi chú bài tập · lương/hoa hồng HLV · đa cơ sở/phòng/thiết bị · mobile app · báo cáo nâng cao · bộ icon mới · minh hoạ và motion · **dark mode**.

---

## Bất biến xuyên suốt

Nghiệp vụ bổ sung đã chốt ngày 2026-09-14: học viên liên hệ studio để admin
cấp tài khoản gắn hồ sơ, chưa có tự đăng ký. HLV được gán lớp điểm danh
ATTENDED/NO_SHOW sau ends_at, không đổi số buổi; lượt đã điểm danh không
hủy/đổi được, lớp đã có kết quả không hủy/đổi HLV được.
Chốt thêm: chỉ học viên đăng ký, bỏ hàng chờ; gói phải còn hạn ngày học;
quá hạn Group 4h / Private-Duo 1h thì khóa hủy/đổi. Xác nhận mới này thay
thế các mô tả hàng chờ/đặt hộ trong phần lịch sử review bên dưới.

1. **Sổ buổi append-only.** Không cột số dư nào sửa trực tiếp. Mọi biến động là một dòng ledger có `actor`, `reason`, `timestamp`.
   **Đối soát phải là mệnh đề kiểm được, không phải phép lặp thừa.** Vì số dư *được định nghĩa* là `SUM(delta)`, khẳng định "số dư = `SUM(delta)`" luôn đúng và vô giá trị. Bộ bất biến thật:
   - `SUM(delta) >= 0` cho mọi `student_package`
   - mỗi `booking` đang hoạt động có **đúng một** `BOOKING_DEDUCT`, và dòng đó trỏ đúng `student_package_id` của booking
   - mỗi `booking_id` có **tối đa một** `CANCEL_REFUND`
   - mọi `BOOKING_DEDUCT` có booking tương ứng, và ngược lại
   - `SUM(delta)` không vượt `credits_snapshot` + gia hạn + điều chỉnh
   - mọi `ADMIN_ADJUST` có `note` khác rỗng và `actor_user_id`
   - `student_package` của mọi dòng ledger thuộc đúng học viên của booking
2. **Không vượt sức chứa, không trừ đôi buổi, không âm số dư.** Mọi thao tác khoá **cả `student_package` lẫn `class_session`**, theo thứ tự cố định (`student_package` trước) để tránh deadlock. Khoá riêng `class_session` **không** bảo vệ số dư: hai lớp khác giờ là hai hàng khác nhau. Thêm ràng buộc số dư không âm ở tầng DB.
3. **Mọi thay đổi trạng thái lưu người thực hiện.** Booking (gồm điểm danh), ledger, thanh toán (gồm xác nhận và huỷ), đổi HLV, hủy lớp.
4. **Ngưỡng Soul-1 là cổng CI.** Đo trên DOM đã render với computed style — không quét CSSOM, vì CSSOM là toàn cục và không nói được "mỗi màn hình".

---

## Phases

| # | Mã | Tên | BE | FE | BA | Tổng | Cửa sổ (đã cộng rework) |
|---|---|---|---|---|---|---|---|
| 1 | F00 | [Nền tảng & chốt nghiệp vụ](./phase-01-f00-nen-tang-chot-nghiep-vu.md) | 22 | 14 | 18 | 54h | 14/09 → 18/09 |
| 2 | F01 | [Tài khoản & phân quyền](./phase-02-f01-tai-khoan-phan-quyen.md) | 15 | 14 | 5 | 34h | 18/09 → 23/09 |
| 3 | F02 | [Website & khách quan tâm](./phase-03-f02-website-khach-quan-tam.md) | 8.5 | 23 | 6.5 | 38h | 23/09 → 29/09 ‡ |
| 4 | F03 | [Quản lý học viên](./phase-04-f03-quan-ly-hoc-vien.md) | 17 | 18 | 7 | 42h | 25/09 → 02/10 ‡ |
| 5 | F04 | [Quản lý HLV](./phase-05-f04-quan-ly-hlv.md) | 9.5 | 11 | 3.5 | 24h | 30/09 → 06/10 ‡ |
| 6 | F05 | [Gói tập, số buổi & thanh toán](./phase-06-f05-goi-tap-so-buoi-thanh-toan.md) | 30 | 23 | 11 | 64h | 02/10 → 12/10 |
| 7 | F06 | [Lớp & lịch học](./phase-07-f06-lop-lich-hoc.md) | 33 | 25 | 10 | 68h | 09/10 → 19/10 |
| 8 | F07 | [Đăng ký, hủy, đổi & điểm danh lớp](./phase-08-f07-dang-ky-huy-doi-cho-lop.md) | 41 | 31 | 16 | 88h | 19/10 → 28/10 |
| 9 | F08 | [Nhắc học viên sắp hết gói](./phase-09-f08-nhac-hoc-vien-sap-het-goi.md) | 8 | 8 | 4 | 20h | 28/10 → 30/10 |
| 10 | F09 | [Báo cáo cơ bản](./phase-10-f09-bao-cao-co-ban.md) | 12 | 11 | 6 | 29h | 30/10 → 03/11 |
| 11 | F10 | [Kiểm thử, nghiệm thu & triển khai](./phase-11-f10-kiem-thu-nghiem-thu-trien-khai.md) | 19 | 17 | 30 | 66h | 12/10 → 18/11 |

Tổng hợp đồng: **527h / 58 hạng mục**. Cộng rework 15%: **606h**.

> **Cửa sổ trong bảng là nhịp do BE dẫn.** Sau phiên validate, FE gánh thêm ~55h (cổng CI, hệ token, 4 màn admin) nên **FE kết thúc muộn hơn cột này**, và mốc dev hoàn tất 11/11 là do FE quyết định, không phải BE. Không cố chia 55h đó vào từng ô cho ra vẻ chính xác — theo dõi bằng tổng giờ FE còn lại, không bằng cửa sổ phase.

‡ **Ba hạng mục hoàn tất ở lần chạy thứ hai trong cửa sổ F06**, vì chúng là hàm của `class_session` (chưa tồn tại trước F06): *Lịch lớp công khai* (F02), *Chi tiết HLV — thống kê tháng* (F04), *Lịch dạy của tôi* (F04). Tổng ~22h. Lần chạy đầu chỉ dựng phần không phụ thuộc lớp.

### Phụ thuộc

| Phase | Chặn bởi |
|---|---|
| F00 Nền tảng | — |
| F01 Tài khoản | F00 |
| F02 Website · F03 Học viên · F04 HLV | F01 (phần phụ thuộc `class_session`: **F06**) |
| F05 Gói & sổ buổi | F03 |
| F06 Lớp & lịch | F04, F05 |
| F07 Booking | F05, F06 |
| F08 Nhắc gia hạn · F09 Báo cáo | F07 |
| F10 Kiểm thử & nghiệm thu | bắt đầu sớm nhất 12/10, chạy chồng; nghiệm thu cần F07, F08, F09 |

---

## Điều kiện nghiệm thu MVP

- [ ] Đủ 58 hạng mục hoàn thành, không còn lỗi nghiêm trọng.
- [ ] Luồng chính đúng đầu-cuối: bán gói → đăng ký → trừ buổi → hủy đúng hạn → hoàn buổi.
- [ ] **Bộ bất biến ledger ở mục "Bất biến xuyên suốt" #1 chạy xanh trên toàn bộ dữ liệu** (7 mệnh đề, mỗi mệnh đề có thể fail).
- [ ] Không lớp nào vượt sức chứa và **không số dư nào âm** dưới tải đặt chỗ đồng thời, gồm cả đặt hai lớp khác giờ cùng lúc.
- [ ] Quy tắc hủy đúng ở mốc biên, kiểm với cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`, cho ra kết quả giống nhau.
- [ ] Phân quyền đúng: HLV chỉ lớp mình; học viên chỉ dữ liệu mình; khoá tài khoản làm mất hiệu lực token đang dùng.
- [ ] API công khai không trả PII ngoài allow-list.
- [ ] 0 lỗi axe-core serious + critical trên mọi màn hình bàn giao (không tính công cụ nội bộ `sqladmin`).
- [ ] Ràng buộc Soul-1 đạt ngưỡng, đo trên DOM đã render.
- [ ] Không vi phạm P3 — cổng CI, validator phía server, và rà thủ công **sau khi nhập dữ liệu thật**.
- [ ] Màn hình chính dùng tốt ở 400px.
- [ ] Nhập dữ liệu chạy lại được nhiều lần không nhân đôi số dư.
- [ ] Khách xác nhận UAT; hệ thống chạy PROD.

---

## Rủi ro

| Rủi ro | Ảnh hưởng | Xử lý |
|---|---|---|
| **FE là critical path (288h sau rework)** | Cao | Đã tính vào mốc 18/11. Theo dõi sát F00 — nếu hệ token hoặc cổng CI vượt dự toán, **dự báo lại ngày**, không tự cắt việc |
| Tiền đề "dựng mới" có thể sai (bản dựng 25/08) | Trung bình | Chủ dự án chốt sau. Nếu dùng được thì rút ngắn đúng vai đang thắt |
| Đồng thời: trừ đôi buổi / số dư âm / vượt sức chứa | Cao | Khoá cả `student_package` và `class_session`, thứ tự cố định; CHECK số dư ≥ 0; test đặt hai lớp khác giờ |
| Múi giờ sai → mọi lần hủy muộn đều được hoàn | Cao | `timestamptz` + `Asia/Ho_Chi_Minh` ở F00; test biên chạy hai TZ |
| Vi phạm P3 lọt lên trang công khai | Cao | Validator phía server khi ghi + cổng CI + rà thủ công sau nhập liệu |
| Thư viện lịch không override được về chip Soul-1 | Cao | Spike trong F00, trước F06 |
| BE là nút thắt (247h/1 người) | Cao | BA dư slack; các đường rút ngắn đã liệt kê |
| Khách chậm trả lời 3 câu chặn F05/F06/F07 | Trung bình | Gửi trong tuần F00, không đợi phase liên quan |
| Dữ liệu ban đầu về trễ; nhập liệu không idempotent | Trung bình | Template giao từ F00; import có khoá ngoài + dry-run; diễn tập trước 12/11 |
| Hệ Soul-1 nghiêm ngặt nên dễ rò rỉ | Trung bình | Cổng CI đếm số, không dựa vào tự giác |
| Không có bên thiết kế trong team | Trung bình | Chốt bên thiết kế + hạn giao, hoặc FE tự làm và cộng giờ |

---

## Câu hỏi mở

Còn lại toàn bộ là **câu hỏi cho khách/studio** — mọi quyết định kỹ thuật nội bộ đã chốt ở phiên red team và validate.

1. **Mốc 18/11 khách có chấp nhận không?** Kế hoạch cũ cam kết 02/10.
2. **Ba câu gửi khách trong tuần F00:**
   a. "HLV" ở câu 15 nghĩa là mọi HLV hay chỉ HLV phụ trách học viên đó? (ảnh cơ thể — mặc định an toàn: HLV phụ trách)
   b. Giá gói có hiển thị công khai khi studio cung cấp không? (dòng đã xác nhận ghi "nội dung/giá")
   c. Cộng buổi khi tạo gói hay khi xác nhận thanh toán? **Chặn F05 → F07.**
3. **Gói hết hạn có thu hồi buổi chưa dùng không?** Quy tắc tiền. Mặc định: không thu hồi.
4. **Khung giờ thật studio dạy?** Chặn thước giờ F06.
5. **Studio giao dữ liệu ban đầu ngày nào?** Hạn cũ 18/09 đặt khi lịch chưa trượt.
6. *(Chủ dự án chốt sau)* Bản dựng Soul-1 trên dev server 25/08 có dùng lại được không — nếu có, rút ngắn đúng vai đang là critical path.

---

## Red Team Review

### Session — 2026-09-14
**Findings:** 40 thô → 15 sau khi gộp trùng (15 chấp nhận, 0 từ chối)
**Severity:** 10 Critical, 5 High
**Reviewers:** Security Adversary · Failure Mode Analyst · Assumption Destroyer · Scope & Complexity Critic

| # | Finding | Mức | Xử lý | Áp vào |
|---|---|---|---|---|
| 1 | Đối soát ledger là tautology, không thể fail | Critical | Accept (đóng khung lại: thay bằng 7 mệnh đề kiểm được, không xoá script) | plan.md, F05, F10 |
| 2 | Khoá `class_session` không bảo vệ số dư → số dư âm | Critical | Accept | plan.md, F00, F07 |
| 3 | Booking không kiểm `student_package_id` thuộc đúng học viên | Critical | Accept | F00, F07 |
| 4 | Hủy lớp không khoá → booking chen vào, mất buổi | Critical | Accept | F06 |
| 5 | Ma trận quyền cho STAFF + mọi HLV xem ảnh cơ thể | Critical | Accept | F01, F03, plan.md |
| 6 | Không múi giờ; naive datetime; exclusion constraint không dựng được | Critical | Accept | plan.md, F00, F06, F07 |
| 7 | Tính lịch bỏ sót 19h BE của F10; không quỹ rework; 22/10 và 30/10 là cùng một ngày | Critical | Accept | plan.md |
| 8 | Tiền đề "dựng mới" mâu thuẫn 2 tài liệu nguồn; số đo 25/08 bị trình bày như hiện trạng | Critical | Accept | plan.md |
| 9 | F02/F04 có 22h phụ thuộc `class_session` của F06 → dựng hai lần | Critical | Accept | plan.md, F02, F04, F06 |
| 10 | Lập luận chặn rủi ro admin FastAPI là vòng tròn; sqladmin fail 4/6 cổng | Critical | Accept | plan.md, F10 |
| 11 | Dark mode là tiêu chí nghiệm thu với 0 giờ ngân sách | High | Accept — cắt khỏi MVP | plan.md, F10 |
| 12 | Cổng P3 grep bundle nhưng nội dung nằm trong DB; rà tay trước khi nhập liệu | High | Accept | F00, F02, F10 |
| 13 | Không kênh gửi link đặt lại mật khẩu; không thu hồi session; không chặn brute-force | High | Accept | F00, F01 |
| 14 | Máy trạng thái buổi thủng: hủy không idempotent, waitlist thiếu actor/trạng thái lỗi, VOID không hoàn buổi, đổi giờ cướp cửa sổ hủy, `EXPIRY_FORFEIT` vô chủ | High | Accept | F00, F05, F06, F07, F08 |
| 15 | API: public thiếu allow-list, không sanitize/validate upload/CORS, export formula injection, authz ngoài booking service | High | Accept | F00, F01, F02, F03, F07, F09 |

**Quyết định của người dùng kèm theo:** quỹ rework 15% · chỉ cắt dark mode (giữ 6 cổng CI, giữ cpl/bậc chữ, giữ sqladmin) · gửi khách 3 câu trong tuần F00.

Hai finding được đóng khung lại thay vì lấy nguyên văn: reviewer đề nghị **xoá** script đối soát — giữ script nhưng thay bằng 7 bất biến kiểm được. Reviewer đề nghị **bỏ** exclusion constraint — giữ ở tầng DB nhưng đẩy cột range + `btree_gist` vào migration F00 để F06 không phải đổi schema trong tuần căng nhất.

Giữ cpl và bậc chữ theo quyết định người dùng, nhưng **cơ chế đo phải đổi**: reviewer chỉ ra CSSOM là toàn cục nên không đo được "mỗi màn hình". Chuyển sang đo computed style trên DOM đã render.

### Whole-Plan Consistency Sweep

Đã đọc lại `plan.md` và cả 11 `phase-*.md` sau khi áp findings.

**Đã kiểm và sạch:** không còn mệnh đề đối soát tautology · `EXPIRY_FORFEIT` chỉ xuất hiện ở chỗ nói rõ đã loại · không còn `date`+`start_time` naive ngoài câu cấm · cột `position` của waitlist đã bỏ khỏi schema và chỉ còn trong câu giải thích vì sao bỏ · mốc 06/11 và cặp 22/10–30/10 giả đã gỡ, chỉ còn là cửa sổ phase hợp lệ · dark mode chỉ còn trong câu "đã cắt" và đã vào danh sách ngoài phạm vi · `sqladmin` được tuyên bố nhất quán là công cụ nội bộ ở cả `plan.md` và F10 · ma trận ảnh tiến trình loại STAFF và giới hạn HLV phụ trách ở cả ba file · 11 liên kết phase phân giải đúng · effort vẫn khớp hợp đồng `.xlsm` (BA 117 / BE 215 / FE 195 = 527h).

**Một mâu thuẫn phát sinh từ chính các bản sửa, đã xử lý:** bản sửa finding #4 cho hủy lớp khoá `class_session` trước, trong khi bản sửa finding #2 cho đăng ký khoá `student_package` trước → **thứ tự ngược nhau, deadlock** giữa F06 và F07. Đã thêm quy tắc **thứ tự khoá toàn cục** (`student_package` trước `class_session`) vào F00 như một quyết định phải chốt, và viết lại luồng hủy lớp ở F06 để tuân thủ, kèm phương án thay thế có retry.

**Không còn mâu thuẫn chưa giải quyết.**

---

## Validation Log

### Session 1 — 2026-09-14
**Câu hỏi:** 7 · **Quyết định chốt:** 7 · **Phase bị ảnh hưởng:** F00, F01, F03, F05, F06, F10

Verification pass nặng được bỏ qua theo guard của quy trình — `## Red Team Review` đã có với evidence đầy đủ. Quét `[UNVERIFIED]`: không còn tag nào.

| # | Câu hỏi | Quyết định | Áp vào |
|---|---|---|---|
| 1 | Cơ chế chặn số dư âm | **Cột `balance_cached` + `CHECK >= 0`**, ghi duy nhất qua `credit_ledger.py`. Tạo biểu diễn thứ hai độc lập → phép đối soát trở nên kiểm được thật | F00, F05 |
| 2 | Thứ tự khoá, tránh deadlock F06↔F07 | **Phương án (a)** — hủy lớp đọc trước không khoá → khoá gói theo `id` → khoá `class_session` → đọc lại dưới khoá. Luồng đăng ký thường xuyên không bao giờ deadlock | F00, F06, F07 |
| 3 | Kênh gửi link đặt lại mật khẩu | **Transactional email (~4h BE)**. Token không bao giờ trả trong response; đổi mật khẩu ADMIN phải nhập mật khẩu hiện tại | F00, F01 |
| 4 | Bảng 6 cột ở 400px | **Xếp chồng theo hàng, giữ đủ 6 dữ kiện**, phân tách bằng hairline. Không cuộn ngang, không giấu cột | F00, F03 |
| 5 | `VOID` thanh toán sau khi đã tiêu buổi | **Chặn `VOID` nếu gói đã tiêu buổi**; buộc dùng `ADMIN_ADJUST` có lý do. Gói chưa tiêu buổi thì `VOID` kèm `PAYMENT_VOID` đối ứng | F05 |
| 6 | Ai sở hữu hệ token | **FE tự làm** (brief vốn giao bên thiết kế). +20h vào F00. Không phụ thuộc bên ngoài, không rủi ro chờ bàn giao | F00 |
| 7 | Đòn rút ngắn uỷ quyền trước | **Không uỷ quyền gì.** Làm đủ 58 hạng mục; nếu trượt thì điều chỉnh lịch. Mọi việc cắt phạm vi đều phải hỏi | plan.md |

**Hệ quả lên tiến độ — mốc đổi 10/11 → 18/11.** Quyết định #3 (+4h BE) và #6 (+20h FE), cộng với hai khoản red team đã thêm trước đó (+20h cổng CI, +15h bốn màn admin), đẩy FE lên 250h hợp đồng → 288h sau rework → **42 ngày làm việc, vượt BE (36 ngày)**. Critical path chuyển từ BE sang FE. Đây là kết quả trực tiếp và nhất quán với quyết định #7: phạm vi cố định, thời gian là biến số.

### Whole-Plan Consistency Sweep

Đã đọc lại `plan.md` và cả 11 `phase-*.md` sau khi propagate 7 quyết định.

**Đã sửa trong lượt quét này:**
- 7 tham chiếu "câu hỏi mở #N" bị lệch số sau khi danh sách câu hỏi được rút gọn (các câu đã chốt bị gỡ) → đánh số lại theo danh sách mới.
- F05 bước 6 còn ghi *"quy tắc `VOID` → hệ quả số buổi theo (a) hoặc (b), chốt cùng khách"* → thay bằng quy tắc đã chốt.
- F05 và F00 còn gọi `balance_cached` là "khuyến nghị (b)" → đổi thành quyết định đã chốt.
- Mốc UAT cũ 04/11 → 10/11 còn ở 6 chỗ trong F02, F10 và `plan.md` → đồng bộ về 12/11 → 18/11.
- F10 còn ghi "19h BE nằm trong critical path 215h" → BE không còn là critical path, đã sửa.
- Bảng phase: thêm ghi chú rằng cửa sổ là nhịp do BE dẫn và FE kết thúc muộn hơn, thay vì chia 55h bổ sung vào từng ô cho ra vẻ chính xác.

**Đã kiểm và sạch:** hiệu lực hợp đồng 527h (BA 117 / BE 215 / FE 195) vẫn khớp `.xlsm` · dark mode chỉ còn trong câu "đã cắt" · `sqladmin` nhất quán là công cụ nội bộ · ma trận ảnh tiến trình loại STAFF, giới hạn HLV phụ trách ở cả ba file · thứ tự khoá toàn cục nhất quán ở F00/F06/F07 · 11 liên kết phase phân giải đúng.

**Không còn mâu thuẫn chưa giải quyết.**
