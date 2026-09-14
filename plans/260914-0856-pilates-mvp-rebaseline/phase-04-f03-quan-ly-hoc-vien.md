---
phase: 4
title: "F03 Quản lý học viên"
status: pending
priority: P1
effort: "42h hợp đồng (BA 7 · BE 17 · FE 18) + rework 15%"
dependencies: [2]
---

# Phase 4: F03 — Quản lý học viên

## Overview

Bảy hạng mục: hồ sơ học viên và toàn bộ lịch sử liên quan. Các tab gói tập/thanh toán và lịch sử lớp dựng **khung** ở phase này, đổ dữ liệu thật khi F05 và F07 xong.

Cửa sổ BE: 25/09 → 30/09 · FE: 25/09 → 02/10.

## Requirements

| Hạng mục | Điều kiện hoàn thành |
|---|---|
| Danh sách học viên | Lọc theo trạng thái/gói; mở được hồ sơ |
| Tạo/chỉnh sửa học viên | Kiểm tra dữ liệu bắt buộc và **số điện thoại trùng** |
| Chi tiết học viên — tổng quan | Số buổi và thời hạn hiển thị **chính xác** |
| Tab gói tập & thanh toán | Đối chiếu được gói với giao dịch |
| Tab lịch sử lớp học | Lịch sử đúng theo thời gian và trạng thái |
| Ảnh tiến trình | Ảnh có phân quyền và xem được theo thời điểm |
| Chuyển khách quan tâm thành học viên | **Không nhập lại dữ liệu**; giữ lịch sử tư vấn |

## Architecture

### Số buổi hiển thị

Số buổi còn lại tính từ `credit_ledger` qua `credit_balance.py` — nguồn duy nhất cho mọi chỗ hiển thị. F00 chốt `balance_cached` làm biểu diễn thứ hai để đối soát có nghĩa; **`balance_cached` chỉ được ghi bởi `credit_ledger.py` trong cùng transaction với dòng ledger**, không bao giờ ghi rời.

**Chỉ tính gói đang hoạt động** (định nghĩa ở F00: `status = ACTIVE` và trong khoảng ngày và `SUM(delta) > 0`). Gói hết hạn còn buổi chưa dùng **không** bị thu hồi nhưng **không** vào số dư hiển thị — nếu không, màn này sẽ báo "còn 4 buổi" trên một gói đã chết và tiêu chí "số buổi hiển thị chính xác" trở thành sai.

Cảnh báo sắp hết hiện khi **≤6 buổi hoặc ≤15 ngày** — dùng chung `RENEWAL_THRESHOLD` từ F00.

### Ảnh tiến trình — phân quyền và upload

Người xem được: **Admin, HLV phụ trách học viên đó, và chính học viên đó.**

