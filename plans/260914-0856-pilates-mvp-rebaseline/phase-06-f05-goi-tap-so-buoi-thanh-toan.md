---
phase: 6
title: "F05 Gói tập, số buổi & thanh toán"
status: in_progress
priority: P1
effort: "64h hợp đồng (BA 11 · BE 30 · FE 23) + rework 15%"
dependencies: [4]
---

# Phase 6: F05 — Gói tập, số buổi & thanh toán

## Overview

Bảy hạng mục. Đây là nơi dựng **sổ buổi** — bất biến trung tâm của cả hệ thống. Mọi thứ ở F07 đứng trên nền này, nên ledger phải đúng tuyệt đối trước khi booking bắt đầu.

Cửa sổ BE: 02/10 → 09/10 · FE: 06/10 → 12/10.

## Trạng thái thực tế — cập nhật 2026-09-14

**BE: xong. FE: chưa bắt đầu.**

Sổ buổi append-only. Cả 7 bất biến đều có test âm chứng minh chúng **fail được** —
đây là điều red team finding #1 đòi và là khác biệt với phép lặp thừa. `balance_cached`
khớp `SUM(delta)`, CHECK chặn số dư âm, gia hạn giữ nguyên lịch sử gói cũ, điều chỉnh
tay không lý do bị từ chối ngay ở tầng DB.

`VOID` đã cài, có guard chặn khi gói đã tiêu buổi từ bất kỳ nguồn nào, và có test. Nhưng
tiêu chí đòi "**đã chốt với khách**" — khách chưa trả lời, nên ô đó để trống.

**Mã nguồn đã tự trả lời câu hỏi mở #2c.** `sell_package`
(`src_BE/app/services/package_sales.py:107`) ghi `delta = credits` **ngay lúc bán**,
không đợi xác nhận thanh toán. Đây là quyết định đang chạy trong sản phẩm mà khách chưa
xác nhận — nếu khách trả lời khác thì sửa ở tầng ledger, đắt nhất khi phát hiện lúc UAT.

## Requirements

| Hạng mục | Điều kiện hoàn thành |
|---|---|
| Danh sách loại gói | Hiển thị đúng giá, số buổi, thời hạn |
| Tạo/chỉnh sửa loại gói | **Không ảnh hưởng gói học viên đã mua** |
| Bán/gán gói cho học viên | Tạo gói học viên và **cộng đủ số buổi** |
| Danh sách/chi tiết thanh toán | Tra cứu được người ghi nhận, xác nhận, huỷ và thời điểm |
| Sổ lịch sử cộng/trừ buổi | **Bộ bất biến ledger chạy xanh** (không phải phép lặp thừa) |
| Điều chỉnh số buổi | **Bắt buộc lý do** và lưu người thực hiện |
| Gia hạn gói | Lịch sử gói cũ được giữ nguyên |

## Architecture

### Sổ buổi — append-only

```
credit_ledger(id, student_package_id, delta, reason_code, note,
              booking_id?, actor_user_id, created_at)
      reason_code ∈ {PACKAGE_SOLD, PACKAGE_RENEWED, BOOKING_DEDUCT,
                     CANCEL_REFUND, ADMIN_ADJUST, PAYMENT_VOID}
```

- **Không UPDATE, không DELETE.** Sai thì ghi bút toán đối ứng.
- Mỗi dòng có `actor_user_id` và `created_at`. `ADMIN_ADJUST` bắt buộc `note` khác rỗng — CHECK constraint ở DB, không chỉ ở form.
- `EXPIRY_FORFEIT` **đã bị loại khỏi enum** — không có chủ thể ghi, và F08 đã loại job nền. Chính sách: gói hết hạn **không** thu hồi buổi chưa dùng; số dư hiển thị chỉ tính gói đang hoạt động (định nghĩa ở F00). Chờ khách xác nhận — quy tắc tiền.
- `PAYMENT_VOID` là reason code **mới**, xem phần thanh toán.

### Đối soát phải kiểm được, không phải tautology

> **Red team finding #1 — lỗi nặng nhất của bản trước.** Bản trước viết "không có cột số dư ghi sẵn" rồi bắt script khẳng định "số dư = `SUM(delta)`". Vì số dư *được định nghĩa* là `SUM(delta)`, phép so sánh đó là `SUM(delta)` với chính nó: **luôn xanh, kể cả trên CSDL hỏng hoàn toàn**. Và nó đã được nâng lên thành tiêu chí nghiệm thu MVP số 1 cùng lệnh "không được cắt trong mọi trường hợp" — một lưới an toàn giả, tệ hơn không có lưới.

F00 đã chốt `balance_cached` trên `student_package` để tạo **biểu diễn thứ hai độc lập**. Bộ bất biến thật, mỗi mệnh đề có thể fail:

