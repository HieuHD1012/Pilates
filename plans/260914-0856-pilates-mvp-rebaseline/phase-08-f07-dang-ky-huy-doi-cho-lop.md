---
phase: 8
title: "F07 Đăng ký, hủy, đổi & điểm danh lớp"
status: pending
priority: P1
effort: "88h hợp đồng (BA 16 · BE 41 · FE 31) + rework 15%"
dependencies: [6, 7]
---

# Phase 8: F07 — Đăng ký, hủy, đổi & điểm danh lớp

## Overview

Nghiệp vụ cập nhật theo xác nhận ngày 2026-09-14: chỉ học viên tự đăng ký,
hủy và đổi lớp; bỏ đặt hộ, hàng chờ và bước nhân viên xác nhận đăng ký.
HLV phụ trách điểm danh sau khi lớp kết thúc. Effort trên giữ số hợp đồng
để đối chiếu; chưa phải ước lượng lại cho phạm vi đã điều chỉnh.
Cửa sổ BE: 19/10 → 28/10 · FE: 19/10 → 27/10.

## Requirements

| Hạng mục | Người dùng | Điều kiện hoàn thành |
|---|---|---|
| Danh sách lớp | Học viên | Chỉ lớp còn chỗ, chưa bắt đầu và có gói phù hợp ngày học |
| Đăng ký | Học viên | BOOKED ngay, trừ 1 buổi, không cần xác nhận |
| Lịch của tôi | Học viên | Trạng thái, hạn hủy và quyền thao tác do server trả |
| Hủy/đổi lớp | Học viên | Đúng hạn hoàn buổi; sau hạn khóa; không hoàn lặp |
| Quản lý danh sách đăng ký | Admin/nhân viên | Chỉ xem, không đặt/hủy/đổi hộ |
| Điểm danh | HLV được gán lớp | Sau ends_at cập nhật ATTENDED/NO_SHOW, cho sửa nhầm, lưu audit |

## Architecture

### Quy tắc nghiệp vụ

- Gói ACTIVE, còn buổi, thuộc đúng học viên, khớp Group/Private.
  Gói còn hạn cả hôm nay và ngày starts_at theo Asia/Ho_Chi_Minh;
  được học ngày cuối gói. Chọn gói đủ điều kiện có end_date sớm nhất, hòa thì id.
- Lớp SCHEDULED, chưa bắt đầu, học viên chưa có lượt giữ chỗ.
  BOOKED/ATTENDED/NO_SHOW đều tính trong ràng buộc giữ chỗ và chống trùng.
- Đăng ký thành công ghi booking và BOOKING_DEDUCT -1 trong cùng transaction.
  Lớp đầy trả SESSION_FULL, không booking và không ledger. Không có hàng chờ.
- Group được hủy trước starts_at ít nhất 4 giờ; Private/Duo ít nhất 1 giờ.
  Đúng mốc hạn được hủy. Sau hạn trả CANCELLATION_CLOSED, giữ nguyên dữ liệu.
- Hủy đúng hạn hoàn +1 vào gói đã trừ, kể cả gói đó vừa hết hạn; số buổi được
  hoàn không tự kéo dài hạn gói. Hủy lặp không hoàn thêm.
- Đổi lớp = hủy + hoàn lớp cũ, đăng ký + trừ lớp mới trong một transaction.
  Lớp cũ quá hạn hoặc lớp mới không hợp lệ thì không thay đổi gì.
- Studio chỉ tạo/hủy lịch, không dời giờ và không cấp ân hạn. Hủy lớp cũ
  hoàn BOOKED; tạo lớp mới và để học viên tự đăng ký. Cờ ân hạn lịch sử không có hiệu lực.
- Studio hủy lớp chưa có điểm danh: hoàn mọi lượt BOOKED. ADMIN trả buổi thủ
  công cho ca đặc biệt qua ADMIN_ADJUST với lý do bắt buộc.
- HLV đọc GET /classes/{id}/attendance và PATCH /bookings/{id}/attendance.
  Sau ends_at mới được cập nhật ATTENDED/NO_SHOW; không thay đổi số buổi.
  Cho sửa nhầm, lưu người/thời điểm; gửi lặp giữ audit. Lượt/lớp đã hủy không
  được điểm danh. Lượt đã điểm danh không hủy/đổi; lớp đã điểm danh không hủy,
  hay đổi HLV. Dashboard báo lớp đã kết thúc còn chưa điểm danh.

### Phân quyền và đồng thời

