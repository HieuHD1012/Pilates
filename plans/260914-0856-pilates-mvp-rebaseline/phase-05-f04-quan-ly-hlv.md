---
phase: 5
title: "F04 Quản lý HLV"
status: in_progress
priority: P2
effort: "24h hợp đồng (BA 3.5 · BE 9.5 · FE 11) + rework 15%"
dependencies: [2]
---

# Phase 5: F04 — Quản lý huấn luyện viên

## Overview

Bốn hạng mục: hồ sơ HLV, lịch dạy và số lớp.

Cửa sổ BE: 30/09 → 02/10 · FE: 02/10 → 06/10.
**Ngoại lệ:** *Chi tiết HLV — thống kê tháng* và *Lịch dạy của tôi* chỉ hoàn tất ở **lần chạy hai trong cửa sổ F06** — cả hai là hàm của `class_session`, chưa tồn tại ở phase này (red team finding #9). Phase này dựng phần hồ sơ không phụ thuộc lớp.

## Trạng thái thực tế — cập nhật 2026-09-14

**BE: xong. FE: chưa bắt đầu.**

Hồ sơ HLV, cờ `is_public`, validator chặn mẫu chứng chỉ trong `bio`, thống kê tháng
khớp lịch phân công và khớp báo cáo HLV ở F09 (có test biên tháng theo giờ studio).

Trang công khai không thể lộ chứng chỉ hay số điện thoại HLV vì allow-list chặn ở tầng
server — không phụ thuộc vào việc màn hình có nhớ giấu hay không.

Chưa có: màn hồ sơ HLV, nhãn cho ô ảnh trống.

## Requirements

| Hạng mục | Người dùng | Điều kiện hoàn thành |
|---|---|---|
| Danh sách HLV | Admin/nhân viên | Xem được HLV đang hoạt động |
| Tạo/chỉnh sửa HLV | Admin/nhân viên | Cập nhật hồ sơ và trạng thái thành công |
| Chi tiết HLV ‡ | Admin/nhân viên | **Số lớp khớp lịch được phân công** |
| Lịch dạy của tôi ‡ | HLV | **HLV chỉ xem lịch/danh sách lớp của mình** |

‡ phần phụ thuộc `class_session` hoàn tất ở lần chạy hai, cửa sổ F06.

## Architecture

### Hồ sơ HLV và trang công khai

`trainer.is_public` quyết định HLV có hiện trên trang công khai hay không. Hồ sơ nội bộ có thể đầy đủ, nhưng **phần hiển thị công khai không bao gồm chứng chỉ, bằng cấp hay số năm kinh nghiệm** cho tới khi studio cung cấp dữ liệu thật (P3).

`bio` và `specialties` là văn bản tự do do nhân viên nhập → **phải đi qua validator `content_rules` khi ghi** (F02), vì đây chính là đường nội dung bịa lọt lên trang công khai sau go-live. Để trống thì trang công khai không hiện mục đó, không hiện chuỗi rỗng.

Response công khai chỉ trả `full_name`, `photo_key`, `bio` — **không bao giờ `phone`** (allow-list ở F02).

### Thống kê số lớp

Tính trực tiếp từ `class_session` theo `trainer_id` và khoảng thời gian. Phải khớp con số ở báo cáo HLV (F09) — cùng nguồn, cùng kết quả.

Ở phase này chưa có lớp thật nên màn chi tiết hiển thị **trạng thái rỗng có nhãn**; không dựng số giả. Con số thật lên ở lần chạy hai.

### Lịch dạy của tôi

- Lọc theo `trainer_id` của người đang đăng nhập **ở tầng query**, không lọc sau khi lấy.
- HLV gọi thẳng API với `trainer_id` người khác phải nhận 403/404.
- Dùng lại `hour-ruler` từ F06 — nên màn này hoàn tất ở lần chạy hai.

### Giao diện (Soul-1)

- Danh sách HLV: bảng hairline, trạng thái hoạt động là badge bo 2px.
- Ảnh HLV chưa có → ô ảnh trạng thái rỗng có nhãn, giữ nguyên hình học.

## Related Code Files

- Create: `src_BE/app/api/trainers.py`
- Create: `src_BE/app/models/trainer.py`
- Modify: `src_BE/app/api/public.py` — nguồn HLV công khai, qua allow-list
- Create: `src_FE/src/pages/trainers/{list,form,detail}.tsx`
- Create: `src_FE/src/pages/trainer/my-schedule.tsx`

## Implementation Steps

1. BE: model `trainer` + migration; liên kết tuỳ chọn tới `user`.
2. BE: CRUD HLV + lọc theo trạng thái hoạt động; **`bio`/`specialties` đi qua validator `content_rules`**.
3. BE: nối nguồn HLV công khai vào `is_public`, qua schema allow-list.
4. BE: test — HLV truy cập hồ sơ/lịch của HLV khác bị từ chối.
5. FE: danh sách, form tạo/sửa, trang chi tiết (phần hồ sơ; thống kê ở trạng thái rỗng có nhãn).
6. *(Lần chạy hai, cửa sổ F06)* endpoint thống kê tháng từ `class_session`; endpoint + màn "Lịch dạy của tôi"; xác minh số lớp khớp lịch phân công.

## Success Criteria

- [ ] 4 hạng mục hoàn thành (2 hạng mục khép lại ở lần chạy hai).
- [x] Số lớp ở chi tiết HLV khớp lịch phân công và khớp báo cáo HLV ở F09.
- [x] HLV chỉ thấy lịch và danh sách lớp của mình; gọi thẳng API bằng id người khác bị từ chối.
- [x] Trang công khai không hiện chứng chỉ/bằng cấp/số năm kinh nghiệm, **không hiện số điện thoại HLV**.
- [x] `bio` chứa mẫu chứng chỉ bị validator từ chối khi ghi — có test.
- [x] `is_public` điều khiển đúng việc hiện HLV trên trang công khai.
- [ ] Ô ảnh HLV chưa có đều có nhãn trạng thái rỗng; không có số thống kê giả.
- [ ] Cổng CI Soul-1 xanh.

## Risk Assessment

- **Thống kê số lớp lệch lịch** → luôn tính từ `class_session`, cùng nguồn với F09.
- **Rò rỉ lịch giữa các HLV** → test gọi thẳng bằng id là bắt buộc.
- **`bio` là đường P3 lọt lên trang công khai** → validator khi ghi, không chỉ rà thủ công.
- **Hai hạng mục khép lại ở F06** → phải theo dõi, nếu không sẽ bị coi là xong trong khi mới có phần vỏ.