> Đã sửa sau red team (finding #5): ma trận ở F01 bản trước cho STAFF và **mọi** HLV xem được. Đáp án câu 15 không có STAFF; phạm vi "HLV" đang chờ khách làm rõ (câu hỏi mở #2a), mặc định an toàn là HLV phụ trách.

- Lưu ở storage **riêng tư**, không public bucket.
- Truy cập qua endpoint kiểm quyền hoặc signed URL ngắn hạn. Đoán đường dẫn không xem được.
- **Validate upload** (red team finding #15): sniff content-type (không tin phần mở rộng — file HTML/SVG đổi tên thành `.jpg` sẽ chạy trong origin nếu phục vụ từ API), giới hạn dung lượng, **re-encode phía server để bóc EXIF** — ảnh cơ thể mang toạ độ GPS nhà học viên, lưu dưới khoá ngẫu nhiên.
- Ảnh sắp theo thời điểm chụp để so sánh bắt đầu ↔ hiện tại.

### Chuyển lead → học viên

Một thao tác: đọc `lead`, tạo `student`, gán `lead.converted_student_id`, giữ nguyên bản ghi lead làm lịch sử. Số điện thoại đã tồn tại thì chặn và chỉ ra hồ sơ trùng.

### Giao diện (Soul-1)

- Danh sách 6 cột, **mọi cột đều là dữ kiện**. Số buổi còn lại canh phải, `tabular-nums`.
- Trạng thái phụ ("Cần gia hạn") nằm **dưới** badge chính, không thành badge thứ hai (P2).
- **Điểm neo mép trái** (hạng mục thiết kế #2) cho danh sách dài.
- **Ở 400px: xếp chồng theo hàng, giữ đủ 6 dữ kiện** (chốt ở phiên validate). Mỗi học viên là một khối, nhãn + giá trị phân tách bằng đường kẻ hairline. Không cuộn ngang, không giấu cột — nhân viên quét danh sách cần thấy đủ số buổi và trạng thái. Đổi lại mất khả năng so sánh xuống trang ở khổ hẹp; chấp nhận được vì thao tác chính trên điện thoại là tra cứu một người, không phải so sánh cả danh sách.
<!-- Updated: Validation Session 1 - 400px xếp chồng theo hàng -->
- Dữ liệu mẫu dùng `Học viên Demo 01` (P3).

## Related Code Files

- Create: `src_BE/app/api/students.py`, `src_BE/app/api/progress_photos.py`
- Create: `src_BE/app/models/{student,progress_photo}.py`
- Create: `src_BE/app/services/credit_balance.py`
- Create: `src_BE/app/services/lead_conversion.py`
- Create: `src_BE/app/core/upload_guard.py` — sniff type, giới hạn, re-encode/bóc EXIF
- Create: `src_BE/tests/test_photo_permissions.py`
- Create: `src_FE/src/pages/students/{list,form,detail}.tsx`
- Create: `src_FE/src/pages/students/tabs/{packages,class-history,photos}.tsx`
- Create: `src_FE/src/components/list-anchor.tsx`

## Implementation Steps

1. BE: model `student`, `progress_photo`; migration; unique số điện thoại.
2. BE: `credit_balance.py` — số dư từ ledger, **chỉ gói đang hoạt động**; nguồn duy nhất cho mọi chỗ hiển thị.
3. BE: CRUD học viên + lọc; lỗi số trùng chỉ ra hồ sơ đang giữ số đó.
4. BE: `upload_guard.py`; tải/xem ảnh qua endpoint kiểm quyền.
5. BE: test quyền ảnh cho đủ 4 vai, gồm **test âm cho STAFF và cho HLV không phụ trách**.
6. BE: `lead_conversion.py` + endpoint chuyển đổi.
7. FE: danh sách học viên 6 cột + điểm neo mép trái + lọc.
8. FE: form tạo/sửa với kiểm trường bắt buộc và số trùng.
9. FE: trang chi tiết — tổng quan + 3 tab. Tab chưa có dữ liệu thật dùng trạng thái rỗng có nhãn, **không dựng dữ liệu giả**.
10. FE: thao tác chuyển lead → học viên.
11. Chạy cổng CI Soul-1; đo lại measure trên bảng 6 cột (loại ô bảng khỏi phép đo trung vị).

## Success Criteria

- [ ] 7 hạng mục hoàn thành.
- [ ] Số buổi hiển thị khớp ledger và **chỉ tính gói đang hoạt động** — có test với gói hết hạn còn buổi.
- [ ] `balance_cached` không bao giờ được ghi ngoài `credit_ledger.py`.
- [ ] Số điện thoại trùng bị chặn và chỉ ra hồ sơ đang giữ số đó.
- [ ] Ảnh tiến trình: Admin/HLV phụ trách/chính học viên xem được; **STAFF và HLV không phụ trách bị từ chối** — có test âm.
- [ ] Học viên khác không xem được kể cả khi có đường dẫn.
- [ ] Upload từ chối file sai content-type và file quá lớn; ảnh lưu đã bóc EXIF.
- [ ] Chuyển lead → học viên không phải nhập lại; lịch sử tư vấn còn nguyên.
- [ ] Danh sách có điểm neo mép trái; dùng tốt ở 400px.
- [ ] Dữ liệu mẫu không có tên Việt trông như thật.
- [ ] Cổng CI Soul-1 xanh.

## Risk Assessment

- **Ảnh tiến trình rò rỉ** — dữ liệu nhạy cảm về cơ thể người thật. Ba lớp: ma trận quyền đúng, storage riêng tư, upload guard. Không bao giờ public bucket.
- **`balance_cached` lệch ledger** — nếu ghi rời thì biểu diễn thứ hai mất giá trị và phép đối soát quay về vô nghĩa. Chỉ một cổng ghi.
- **Số dư tính cả gói hết hạn** → tiêu chí "hiển thị chính xác" sai âm thầm.
- **Tab gói/lịch sử phụ thuộc F05, F07** — dựng khung trước, đổ dữ liệu sau. Không dựng dữ liệu giả để "trông đủ" (P3).
