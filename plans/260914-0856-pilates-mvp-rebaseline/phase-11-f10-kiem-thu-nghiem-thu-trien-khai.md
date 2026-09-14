---
phase: 11
title: "F10 Kiểm thử, nghiệm thu & triển khai"
status: pending
priority: P1
effort: "66h hợp đồng (BA 30 · BE 19 · FE 17) + rework 15%"
dependencies: [8, 9, 10]
earliest_start: "2026-10-12"
---

# Phase 11: F10 — Kiểm thử, nghiệm thu & triển khai

## Overview

Bốn hạng mục. Phase này **chạy chồng lấn từ 12/10** — `dependencies` ở frontmatter chỉ ràng buộc phần **nghiệm thu cuối**; kiểm thử bắt đầu ngay khi F05/F06 chạy được. BA có slack nên vào sớm.

Cửa sổ: 12/10 → 18/11. UAT + nhập liệu + PROD: 12/11 → 18/11.

> **Lưu ý ngân sách.** 19h BE và 17h FE của phase này nằm **trong** tổng giờ từng vai và chạy chồng lên F06/F07 — hai phase nặng nhất. Bản kế hoạch trước bỏ sót 19h BE này khi tính mốc. Sau phiên validate, **FE là critical path**, nên phần FE của F10 mới là chỗ cần theo dõi sát.

## Requirements

| Hạng mục | Điều kiện hoàn thành |
|---|---|
| Test luồng mua gói → đăng ký → trừ buổi | Không còn lỗi nghiêm trọng ở luồng chính |
| Test phân quyền, đồng thời & số buổi | **Không sai số dư và không vượt sức chứa** |
| Test mobile, dữ liệu cá nhân & hiệu năng cơ bản | Màn hình chính dùng tốt trên điện thoại |
| UAT, sửa lỗi, nhập dữ liệu & triển khai | Khách xác nhận; hệ thống chạy PROD |

## Architecture

### Luồng chính phải chạy đúng đầu-cuối

```
bán gói → cộng buổi → đăng ký lớp → trừ buổi
        → hủy đúng hạn → hoàn buổi
        → hủy muộn     → bị khóa, giữ booking và số buổi
        → lớp đầy → từ chối, không trừ buổi
        → studio hủy lớp → hoàn cho mọi người
        → sổ buổi khớp ở mọi bước
```

### Năm nhóm kiểm thử

**1. Bất biến ledger** — `reconcile_ledger.py` chạy **7 mệnh đề của F05**, không phải phép lặp thừa cũ. Mỗi mệnh đề có test âm chứng minh nó fail được. Chạy lại sau mỗi đợt test khác và sau khi nhập dữ liệu thật.

**2. Đồng thời** (không được cắt trong mọi trường hợp):
- N người cùng đặt ghế cuối → đúng 1 thành công.
- **Một người, 1 buổi, đặt hai lớp khác giờ cùng lúc → đúng 1 thành công, số dư không âm.**
- Cùng người bấm đăng ký hai lần cùng lớp → 1 booking, trừ 1 buổi.
- **Double-click hủy → hoàn đúng 1 buổi.**
- **Studio hủy lớp đồng thời với đặt ghế cuối** → hoặc booking bị từ chối, hoặc được hoàn; không bao giờ "không cái nào".
- Hai nhân viên cùng xác nhận chuyển chờ cho một ghế trống.

**3. Phân quyền**:
- Ma trận F01 × mọi endpoint, khẳng định cả **cho phép** và **từ chối**.
- Gọi thẳng API bằng id người khác: HLV với lớp không phải của mình; học viên với dữ liệu học viên khác; **STAFF và HLV không phụ trách với ảnh tiến trình**.
- Đặt lớp bằng `student_package_id` của người khác → bị từ chối ở tầng DB.
- **Khoá tài khoản → access token và refresh token hiện hành mất hiệu lực ngay.**
- **Endpoint công khai không trả PII ngoài allow-list** (số điện thoại HLV, danh sách người đến lớp).

