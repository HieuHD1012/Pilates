---
phase: 10
title: "F09 Báo cáo cơ bản"
status: pending
priority: P2
effort: "29h hợp đồng (BA 6 · BE 12 · FE 11) + rework 15%"
dependencies: [8]
---

# Phase 10: F09 — Báo cáo cơ bản

## Overview

Bốn hạng mục. Nguyên tắc xuyên suốt: **mọi con số phải đối chiếu được với danh sách chi tiết** — không mở ra xem được các dòng tạo nên nó thì con số đó không có chỗ trên màn hình.

Cửa sổ: 30/10 → 03/11.

## Requirements

| Hạng mục | Điều kiện hoàn thành |
|---|---|
| Bảng tổng hợp quản lý | Số liệu **đối chiếu được với danh sách chi tiết** |
| Báo cáo doanh thu | **Chỉ tính giao dịch đã xác nhận** |
| Báo cáo lớp & đăng ký | Bộ lọc thời gian hoạt động đúng |
| Báo cáo HLV & xuất dữ liệu | **File xuất khớp bộ lọc và dữ liệu màn hình** |

## Architecture

### Doanh thu

Chỉ cộng `payment.status = CONFIRMED`. `PENDING` và `VOID` không vào doanh thu. Nhóm theo khoảng thời gian và phương thức.

Mốc thời gian dùng `confirmed_at`, biên kỳ tính theo `Asia/Ho_Chi_Minh` — lệch 7 giờ sẽ đẩy giao dịch xác nhận lúc 06:00 ngày 1 sang tháng trước.

**Ghi nhận lại báo cáo đã chốt** (red team finding #14): `VOID` một thanh toán đã `CONFIRMED` làm báo cáo của kỳ đã xuất trước đó trả về con số khác, không dấu vết. Hai việc bắt buộc:
- `payment` lưu `voided_by`/`voided_at`/`void_reason` (schema F00), nên luôn truy được ai đổi và khi nào.
- Thêm danh sách vận hành **"gói có thanh toán chưa `CONFIRMED` quá N ngày"** — đây là chỗ duy nhất chỗ lệch "đã cộng buổi nhưng tiền chưa về" trở nên nhìn thấy được (xem F05).

### Lớp & đăng ký

Số lớp, lượt đăng ký, mức lấp đầy = `SUM(booking BOOKED) / SUM(capacity)` trong kỳ. Lớp đã hủy loại khỏi mẫu số.

### HLV & xuất dữ liệu

Số lớp theo HLV tính từ `class_session` — cùng nguồn với F04, phải cho cùng con số.

**Xuất CSV/Excel dùng đúng truy vấn của màn hình**, không viết truy vấn thứ hai.

**Trung hoà công thức khi xuất** (red team finding #15): các dòng xuất chứa văn bản do người dùng nhập — `student.full_name`/`note`, `lead.need`, `trainer.bio`. `lead.need` đến từ **form công khai ẩn danh**. Ô bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc CR phải được trung hoà (thêm tiền tố `'`, hoặc xuất `.xlsx` với ô kiểu text). Không có bước này thì một khách ẩn danh gửi `=cmd|'...'!A1` vào form tư vấn, nhân viên mở file xuất trên máy studio và thực thi mã. Có test với một dòng chứa công thức.

### Giao diện (Soul-1) — bảng tổng hợp

Bố cục cần tránh, bản audit đã gọi tên: *icon trên, số lớn, nhãn, dòng phụ màu cam* — hàng card KPI.

Cách dựng đúng:
- **Bốn con số ngồi trên đường kẻ, không trong hộp.**
- Chỉ số cần xử lý mới đổi màu.
- Bên dưới là danh sách hành động: lớp cần chú ý, rồi lớp hôm nay.
- **Không ô "doanh thu tháng"** nếu chưa có dữ liệu thật. Số chưa có để trống, không để 0.
- Mọi số mở ra được danh sách chi tiết đứng sau nó.

Nút "Xuất file" chỉ ở báo cáo HLV.

## Related Code Files

- Create: `src_BE/app/api/reports.py`
- Create: `src_BE/app/services/report_queries.py` — dùng chung cho màn hình và file xuất
- Create: `src_BE/app/services/export.py` — gồm trung hoà công thức
- Create: `src_BE/tests/test_export_injection.py`
- Create: `src_FE/src/pages/reports/{dashboard,revenue,classes,trainers}.tsx`

## Implementation Steps

1. BE: `report_queries.py` — doanh thu (chỉ `CONFIRMED`, biên kỳ theo múi giờ studio), lớp & đăng ký, số lớp theo HLV.
2. BE: endpoint bảng tổng hợp; mỗi con số kèm đường dẫn tới danh sách chi tiết.
3. BE: danh sách "gói có thanh toán chưa xác nhận quá N ngày".
4. BE: `export.py` sinh CSV/Excel **từ chính `report_queries.py`**, cùng tham số lọc, **có trung hoà công thức**.
5. BE: test — tổng ở báo cáo khớp tổng danh sách chi tiết; file xuất khớp màn hình; dòng chứa công thức được trung hoà.
6. FE: bảng tổng hợp kiểu số trên đường kẻ + hai danh sách hành động.
7. FE: ba màn báo cáo với bộ lọc thời gian.
8. FE: nút xuất file ở báo cáo HLV, truyền nguyên bộ lọc đang áp.

## Success Criteria

- [ ] 4 hạng mục hoàn thành.
- [ ] Doanh thu **chỉ gồm giao dịch đã xác nhận** — có test với dữ liệu `PENDING` và `VOID`.
- [ ] Biên kỳ tính đúng theo `Asia/Ho_Chi_Minh`.
- [ ] Mọi con số trên bảng tổng hợp mở ra được danh sách chi tiết khớp với nó.
- [ ] Số lớp theo HLV khớp con số ở chi tiết HLV (F04).
- [ ] File xuất khớp chính xác bộ lọc và dữ liệu màn hình — có test.
- [ ] **Ô bắt đầu bằng `=`, `+`, `-`, `@` được trung hoà** — có test với dòng chứa công thức.
- [ ] Có danh sách gói thanh toán chưa xác nhận quá hạn.
- [ ] Bảng tổng hợp: **0 card KPI**, số ngồi trên đường kẻ; không có số liệu bịa.
- [ ] Số chưa có dữ liệu để trống, không để 0.
- [ ] Cổng CI Soul-1 xanh.

## Risk Assessment

- **File xuất lệch màn hình** — xảy ra khi viết hai truy vấn. Một nguồn, hai đầu ra.
- **Formula injection qua form công khai** — đường từ khách ẩn danh tới thực thi mã trên máy studio. Rẻ để chặn, đắt để bỏ sót.
- **Bảng tổng hợp trượt về hàng card KPI** — đúng bố cục bản audit đã loại.
- **Hiện số liệu chưa có thật** — vi phạm P3.
- **Phase có thể hoãn** cùng F08 nếu lịch trượt.