| # | Bất biến |
|---|---|
| 1 | `balance_cached = SUM(delta)` cho mọi `student_package` |
| 2 | `SUM(delta) >= 0` cho mọi `student_package` |
| 3 | Mỗi `booking` đang hoạt động có **đúng một** `BOOKING_DEDUCT`, trỏ đúng `student_package_id` của booking |
| 4 | Mỗi `booking_id` có **tối đa một** `CANCEL_REFUND` |
| 5 | Mọi `BOOKING_DEDUCT` có booking tương ứng, và ngược lại |
| 6 | Không bút toán tiêu buổi nào mang dấu dương — `BOOKING_DEDUCT` và `PAYMENT_VOID` chỉ được làm giảm số dư (sửa 14/09 theo review M3; cách viết cũ "`SUM(delta)` không vượt `credits_snapshot` + gia hạn + điều chỉnh" không bao giờ đỏ được) |
| 7 | `student_package` của mọi dòng ledger thuộc đúng học viên của booking |

Bất biến #7 là thứ duy nhất bắt được kiểu gian lận ở F07 finding #3 (dùng gói người khác) — phép đối soát cũ mù hoàn toàn với nó.

### Snapshot gói

`student_package` giữ `name_snapshot`, `price_snapshot`, `credits_snapshot`, `class_type_snapshot`. Sửa `package_type` **không** chạm gói đã bán. Ngừng bán chỉ đổi `is_selling`, không xoá.

### Thanh toán

- Chỉ `CASH` và `TRANSFER`, do nhân viên ghi nhận. Không cổng online.
- `status`: `PENDING` → `CONFIRMED` hoặc `VOID`. **Chỉ `CONFIRMED` vào báo cáo doanh thu** (F09), tính theo `confirmed_at`.
- Lưu đủ **người và thời điểm cho cả ba chuyển trạng thái**: `recorded_by/recorded_at`, `confirmed_by/confirmed_at`, `voided_by/voided_at/void_reason`.
  > Bản trước chỉ có `recorded_by` và `confirmed_at` — vi phạm chính bất biến #3 của dự án ("mọi thay đổi trạng thái lưu người thực hiện", trong đó có "thanh toán").
- `VOID` → không cho chuyển tiếp sang trạng thái khác. Bắt buộc lý do.

