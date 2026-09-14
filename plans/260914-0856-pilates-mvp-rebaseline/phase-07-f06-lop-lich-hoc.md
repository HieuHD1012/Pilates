---
phase: 7
title: "F06 Lớp & lịch học"
status: in_progress
priority: P1
effort: "68h hợp đồng (BA 10 · BE 33 · FE 25) + ~22h lần chạy hai của F02/F04 + rework 15%"
dependencies: [5, 6]
---

# Phase 7: F06 — Lớp & lịch học

## Overview

Sáu hạng mục, cộng **lần chạy thứ hai của 3 hạng mục F02/F04** phụ thuộc `class_session`. Lịch lớp tuần là **màn hình vận hành chính**. Ba trong năm hạng mục thiết kế của brief nằm ở đây.

Cửa sổ BE: 09/10 → 19/10 · FE: 12/10 → 19/10.

## Trạng thái thực tế — cập nhật 2026-09-14

**BE: xong. FE: chưa bắt đầu.**

Exclusion constraint chặn trùng giờ HLV kể cả với hai yêu cầu đồng thời, và trả 409
nghiệp vụ chứ không phải 500. Lớp đã hủy không chiếm khung giờ. Lịch lặp lại có xem
trước và ghi all-or-nothing. Hủy lớp hoàn buổi cho cả người đặt chen vào giữa chừng —
test đua khẳng định thẳng vào phép khoá bằng `FOR UPDATE NOWAIT` từ kết nối khác, và
đã được kiểm lại bằng mutation là **đỏ đúng** khi gỡ khoá đi.

Không có API dời giờ, đúng phạm vi. Nhưng cột `has_reschedule_grace` vẫn còn ở
`src_BE/app/models/scheduling.py:131` — tàn dư của phạm vi cũ.

**Một tiêu chí đã lỗi thời vì phạm vi đổi ngày 14/09:** hàng chờ bị cắt, nên "hủy lớp
huỷ luôn mọi entry `WAITING`" không còn là điều kiện nghiệm thu. Mã vẫn dọn dữ liệu cũ
nên tiêu chí được tick kèm ghi chú, không xoá.

Việc **giữ bảng `waitlist_entry` làm dữ liệu lịch sử và chỉ gỡ router/service** là
quyết định đã ghi ở F00 và F07, không phải tàn dư bỏ quên — không endpoint nào mở ra.
Thứ thật sự là tàn dư chỉ có cột `has_reschedule_grace`.

Chưa có: toàn bộ lịch tuần, chip lớp, thước giờ, cột hôm nay, bố cục 400px.

## Requirements

| Hạng mục | Điều kiện hoàn thành |
|---|---|
| Lịch lớp ngày/tuần | Lọc được HLV/loại lớp; hiển thị chỗ trống |
| Tạo/chỉnh sửa lớp | Kiểm tra dữ liệu và **tránh trùng lịch** |
| Tạo lịch lặp lại | **Xem trước**, xử lý buổi trùng, **ghi all-or-nothing** |
| Chi tiết lớp & danh sách học viên | Danh sách cập nhật theo đăng ký |
| Phân công/thay HLV | **Không cho phép HLV bị trùng giờ** |
| Sửa/hủy lớp & xử lý xung đột | Cập nhật đăng ký và số buổi theo quy định |

