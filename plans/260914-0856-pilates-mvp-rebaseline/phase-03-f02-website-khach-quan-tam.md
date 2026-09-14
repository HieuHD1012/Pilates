---
phase: 3
title: "F02 Website & khách quan tâm"
status: in_progress
priority: P1
effort: "38h hợp đồng (BA 6.5 · BE 8.5 · FE 23) + rework 15%"
dependencies: [2]
---

# Phase 3: F02 — Website công khai & khách quan tâm

## Overview

Chín hạng mục: 7 trang/thành phần công khai + tiếp nhận và theo dõi khách quan tâm.

**Phase rủi ro P3 cao nhất trong dự án.** Khách trực tiếp nghiệm thu từ 12/11; mọi thứ trên trang công khai được đọc như một lời khẳng định về studio có thật.

Cửa sổ BE: 23/09 → 25/09 · FE: 23/09 → 29/09.
**Ngoại lệ:** *Lịch lớp công khai* chỉ hoàn tất ở lần chạy hai trong cửa sổ F06 — nó là hàm của `class_session`, chưa tồn tại ở phase này.

## Trạng thái thực tế — cập nhật 2026-09-14

**BE: xong. FE: chưa bắt đầu — đây là phase FE nặng nhất chưa động tới (23h).**

Cưỡng chế P3 phía server đã đúng thật: validator bóc thẻ HTML, chuẩn hoá NFC, xoá ký
tự vô hình rồi mới đối chiếu, nên `Lớp tối đa <strong>3</strong> người` và các biến
thể ZWSP / soft hyphen đều bị từ chối lúc ghi. API công khai có allow-list, kiểm bằng
test hợp đồng fail khi thừa khoá. Lead được sanitize, chặn trùng theo số đã chuẩn hoá
và so cả với hồ sơ học viên đã có.

Chưa có: 7 trang công khai, nhãn cho ô ảnh/giá đang chờ, nút Zalo/WhatsApp.

**Tiêu chí "không vi phạm P3" chưa đạt dù validator đã xong** — nó đòi ba tầng, mới có
một. Còn thiếu cổng DOM trên route công khai và lượt rà thủ công sau khi nhập dữ liệu thật.

## Requirements

| Hạng mục | Điều kiện hoàn thành |
|---|---|
| Trang chủ | Responsive; nội dung dễ cập nhật |
| Giới thiệu studio | Hiển thị tốt mobile/desktop |
| Dịch vụ & gói tập công khai | Khách xem được **nội dung/giá do studio công bố** |
| Đội ngũ HLV công khai | Dữ liệu lấy từ hồ sơ HLV được công khai |
| Lịch lớp công khai ‡ | Hiển thị lớp còn mở và thông tin cơ bản |
| Khuyến mãi/thông báo | Nhân viên đăng và ẩn được nội dung |
| Liên hệ Zalo/WhatsApp | Mở đúng kênh studio cung cấp |
| Form đăng ký tư vấn | Tạo được khách quan tâm; chống gửi trùng cơ bản |
| Danh sách/chi tiết khách quan tâm | Nhân viên cập nhật được kết quả tư vấn |

‡ hoàn tất ở lần chạy hai, cửa sổ F06.

## Architecture

### Quy tắc P3

**Không được xuất hiện trên trang công khai:** chứng chỉ/bằng cấp/số năm kinh nghiệm HLV · tên Việt trông như thật trong dữ liệu mẫu · giờ mở cửa · số liệu kinh doanh · cụm "tối đa 3 người mỗi lớp".