**Chốt với khách (câu hỏi mở #2c) — chặn F07:** cộng buổi khi *tạo gói* hay khi *xác nhận thanh toán*?
Đề xuất: cộng khi **tạo gói** — nhân viên đứng quầy cần học viên tập được ngay; đối soát tiền là việc khác.

**Hệ quả khi VOID — đã chốt ở phiên validate: chặn `VOID` nếu gói đã tiêu buổi.**

- Gói **chưa tiêu buổi nào** và số buổi **chỉ đến từ đúng lần bán này** → cho `VOID`, kèm bút toán `PAYMENT_VOID` đối ứng thu hồi toàn bộ số buổi đã cộng, trong **cùng transaction**.
- Gói **đã tiêu ít nhất một buổi** → **từ chối `VOID`** (`PACKAGE_HAS_CONSUMED_CREDITS`) với thông báo nêu rõ đã tiêu bao nhiêu buổi. Nhân viên phải xử lý bằng `ADMIN_ADJUST` có lý do.
- Gói còn buổi đến từ **nguồn không phải lần bán này** — gia hạn, `ADMIN_ADJUST`, nhập liệu ban đầu, hoặc một giao dịch khác chưa huỷ → **từ chối `VOID`** (`PACKAGE_HAS_CREDITS_FROM_OTHER_SOURCES`).

> **Nhánh thứ ba thêm ngày 14/09 — review M3 finding C1, mức Critical.** Guard ban
> đầu chỉ nhìn bảng `payment`, nên đã tái hiện được: gói 5 buổi mua + 7 buổi gia hạn
> + 3 buổi điều chỉnh tay, `VOID` lần bán đầu → **mất cả 10 buổi không thuộc giao
> dịch bị huỷ**, và phép đối soát vẫn báo sạch. Số buổi không gắn với từng khoản
> tiền, nên câu hỏi "buổi nào thuộc tiền nào" không có đáp án — vì thế từ chối.

Lý do chọn: số buổi đã tiêu là chuyện phải bàn với học viên, không nên là hệ quả âm thầm của một lần đổi trạng thái thanh toán. Chặn buộc phải có một quyết định của con người, và `ADMIN_ADJUST` để lại dấu vết ai quyết định gì.
<!-- Updated: Validation Session 1 - chặn VOID nếu gói đã tiêu buổi -->

Thiếu quy tắc này thì: học viên tập 6 buổi, ba tuần sau đối soát ngân hàng cho thấy không có tiền về, nhân viên `VOID` — doanh thu giảm, số buổi không đổi, không ai phát hiện. Kèm theo, F09 cần danh sách vận hành "gói có thanh toán chưa `CONFIRMED` quá N ngày" để chỗ lệch này nhìn thấy được.

### Gia hạn

Hai đường: gia hạn cập nhật end_date của gói hiện tại, hoặc bán gói tiếp theo.
Chốt 2026-09-14: không cần lưu lịch sử ngày hết hạn cũ/ngày mới. Lịch sử
buổi vẫn append-only; thêm buổi ghi PACKAGE_RENEWED với người/thời điểm.

### Giao diện (Soul-1) — màn sổ buổi

Màn hình này tồn tại để **một điều kiểm chứng được**: số dư bằng tổng các thay đổi.

- Hai cột số canh phải cạnh nhau — **thay đổi** và **số dư sau nó** — đọc xuống là tự cộng được.
- Dòng cuối đóng sổ bằng chính con số đó, lặp lại hai lần **có chủ ý** (ngoại lệ duy nhất được phép của P2).
- `tabular-nums`. Dấu trừ là **U+2212**.
- Sổ theo **từng gói của từng học viên**, không phải sổ chung toàn studio.

## Related Code Files

- Create: `src_BE/app/models/{package_type,student_package,credit_ledger,payment}.py`
- Create: `src_BE/app/services/credit_ledger.py` — **cổng duy nhất ghi ledger**
- Create: `src_BE/app/api/{packages,payments,credits}.py`
- Create: `src_BE/tests/test_ledger_invariants.py` — 7 mệnh đề ở trên
- Create: `src_FE/src/pages/packages/{list,form,sell}.tsx`
- Create: `src_FE/src/pages/payments/*`
- Create: `src_FE/src/pages/credits/{ledger,adjust}.tsx`
- Modify: `src_FE/src/pages/students/tabs/packages.tsx`

## Implementation Steps

1. BE: model 4 bảng + migration (schema và ràng buộc đã khai ở F00).
2. BE: `credit_ledger.py` — **cổng duy nhất** ghi ledger, luôn cập nhật `balance_cached` trong cùng transaction. Không chỗ nào khác INSERT thẳng.
3. BE: CRUD loại gói; sửa loại gói không chạm gói đã bán — có test.
4. BE: bán/gán gói — tạo `student_package` với snapshot + ghi `PACKAGE_SOLD` trong **một transaction**.
5. BE: ghi nhận / xác nhận / huỷ thanh toán, lưu đủ người và thời điểm cho cả ba.
6. BE: `VOID` chỉ cho phép khi gói chưa tiêu buổi nào **và** không còn buổi từ nguồn khác lần bán này, kèm bút toán `PAYMENT_VOID` đối ứng cùng transaction; hai nhánh còn lại từ chối với mã lỗi riêng (`PACKAGE_HAS_CONSUMED_CREDITS`, `PACKAGE_HAS_CREDITS_FROM_OTHER_SOURCES`).
7. BE: truy vấn sổ buổi có số dư luỹ kế theo từng dòng.
8. BE: điều chỉnh tay — chỉ ADMIN, bắt buộc lý do.
9. BE: gia hạn end_date hiện tại; không cần lịch sử ngày. Thêm buổi ghi ledger, bán gói mới giữ gói cũ.
10. BE: **`test_ledger_invariants.py` — 7 mệnh đề, mỗi mệnh đề có test âm chứng minh nó fail được** khi dữ liệu sai.
11. FE: danh sách/form loại gói; màn bán gói; danh sách/chi tiết thanh toán.
12. FE: **màn sổ buổi** theo đặc tả Soul-1 — hai cột số canh phải, dòng đóng sổ, U+2212.
13. FE: form điều chỉnh số buổi với lý do bắt buộc.
14. FE: nối tab gói & thanh toán ở chi tiết học viên (F03) vào dữ liệu thật.

## Success Criteria

- [ ] 7 hạng mục hoàn thành.
- [x] **7 bất biến ledger chạy xanh, và mỗi bất biến có test âm chứng minh nó fail được.**
- [x] `balance_cached` luôn khớp `SUM(delta)`; CHECK chặn được số dư âm.
- [x] Ledger không UPDATE/DELETE được, kể cả qua ORM — có test.
- [x] Sửa/ngừng bán loại gói **không đổi** gói đã mua — có test.
- [x] Điều chỉnh tay không lý do bị từ chối ở tầng DB.
- [x] Thanh toán lưu đủ người + thời điểm cho ghi nhận, xác nhận và huỷ.
- [ ] Quy tắc `VOID` → số buổi đã định nghĩa, đã chốt với khách, và có test.
- [x] Gia hạn giữ nguyên lịch sử gói cũ.
- [ ] Màn sổ buổi: hai cột số canh phải, `tabular-nums`, U+2212, dòng đóng sổ khớp.
- [ ] Cổng CI Soul-1 xanh.

## Risk Assessment

- **Ghi ledger vòng qua service** → mất bất biến, và mất âm thầm. Cổng duy nhất + code review + 7 bất biến.
- **Bán gói không nguyên tử** → có gói mà không có buổi, hoặc ngược lại. Một transaction.
- **Chưa chốt "cộng buổi lúc nào" và hệ quả VOID** → chặn F07. Phải xác nhận với khách **trong tuần F00**, không đợi phase này.
- **Phase nặng thứ ba (30h BE)** ngay trước F06 và F07. Trượt ở đây dồn thẳng sang hai phase nặng nhất.