require_student ở API và assert_can_act_on trong booking_service cùng chặn
đặt/hủy/đổi hộ. ADMIN/STAFF quản lý lớp, gói và xem danh sách; HLV điểm danh.

Thứ tự khóa toàn cục: student_package theo id tăng dần trước class_session.
Đổi lớp khóa hai lớp theo id tăng dần; hủy lớp studio đọc tập gói, khóa gói,
khóa lớp rồi đọc lại các lượt BOOKED cần hoàn. Sau khóa đọc lại trạng thái,
hạn gói, giờ học, sức chứa và số dư. Không chỉ dựa vào lần đọc /bookable.

Bốn lớp phòng vệ:

1. FOR UPDATE trên gói bảo vệ số dư khi đặt hai lớp khác nhau đồng thời.
2. FOR UPDATE trên lớp bảo vệ ghế và chặn đặt vào lớp vừa hủy.
3. Partial unique booking và composite FK chặn trùng và dùng gói người khác.
4. CHECK balance_cached >= 0 và constraint trigger đối soát ledger khi COMMIT.

Hủy chỉ UPDATE lượt còn BOOKED; rowcount khác 1 thì dừng, không ghi ledger.
Partial unique CANCEL_REFUND theo booking bảo vệ hoàn lần hai.
Bảng waitlist_entry lịch sử được giữ; router/service tính năng đã bỏ.

### Giao diện

Học viên liên hệ studio để admin cấp tài khoản nối hồ sơ; chưa có tự đăng ký.
Danh sách lớp dùng /my-schedule/bookable. Lịch dùng can_cancel để khóa hủy/đổi,
hiện cancel_deadline và kết quả điểm danh. Không có màn hàng chờ hay đặt hộ.
HLV có danh sách lớp mình dạy và lựa chọn Đã đến lớp / Vắng mặt sau ends_at.

## Related Code Files

- src_BE/app/services/{booking_service,credit_balance,attendance,report_queries}.py
- src_BE/app/api/{bookings,my_schedule,classes,reports}.py
- src_BE/tests/{test_registration_policy,test_booking_rules,test_booking_concurrency,test_cancel_idempotency,test_attendance_api}.py
- src_BE/tests/e2e/test_studio_scenario.py
- src_FE/src/pages/student/{class-list,class-detail,my-schedule}.tsx (chưa triển khai)
- src_FE/src/pages/bookings/manage.tsx và màn HLV điểm danh (chưa triển khai)

## Implementation Steps

1. BE kiểm gói còn hạn ngày học, trừ buổi khi đăng ký trong một transaction.
2. BE giới hạn STUDENT, bỏ router/service hàng chờ và quyền đặt hộ.
3. BE khóa hủy/đổi sau hạn; /my-schedule dùng chung quy tắc.
4. BE điểm danh và dashboard các lớp đã kết thúc còn lượt BOOKED.
5. Kiểm đồng thời ghế cuối, một buổi đặt hai lớp, đặt trùng, hủy lặp và đặt đua hủy lớp.
6. Kiểm biên hạn hủy Group/Private, hạn gói theo ngày studio dưới cả UTC và Asia/Ho_Chi_Minh.
7. FE dựng màn học viên, danh sách quản lý đọc và màn HLV điểm danh theo API.

## Success Criteria

- [ ] Chỉ học viên thao tác đăng ký của mình; nhân viên/HLV bị từ chối đặt hộ.
- [ ] Không có hàng chờ hoặc bước xác nhận đăng ký.
- [ ] Gói hợp lệ ngày học; lớp đầy không trừ buổi.
- [ ] Không vượt sức chứa, âm số dư, trừ đôi hoặc hoàn lặp khi đồng thời.
- [ ] Sau hạn khóa hủy/đổi; đúng hạn hoàn 1 buổi ở cả hai múi giờ test.
- [ ] Đổi lớp thất bại giữ nguyên booking và ledger.
- [ ] HLV điểm danh sau ends_at; vắng mặt không hoàn buổi.
- [ ] Bộ bảy bất biến ledger xanh; tài liệu và quyền API khớp mã nguồn.
- [ ] Giao diện dùng tốt ở 400px và thể hiện đúng hạn/trạng thái.

## Risk Assessment

Không cắt kiểm đồng thời, quyền sở hữu gói hoặc kiểm múi giờ: đây là các
đường có thể làm sai số buổi hoặc sức chứa. Cần ước lượng lại FE/BE và lịch
triển khai nếu thay đổi phạm vi ảnh hưởng effort hợp đồng; số 88h được giữ
cho đối chiếu, không dùng để tuyên bố phạm vi mới đã đủ ngân sách.