**Giá gói — đã sửa sau red team (finding #12).** Bản trước cấm giá hoàn toàn và viết lại dòng phạm vi, bỏ mất chữ "/giá". Dòng khách đã xác nhận là *"Khách xem được nội dung**/giá** do studio công bố"*, và câu 12 khách đồng ý cung cấp thông tin gói. Quy tắc đúng: **hiện giá khi studio cung cấp, trạng thái rỗng có nhãn khi chưa có.** Cấm *bịa* giá, không cấm giá. Đang chờ khách xác nhận (câu hỏi mở #2b).

**Phân biệt cần giữ:** lịch lớp công khai hiển thị các buổi *đã được xếp* là sự kiện có thật — hợp lệ. "Giờ mở cửa 7:30–19:30" là một khẳng định về studio mà chưa ai cung cấp — vẫn cấm.

Trang HLV hiện ảnh + giới thiệu, **không hiện chứng chỉ**, cho tới khi có dữ liệu thật. `trainer.is_public` quyết định hiện hay không.

### Cưỡng chế P3 — hai lớp, vì grep bundle là chưa đủ

> **Red team finding #12.** Cổng CI grep bundle chỉ chứng minh *lập trình viên* không gõ chuỗi cấm. Nội dung công khai thật nằm trong DB — `announcement.body`, `trainer.bio`, `specialties` — do nhân viên studio nhập **sau khi go-live**, đúng trong tuần nhập liệu 12–18/11. Kịch bản: nhân viên điền bio "Chứng chỉ Polestar, 8 năm kinh nghiệm" và đăng thông báo "Lớp tối đa 3 người — 2.500.000đ/10 buổi". CI xanh, rà thủ công đã chạy *trước* khi nhập liệu, và khách đọc đúng thứ đã loại hướng Soul-2.
>
> Thêm nữa, đây là SPA một bundle duy nhất (Vite, không SSR): bundle công khai cũng chứa màn bán gói và báo cáo doanh thu của F05/F09, nên grep mẫu giá sẽ **fail giả** ngay khi F05 lên.

Hai lớp bắt buộc:
1. **Validator phía server khi ghi** (`content_rules.py` từ F00) cho mọi trường đăng công khai — trả 422 nêu rõ luật bị vi phạm.
2. **Kiểm trên DOM của các route công khai** (không grep toàn bundle), chạy trong CI.

Cộng lớp thứ ba ở F10: rà thủ công **sau khi nhập dữ liệu thật**.

### Response công khai — allow-list bắt buộc

> **Red team finding #15.** Bản trước chỉ nói "endpoint công khai, chỉ đọc, không cần xác thực", không nói trả trường nào. Đường mặc định của FastAPI là tái dùng schema nội bộ → `/public/trainers` lộ **số điện thoại cá nhân** của HLV, `/public/schedule` có thể lộ **danh sách học viên nào đến lớp nào lúc mấy giờ** — vấn đề an toàn thân thể ở một studio nhỏ, không chỉ riêng tư.

Endpoint công khai dùng schema riêng `app/schemas/public.py`:
- HLV: `full_name`, `photo_key`, `bio` — **không** `phone`, không `user_id`, không id nội bộ.
- Buổi lớp: `starts_at`, `ends_at`, `class_type`, `trainer_name`, `is_full` (**boolean**, không phải danh sách người, không phải số đếm).

Test hợp đồng fail nếu response công khai chứa khoá ngoài allow-list.

### Khách quan tâm (lead)

- Form công khai: tên, số điện thoại, nhu cầu. Chống trùng: chặn cùng số điện thoại trong cửa sổ ngắn + rate limit theo IP. Không CAPTCHA (ngoài phạm vi).
- **Sanitize và giới hạn độ dài mọi trường.** Đây là đường XSS lưu trữ rõ nhất của hệ: khách ẩn danh gửi `need` chứa mã, nhân viên mở danh sách lead, token bị đánh cắp.
- Màn quản lý: lọc theo nguồn, nhu cầu, trạng thái tư vấn. Chuyển thành học viên nằm ở F03.

### Giao diện (Soul-1)

- Cấu trúc từ chữ và đường kẻ. **Không card nào trên toàn trang.** Mỗi mục có số hiệu và tên mục ở lề trái.
- Component `empty-slot` có nhãn nói thật — "Ảnh studio — đang chờ", không phải "Sắp ra mắt". Dùng cho ô ảnh, ô giá, mọi chỗ đang chờ dữ liệu. Giữ nguyên hình học cuối cùng để bố cục không nhảy.
- Nút Zalo/WhatsApp chỉ mở kênh (deep link).

## Related Code Files

- Create: `src_BE/app/api/public.py`, `src_BE/app/api/leads.py`
- Create: `src_BE/app/schemas/public.py` — allow-list
- Create: `src_BE/app/models/{lead,announcement}.py`
- Create: `src_BE/tests/test_public_response_allowlist.py`, `src_BE/tests/test_content_rules.py`
- Create: `src_FE/src/pages/public/{home,about,services,trainers,schedule,announcements}.tsx`
- Create: `src_FE/src/components/{contact-channels,empty-slot}.tsx`
- Create: `src_FE/src/pages/leads/*`
- Modify: `src_FE/tests/design-gates/public-routes-content.test.ts`

## Implementation Steps

1. BE: model `lead` + `announcement`, migration.
2. BE: `schemas/public.py` với allow-list tường minh + test hợp đồng.
3. BE: endpoint công khai (chỉ đọc, không xác thực) — HLV công khai, thông báo đã đăng.
4. BE: **validator `content_rules` khi ghi** `announcement` và `trainer.bio/specialties`, trả 422 nêu rõ luật.
5. BE: nhận form tư vấn với chống trùng, rate limit, sanitize, giới hạn độ dài.
6. BE: endpoint quản lý lead cho nhân viên.
7. FE: component `empty-slot` có nhãn.
8. FE: 6 trang công khai theo cấu trúc số hiệu mục ở lề trái, không card.
9. FE: thành phần liên hệ Zalo/WhatsApp đọc kênh từ cấu hình.
10. FE: form tư vấn + trạng thái thành công/lỗi bằng chữ.
11. FE: danh sách và chi tiết khách quan tâm.
12. Cổng CI nội dung: **kiểm DOM route công khai**, không grep toàn bundle.
13. Rà nội dung thủ công toàn bộ trang công khai.
14. *(Lần chạy hai, cửa sổ F06)* Lịch lớp công khai nối vào `class_session`.

## Success Criteria

- [ ] 8 hạng mục hoàn thành ở phase này; lịch lớp công khai hoàn tất ở lần chạy hai.
- [ ] **Không vi phạm P3** — validator server, cổng DOM route công khai, rà thủ công.
- [x] Validator từ chối được bio chứa mẫu chứng chỉ và thông báo chứa "tối đa 3 người" — có test.
- [x] **API công khai không trả PII ngoài allow-list** — test hợp đồng fail khi thừa khoá.
- [ ] Ô ảnh, ô giá đang chờ có nhãn nói rõ; bố cục không nhảy khi dữ liệu về.
- [ ] Giá hiển thị khi studio cung cấp, trạng thái rỗng khi chưa có.
- [ ] Form tư vấn tạo được lead; gửi trùng bị chặn; đầu vào được sanitize và giới hạn độ dài.
- [ ] Nhân viên đăng/ẩn được thông báo, cập nhật được trạng thái tư vấn.
- [ ] Nút Zalo/WhatsApp mở đúng kênh.
- [ ] 0 card, 0 pill, 0 shadow trên trang công khai; axe-core 0 lỗi serious+critical.

## Risk Assessment

- **Vi phạm P3 lọt lên PROD** — rủi ro nghiêm trọng nhất của dự án; là lý do hướng Soul-2 bị loại. Ba lớp chặn, trong đó validator server là lớp duy nhất bắt được nội dung nhập sau go-live.
- **Lộ PII qua endpoint công khai** — số điện thoại HLV, danh sách người đến lớp. Allow-list + test hợp đồng.
- **XSS lưu trữ qua form tư vấn** — đường ngắn nhất tới chiếm tài khoản nhân viên.
- **Studio giao nội dung trễ** → trang ở trạng thái rỗng khi nghiệm thu. Chấp nhận được **nếu** nhãn nói thật; không lấp bằng nội dung bịa.
- **Ngân sách FE 23h cho 9 hạng mục** ≈ 2.5h/hạng mục. Bắt buộc tái dùng primitive từ F00.
