---
phase: 9
title: "F08 Nhắc học viên sắp hết gói"
status: pending
priority: P2
effort: "20h hợp đồng (BA 4 · BE 8 · FE 8) + rework 15%"
dependencies: [8]
---

# Phase 9: F08 — Nhắc học viên sắp hết gói

## Overview

Ba hạng mục: lập danh sách học viên cần liên hệ gia hạn và ghi nhận kết quả chăm sóc. **Không gửi tin tự động.**

Cửa sổ: 28/10 → 30/10.

> Cùng F09, đây là một trong hai phase ứng viên hoãn đầu tiên nếu lịch trượt (giải phóng 20h BE ≈ 3 ngày critical path).

## Requirements

| Hạng mục | Điều kiện hoàn thành |
|---|---|
| Bảng tổng hợp nhắc gia hạn | Hiển thị đúng ngưỡng **6 buổi / 15 ngày** |
| Danh sách học viên sắp hết gói | Lọc theo số buổi, hạn và trạng thái liên hệ |
| Cập nhật kết quả liên hệ | Lưu lịch sử chăm sóc cơ bản |

## Architecture

### Ngưỡng nhắc

`RENEWAL_THRESHOLD` từ F00 — **còn ≤6 buổi HOẶC ≤15 ngày**. Quan hệ là HOẶC, không phải VÀ: người còn 20 buổi nhưng hết hạn sau 10 ngày vẫn cần liên hệ.

Lọc trên **gói đang hoạt động** theo định nghĩa của F00 (`status = ACTIVE` và trong khoảng ngày và `SUM(delta) > 0`) — trước đây cụm này được dùng mà chưa định nghĩa ở đâu.

Số buổi còn lại lấy từ `credit_balance.py` (F03).

Tính ngày theo `Asia/Ho_Chi_Minh`: ngưỡng "15 ngày" lệch 7 giờ sẽ đẩy người ra/vào danh sách sai ở đúng ngày biên.

Truy vấn trực tiếp, **không chạy job nền**: dữ liệu một studio đủ nhỏ, và job nền thêm một trạng thái phải đồng bộ mà không đổi lại giá trị gì (YAGNI). Đây cũng là lý do `EXPIRY_FORFEIT` bị loại khỏi enum ở F05 — không có chủ thể nào ghi được nó.

**Tương tác với gói hết hạn:** gói hết hạn còn buổi chưa dùng không bị thu hồi nhưng không còn "đang hoạt động", nên người đó **rời** danh sách nhắc. Nếu studio muốn vẫn gọi những người này thì cần một bộ lọc riêng "gói vừa hết hạn còn buổi" — chưa thuộc phạm vi, ghi nhận lại.

### Ghi nhận liên hệ

```
renewal_contact(id, student_id, contacted_at, result, next_contact_date, actor_user_id)
```

Nhiều lần liên hệ cho một học viên — append, không ghi đè. Danh sách hiện lần gần nhất + ngày hẹn lại; lọc ra được người vừa liên hệ để không gọi trùng.

Không gửi Zalo/WhatsApp/SMS. Có thể có nút **mở kênh** (deep link), không gửi nội dung.

### Giao diện (Soul-1)

- Bảng tổng hợp: **số ngồi trên đường kẻ, không trong hộp** — không phải hàng card KPI.
- Chỉ đổi màu con số cần xử lý.
- **Không hiện số liệu kinh doanh** (P3). Chỉ đếm người cần liên hệ.
- Số chưa có dữ liệu thì **để trống, không để 0**.
- Số buổi còn lại canh phải, `tabular-nums`.

## Related Code Files

- Create: `src_BE/app/models/renewal_contact.py`
- Create: `src_BE/app/api/renewals.py`
- Create: `src_BE/app/services/renewal_query.py`
- Create: `src_FE/src/pages/renewals/{summary,list,contact-form}.tsx`

## Implementation Steps

1. BE: model `renewal_contact` + migration.
2. BE: `renewal_query.py` — lọc **gói đang hoạt động** thoả ≤6 buổi HOẶC ≤15 ngày, dùng `credit_balance.py`, `RENEWAL_THRESHOLD`, và múi giờ studio.
3. BE: endpoint tổng hợp (đếm) + danh sách chi tiết có lọc.
4. BE: ghi nhận kết quả liên hệ, trả lịch sử theo học viên.
5. FE: bảng tổng hợp kiểu số trên đường kẻ.
6. FE: danh sách có lọc theo số buổi/hạn/trạng thái liên hệ.
7. FE: form ghi nhận kết quả + ngày hẹn lại; hiện lịch sử liên hệ.

## Success Criteria

- [ ] 3 hạng mục hoàn thành.
- [ ] Ngưỡng đúng: ≤6 buổi **hoặc** ≤15 ngày; có test cho từng nhánh và cho nhánh **chỉ thoả một điều kiện**.
- [ ] Chỉ lấy gói đang hoạt động theo định nghĩa F00.
- [ ] Ngày biên tính đúng theo `Asia/Ho_Chi_Minh`.
- [ ] Số buổi trong danh sách khớp ledger.
- [ ] Lịch sử liên hệ append, không ghi đè; lưu người thực hiện.
- [ ] **Không gửi tin tự động** ở bất kỳ đâu.
- [ ] Bảng tổng hợp: số trên đường kẻ, **0 card KPI**; không có số liệu kinh doanh.
- [ ] Ô chưa có dữ liệu để trống, không để 0.
- [ ] Cổng CI Soul-1 xanh.

## Risk Assessment

- **Hiểu nhầm ngưỡng thành VÀ** → bỏ sót người cần liên hệ. Test riêng cho nhánh chỉ thoả một điều kiện.
- **Trượt hàng card KPI** — bảng tổng hợp là nơi hệ Soul-1 dễ rò rỉ nhất; bản audit đã gọi tên đúng bố cục này.
- **Người có gói vừa hết hạn biến mất khỏi danh sách** — hệ quả của chính sách không thu hồi buổi. Ghi nhận, chờ studio quyết có cần bộ lọc riêng không.