**4. Múi giờ**: test biên quy tắc hủy chạy với **cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`**, khẳng định kết quả giống nhau. Không có bước này thì lệch 7 giờ (vượt cả ngưỡng 4h lẫn 1h) sẽ khiến mọi lần hủy muộn được hoàn sai, và test viết trên cùng phép quy đổi sai vẫn pass.

**5. Mobile, dữ liệu cá nhân, hiệu năng**: màn hình chính ở 400px (lịch tuần, danh sách học viên 6 cột, sổ buổi, lịch của tôi); ảnh tiến trình không truy cập được khi đoán đường dẫn; upload từ chối file sai kiểu; hiệu năng ở khối lượng dữ liệu thật.

### Cổng ngưỡng Soul-1 trước bàn giao

Chạy trên **mọi màn hình bàn giao**, đo trên **DOM đã render** (không quét CSSOM):

| Ngưỡng | Mức |
|---|---|
| axe-core serious + critical | 0 |
| Card / pill / shadow ngoài dialog | 0 |
| Giá trị bo góc | ≤ 3 |
| Bậc chữ mỗi màn hình | ≤ 6 |
| Độ dài dòng trung vị (loại ô bảng) | ~55 cpl |
| Tương phản | WCAG AA, **chế độ sáng** |
| Thông tin mã hoá bằng màu | luôn có tầng thứ hai |
| Chuỗi cấm P3 | 0 khớp |

> **`sqladmin` là công cụ nội bộ, không phải màn hình bàn giao**, nên nằm ngoài phạm vi cổng Soul-1 — nó render card/pill/shadow của Bootstrap và sẽ fail 4/6 cổng. Ghi rõ ở đây để tuyên bố "mọi màn hình bàn giao" không bị sai. `sqladmin` chỉ dùng cho nội dung nội bộ hiếm dùng, không giao cho khách.
>
> **Dark mode đã cắt khỏi MVP** — bảng trên chỉ còn chế độ sáng.

### Rà nội dung P3 thủ công — sau khi nhập dữ liệu

> **Thứ tự đã sửa (red team finding #12).** Bản trước rà thủ công ở bước 7, còn nhập dữ liệu thật ở bước 11 — tức là rà xong rồi mới đổ vào đúng thứ cần rà. Nội dung công khai nằm trong DB: `trainer.bio`, `announcement.body`, `specialties`, do nhân viên studio nhập trong tuần 12–18/11.

Rà tay toàn bộ trang công khai **sau khi nhập dữ liệu thật và trước khi khách ký nghiệm thu**, và rà lại sau mỗi lần sửa nội dung trong tuần UAT. Validator phía server (F02) là lớp chặn tự động; rà tay là lớp cuối.

### Nhập dữ liệu ban đầu — phải idempotent

Studio cung cấp file Excel: học viên, HLV, gói tập, lịch lớp.

> **Red team finding #14.** Bản trước chỉ khẳng định "không nhập dở dang" mà không nói bằng cơ chế nào. Kịch bản: 12/11 trên PROD, dòng 340/500 lỗi (số điện thoại thừa khoảng trắng đụng `UNIQUE`), tiến trình chết, người vận hành sửa rồi chạy lại cả file → 339 dòng đầu vào lần hai, **mỗi gói sinh thêm một `PACKAGE_SOLD`, số dư nhân đôi**. Ledger append-only nên gỡ ra phải ghi 339 bút toán đối ứng thủ công. Và phép đối soát cũ báo xanh.

Bắt buộc:
- Mỗi dòng có **khoá ngoài ổn định** từ file nguồn; unique trên `(import_source, external_ref)` cho `student`, `student_package`, `class_session`.
- Toàn bộ import trong **một transaction**, `ON CONFLICT DO NOTHING`.
- `--dry-run` báo số lượng, rồi `--commit`; ghi `file_hash` vào bảng `import_run`.
- Gói đã mua nhập kèm số buổi còn lại → sinh bút toán mở sổ `PACKAGE_SOLD`, **không ghi thẳng số dư**.
- Sau import: khẳng định `SUM(delta)` mỗi gói **khớp số dư ghi trong file Excel**, không chỉ khớp chính nó.
- **Diễn tập import đầy đủ trên bản sao giống PROD trước 12/11**, không phải lần đầu chạy trên PROD.

**Tài khoản cho người được nhập:** học viên/HLV nhập từ Excel tạo ở trạng thái `PENDING_ACTIVATION`, **không mật khẩu**, kích hoạt qua kênh đã chốt ở F00. Không bao giờ sinh mật khẩu suy ra từ số điện thoại — số điện thoại lộ qua form tư vấn và danh bạ studio.

### Triển khai

- PROD: PostgreSQL có sao lưu tự động, HTTPS, bí mật qua biến môi trường (không commit), **CORS allow-list + CSP**.
- Migration chạy có kiểm soát; có đường lùi. **Lưu ý:** cơ chế chặn UPDATE/DELETE trên `credit_ledger` cũng chặn Alembic downgrade và mọi migration sửa dữ liệu chạy bằng owner — chốt cách thực hiện rollback hợp lệ chạm bảng đó và ghi vào `docs/deployment.md`.
- Hướng dẫn sử dụng ngắn cho nhân viên: bán gói, xếp lịch, xử lý chờ.

## Related Code Files

- Create: `src_BE/tests/e2e/test_main_flow.py`
- Create: `src_BE/scripts/reconcile_ledger.py` — 7 bất biến của F05
- Create: `src_BE/scripts/import_initial_data.py`
- Create: `src_BE/app/models/import_run.py`
- Create: `src_BE/tests/{test_permission_matrix,test_timezone_boundaries,test_import_idempotency}.py`
- Create: `src_FE/tests/e2e/*`, `src_FE/tests/a11y/*`
- Create: `docs/deployment.md`, `docs/huong-dan-su-dung.md`
- Create: `docs/templates/*.xlsx`

## Implementation Steps

1. (từ 12/10) `reconcile_ledger.py` với 7 bất biến; chạy trên DEV ngay khi F05 xong.
2. Test end-to-end luồng chính đầy đủ.
3. Test đồng thời: cả 6 kịch bản ở trên.
4. Test ma trận phân quyền trên mọi endpoint, gồm truy cập bằng id người khác và thu hồi session.
5. Test allow-list response công khai.
6. Test biên múi giờ với hai `TZ`.
7. Test 400px; test bảo vệ và validate ảnh tiến trình.
8. Chạy cổng ngưỡng Soul-1 trên mọi màn hình bàn giao (trừ `sqladmin`).
9. Hoàn thiện `import_initial_data.py` với khoá ngoài, dry-run, transaction, `import_run`.
10. **Diễn tập import trên bản sao giống PROD** với dữ liệu thật của studio.
11. Sửa lỗi phát hiện, ưu tiên theo mức nghiêm trọng.
12. Dựng PROD: DB có sao lưu, HTTPS, bí mật qua env, CORS + CSP.
13. Nhập dữ liệu thật; chạy đối soát ledger; đối chiếu số dư với file Excel.
14. **Rà P3 thủ công toàn bộ trang công khai — sau khi nhập liệu.**
15. UAT với khách (12/11 → 18/11); rà lại P3 sau mỗi lần sửa nội dung.
16. Hướng dẫn nhân viên; chuyển sang vận hành thật.

## Success Criteria

- [ ] Luồng chính chạy đúng đầu-cuối, không còn lỗi nghiêm trọng.
- [ ] **7 bất biến ledger xanh** trên toàn bộ dữ liệu, gồm sau khi nhập dữ liệu thật.
- [ ] Không lớp nào vượt sức chứa và **không số dư nào âm** dưới tải đồng thời.
- [ ] Double-click hủy chỉ hoàn 1 buổi; hủy lớp đua với đặt chỗ không làm mất buổi của ai.
- [ ] Ma trận phân quyền đúng; **STAFF không xem được ảnh tiến trình**; không truy cập được dữ liệu người khác bằng id.
- [ ] **Khoá tài khoản làm mất hiệu lực token đang dùng.**
- [ ] API công khai không trả PII ngoài allow-list.
- [ ] **Test biên hủy cho cùng kết quả ở `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.**
- [ ] Màn hình chính dùng tốt ở 400px; ảnh tiến trình được bảo vệ và validate.
- [ ] **0 lỗi axe-core serious + critical trên mọi màn hình bàn giao** (không tính `sqladmin`).
- [ ] Toàn bộ ngưỡng Soul-1 đạt, đo trên DOM đã render.
- [ ] **Nhập dữ liệu chạy lại nhiều lần không nhân đôi số dư**; số dư khớp file Excel của studio.
- [ ] Tài khoản nhập từ Excel không có mật khẩu suy ra được.
- [ ] **Không vi phạm P3** — validator server, cổng CI, và rà thủ công **sau nhập liệu**.
- [ ] Hệ thống chạy PROD; có sao lưu; CORS/CSP đặt đúng; không có bí mật trong mã nguồn.
- [ ] Cách rollback migration chạm `credit_ledger` đã ghi vào `docs/deployment.md`.
- [ ] Khách xác nhận UAT; nhân viên được hướng dẫn.

## Risk Assessment

- **Import không idempotent** → nhân đôi số dư trên PROD đúng tuần nghiệm thu, gỡ ra phải ghi hàng trăm bút toán đối ứng. Diễn tập trước 12/11 là bắt buộc.
- **Dữ liệu studio về trễ** → chặn nghiệm thu. Template giao từ F00.
- **Lỗi số dư phát hiện muộn** → chạy 7 bất biến liên tục từ 12/10, không đợi phase này.
- **Rà P3 sai thứ tự** → rà xong rồi mới nhập đúng thứ cần rà. Thứ tự đã sửa.
- **Nghiệm thu phát sinh thay đổi lớn** → tuần dự phòng 11–17/11 chỉ đủ cho thay đổi nhỏ.
- **Kiểm thử bị bóp khi lịch trượt** — cám dỗ lớn nhất ở cuối dự án. Test đồng thời, test idempotent và 7 bất biến ledger **không được cắt trong mọi trường hợp**.