**Lần chạy hai, ~22h** (red team finding #9): *Lịch lớp công khai* (F02, BE 2 / FE 4) · *Chi tiết HLV — thống kê tháng* (F04) · *Lịch dạy của tôi* (F04, BE 4 / FE 4). Ba hạng mục này là hàm của `class_session` nên không thể hoàn tất ở cửa sổ F02/F04 ban đầu.

## Architecture

### Sức chứa và loại lớp

- `GROUP`: sức chứa do nhân viên đặt khi tạo lớp. **Không hardcode con số nào** — đặc biệt không dùng 3 (số cơ sở Đà Nẵng, P3 cấm).
- `PRIVATE`: sức chứa 1; **Duo = Private sức chứa 2**.
- **Một HLV mỗi lớp** — `trainer_id` là khoá đơn.

### Chống trùng lịch

Exclusion constraint đã khai ở **F00** (schema `slot tstzrange` sinh tự động + `btree_gist`), nên phase này chỉ dùng, không đổi schema:

```sql
EXCLUDE USING gist (trainer_id WITH =, slot WITH &&) WHERE (status = 'SCHEDULED')
```

> **Mệnh đề `WHERE` là bắt buộc** (red team finding #6). Thiếu nó, một lớp đã `CANCELLED` vẫn chiếm chỗ thời gian của chính nó và chặn vĩnh viễn khung giờ đó của HLV — phá thẳng hạng mục "Sửa/hủy lớp & xử lý xung đột".

Vi phạm constraint khi đổi giờ/đổi HLV phải được bắt và trả **409 nghiệp vụ**, không để rơi thành 500.

### Lịch lặp lại

Sinh ra các bản ghi `class_session` cụ thể, không lưu quy tắc rồi tính lúc đọc — từng buổi cần sửa/hủy độc lập và gắn đăng ký.

- Chung `recurrence_id`.
- **Xem trước bắt buộc** trước khi ghi: liệt kê buổi sẽ tạo, đánh dấu buổi trùng giờ HLV, cho bỏ qua từng buổi.
- **Ghi là một transaction all-or-nothing.** Giữa lúc xem trước và lúc xác nhận, một nhân viên khác có thể tạo lớp xung đột; nếu buổi thứ 7/12 vi phạm constraint thì rollback toàn bộ và trả về danh sách buổi xung đột để xem trước lại. Không để lại nhóm `recurrence_id` ghi dở.

### Sửa/hủy lớp có người đăng ký

| Tình huống | Xử lý |
|---|---|
| Hủy lớp do studio | **Hoàn buổi cho mọi người đã đăng ký**, bất kể thời điểm. Ghi `CANCEL_REFUND` kèm lý do. Đóng nốt entry hàng chờ **lịch sử** còn `WAITING`/`PROMOTION_FAILED` — tính năng hàng chờ đã bỏ ngày 14/09, đây chỉ là dọn dữ liệu cũ. |
| Đổi giờ lớp | Không có thao tác này. Hủy lớp cũ, tạo lớp mới; học viên tự đăng ký. |
| Đổi HLV | Giữ đăng ký; kiểm HLV mới không trùng giờ. |

**Hủy lớp phải khoá, và phải theo đúng thứ tự khoá toàn cục** (`student_package` trước `class_session` — xem F07):

```
BEGIN;
  -- 1. Đọc KHÔNG khoá để biết gói nào bị ảnh hưởng
  SELECT DISTINCT student_package_id FROM booking
         WHERE class_session_id = :c AND status = 'BOOKED';
  -- 2. Khoá các gói đó theo THỨ TỰ id tăng dần (tránh deadlock giữa hai lần hủy)
  SELECT ... FROM student_package WHERE id = ANY(:ids) ORDER BY id FOR UPDATE;
  -- 3. Rồi mới khoá buổi lớp
  SELECT ... FROM class_session WHERE id = :c FOR UPDATE;
  UPDATE class_session SET status = 'CANCELLED';        -- ĐẶT TRẠNG THÁI TRƯỚC
  -- 4. Đọc LẠI bookings dưới khoá — có thể có người vừa chen vào ở bước 1→3
  SELECT bookings WHERE status = 'BOOKED' FOR UPDATE;   -- chỉ BOOKED
  với mỗi booking: CANCEL_REFUND +1 (qua credit_ledger.py)
  dọn waitlist_entry lịch sử còn WAITING/PROMOTION_FAILED (tính năng đã bỏ)
COMMIT;
```

> **Vì sao phải đọc hai lần.** Giữa bước 1 và bước 3 vẫn có thể có người đặt ghế cuối, và gói của người đó chưa nằm trong tập đã khoá ở bước 2. Người đó vẫn được hoàn đúng ở bước 4 — `credit_ledger.py` sẽ tự lấy khoá gói còn thiếu — nhưng vì `class_session` đã bị khoá ở bước 3, không ai chen thêm được nữa, nên vòng lặp hoàn là đầy đủ. Chấp nhận một lần lấy khoá ngoài thứ tự ở đúng nhánh hiếm này, đổi lại luồng đăng ký thường xuyên (F07) không bao giờ deadlock với hủy lớp.
>
> **Đã chốt ở phiên validate: dùng đúng trình tự trên** (đọc trước → khoá gói → khoá buổi lớp → đọc lại). Phương án bị loại là khoá `class_session` trước rồi retry khi `deadlock_detected` — đơn giản hơn nhưng đẩy deadlock vào luồng đăng ký, là luồng chạy nhiều nhất trong ngày.
<!-- Updated: Validation Session 1 - chốt thứ tự khoá phương án (a) -->

> **Red team finding #4.** Bản trước nói "trong một transaction" nhưng **không khoá** `class_session`, trong khi luồng đăng ký thì có khoá. Hệ quả: nhân viên hủy lớp, 200ms sau học viên D đặt ghế cuối — transaction của D lấy khoá ngay (vì transaction hủy không giữ khoá đó), đọc `status` vẫn là `SCHEDULED` (chưa commit), đặt thành công, trừ 1 buổi. Transaction hủy commit sau. **D giữ booking `BOOKED` trên một lớp đã `CANCELLED`, mất 1 buổi, không có dòng hoàn nào** — vì lúc vòng lặp hoàn chạy thì D chưa đăng ký. Tiêu chí "hoàn cho *mọi* người đã đăng ký" vẫn đọc như đã đạt.
>
> Lọc `status = 'BOOKED'` cũng là bắt buộc: thiếu nó, một booking đã hủy đúng hạn (đã hoàn 1 lần) sẽ được hoàn lần thứ hai.

**Chốt 2026-09-14:** không có dời giờ lớp hoặc cấp ân hạn. Muốn giờ khác thì hủy lịch cũ (hoàn BOOKED), tạo lịch mới và để học viên tự đăng ký. Thay HLV vẫn giữ giờ học.

Không tự gửi tin cho học viên — hệ thống chỉ đưa danh sách người cần liên hệ.

### Giao diện (Soul-1) — lịch tuần

1. **Thu thước giờ về khung thật studio dạy** — câu hỏi mở #4, phải chốt trước khi dựng.
2. **Tô nền cột "hôm nay"** — thay cho nhãn cỡ nhỏ phải đi tìm.
3. **Chip lớp** — hình chữ nhật kẻ, **góc vuông**, đường gáy **2px bên trái** mang **đúng một thông tin**: đầy hay còn chỗ.

Thêm: hình thức lớp **viết ra bằng chữ**, không mã hoá bằng màu. Thước giờ bên trái là cạnh đo. Header mang 4 số tổng của tuần. Thư viện lịch đã spike ở F00.

## Related Code Files

- Create: `src_BE/app/models/class_session.py`
- Create: `src_BE/app/services/{scheduling,recurrence}.py`
- Create: `src_BE/app/api/classes.py`
- Create: `src_BE/tests/{test_trainer_conflict,test_class_cancel_race,test_recurrence_atomicity}.py`
- Create: `src_FE/src/pages/classes/{week-view,form,detail,recurrence-preview}.tsx`
- Create: `src_FE/src/components/calendar/{class-chip,hour-ruler}.tsx`
- Modify: `src_FE/src/pages/trainer/my-schedule.tsx`, `src_FE/src/pages/trainers/detail.tsx`, `src_BE/app/api/public.py`

## Implementation Steps

1. Chốt khung giờ thật studio dạy và cách xử lý khoảng nghỉ (câu hỏi mở #4).
2. BE: model `class_session` dùng schema F00 (`starts_at`/`ends_at` timestamptz, cột `slot`, exclusion constraint).
3. BE: CRUD lớp; sức chứa Private = 1, Duo = 2; bắt vi phạm constraint thành 409 nghiệp vụ.
4. BE: `recurrence.py` — sinh buổi theo quy tắc tuần, trả bản xem trước có đánh dấu trùng; **ghi all-or-nothing**.
5. BE: đổi HLV có kiểm trùng giờ.
6. BE: **hủy lớp có khoá**, đặt trạng thái trước, lọc `status='BOOKED'`, hoàn qua `credit_ledger.py`, dọn dữ liệu waitlist lịch sử — một transaction.
7. BE: bỏ API/service đổi giờ lớp; kiểm đường cũ trả 404 và ân hạn lịch sử không mở lại hạn hủy.
8. BE: test chống trùng (gồm hai yêu cầu đồng thời); **test hủy lớp đua với đặt ghế cuối**; test tính nguyên tử của lịch lặp lại.
9. FE: `class-chip` theo đặc tả; `hour-ruler` theo khung giờ thật.
10. FE: lịch tuần — lọc HLV/loại lớp, cột hôm nay tô nền, 4 số tổng ở header.
11. FE: form tạo/sửa lớp; màn xem trước lịch lặp lại.
12. FE: chi tiết lớp + danh sách học viên đăng ký.
13. **Lần chạy hai của F02/F04**: nối lịch công khai, lịch dạy của tôi, và thống kê tháng ở chi tiết HLV vào nguồn thật; xác minh số lớp khớp lịch phân công.

## Success Criteria

- [ ] 6 hạng mục + 3 hạng mục lần chạy hai hoàn thành.
- [x] Không tạo được hai lớp chồng giờ cho cùng HLV — kể cả hai yêu cầu đồng thời.
- [x] Lớp đã hủy **không** chặn khung giờ của HLV (mệnh đề `WHERE` hoạt động).
- [x] Vi phạm trùng giờ trả 409 nghiệp vụ, không phải 500.
- [x] Lịch lặp lại có xem trước; ghi all-or-nothing; không để lại nhóm ghi dở.
- [x] **Hủy lớp hoàn buổi cho mọi người đăng ký, kể cả người đặt ngay trước thời điểm hủy** — có test đua.
- [x] Hủy lớp không hoàn hai lần cho booking đã hủy đúng hạn.
- [x] Hủy lớp đóng nốt entry hàng chờ lịch sử (`WAITING` và `PROMOTION_FAILED`) — **tiêu chí lỗi thời**, giữ lại vì mã vẫn dọn dữ liệu cũ; hàng chờ đã bị cắt khỏi phạm vi ngày 14/09.
- [x] Không có API dời giờ hoặc ân hạn; thay giờ qua hủy lớp và tạo lớp mới.
- [ ] Chip lớp: góc vuông, gáy 2px trái, đúng một thông tin.
- [ ] Hình thức lớp viết bằng chữ; **không thông tin nào chỉ mã hoá bằng màu**.
- [ ] Thước giờ theo khung thật, không còn khoảng trống lớn giữa trưa.
- [ ] Cột hôm nay tô nền.
- [x] Số lớp ở chi tiết HLV khớp lịch phân công.
- [x] Sức chứa Private = 1, Duo = 2; **không chỗ nào hardcode "3 người"**.
- [ ] Lịch tuần dùng tốt ở 400px; 0 card/pill/shadow; axe-core 0 lỗi serious+critical.

## Risk Assessment

- **Đua giữa hủy lớp và đặt chỗ** → học viên mất buổi vĩnh viễn trên lớp không tồn tại, và tiêu chí nghiệm thu vẫn đọc như đã đạt. Khoá + đặt trạng thái trước là bắt buộc.
- **Thư viện lịch không override được** → đã chặn bằng spike F00.
- **Trùng giờ lọt qua do chỉ kiểm ở tầng app** → exclusion constraint ở DB.
- **Đổi giờ cướp cửa sổ hủy** → lỗi nghiệp vụ âm thầm, học viên chịu thiệt vì studio đổi lịch.
- **33h BE + 22h lần chạy hai trong 8 ngày**, ngay trước F07 (41h). Đây là đoạn căng nhất của lịch.
