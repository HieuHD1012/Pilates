---
phase: 2
title: "F01 Tài khoản & phân quyền"
status: in_progress
priority: P1
effort: "34h hợp đồng (BA 5 · BE 15 · FE 14) + rework 15%"
dependencies: [1]
---

# Phase 2: F01 — Tài khoản & phân quyền

## Overview

Đăng nhập, đặt lại mật khẩu, quản lý tài khoản và phân quyền cho 4 nhóm người dùng. Phân quyền phải đúng ngay từ đây vì mọi phase sau đều dựa vào nó.

4 hạng mục. Cửa sổ BE: 18/09 → 23/09.

## Trạng thái thực tế — cập nhật 2026-09-14

**BE: xong. FE: chưa bắt đầu.**

Đăng nhập, refresh token có cửa sổ ân hạn 10 giây cho lần gửi trùng, đặt lại mật khẩu
dùng đúng một lần, khoá tài khoản thu hồi token đang cầm, chặn brute-force theo cả IP
lẫn tài khoản — tất cả có test. Ma trận phân quyền phủ cả trường hợp bị từ chối
(`tests/test_permission_matrix.py`, `tests/test_photo_permissions.py`).

Chưa có: mọi màn hình. Không có màn nào nên cổng CI Soul-1 chưa chạy được.

## Requirements

| Hạng mục | Người dùng | Điều kiện hoàn thành |
|---|---|---|
| Đăng nhập | Tất cả | Đăng nhập đúng quyền; báo lỗi rõ ràng; **chặn brute-force** |
| Quên/đặt lại mật khẩu | Tất cả | Liên kết đặt lại **có hạn và dùng một lần**, qua kênh đã chốt ở F00 |
| Danh sách tài khoản | Admin | Quản lý được trạng thái; **khoá tài khoản thu hồi session đang dùng** |
| Cấp tài khoản học viên | Admin | Học viên liên hệ studio; admin cấp STUDENT kèm `student_id`, nối hồ sơ trong cùng giao dịch; chưa có tự đăng ký |
| Hồ sơ cá nhân & quyền truy cập | Tất cả | GET/PATCH /auth/me; tự sửa tên/phone, đồng bộ hồ sơ liên kết, không đổi email/vai/liên kết |

## Architecture

### Ma trận quyền

| Tài nguyên | ADMIN | STAFF | TRAINER | STUDENT | Ẩn danh |
|---|---|---|---|---|---|
| Trang công khai, form tư vấn | ✓ | ✓ | ✓ | ✓ | ✓ |
| Học viên, gói, thanh toán, sổ buổi | ✓ | ✓ | — | chỉ của mình | — |
| HLV (quản lý) | ✓ | ✓ | chỉ hồ sơ mình | — | — |
| Lịch dạy | ✓ | ✓ | **chỉ lớp mình** | — | — |
| Lớp & lịch (tạo/sửa/hủy) | ✓ | ✓ | — | — | — |
| Đăng ký/hủy/đổi lớp | — | — | — | **chỉ của mình** | — |
| Xem danh sách / cập nhật điểm danh | — | — | **chỉ lớp mình dạy, cập nhật sau ends_at** | — | — |
| **Ảnh tiến trình** | ✓ | **—** | **chỉ HLV phụ trách học viên đó** | **chỉ của mình** | — |
| Điều chỉnh số buổi thủ công | ✓ | — | — | — | — |
| Quản lý tài khoản | ✓ | — | — | — | — |
| Báo cáo | ✓ | ✓ | — | — | — |

> **Hai ô đã sửa sau red team (finding #5).** Bản trước cho `STAFF ✓` và `TRAINER ✓` không giới hạn trên ảnh tiến trình — nghĩa là mọi nhân viên lễ tân và mọi HLV, kể cả người chưa từng dạy học viên đó, đều xem được ảnh cơ thể của toàn bộ học viên. Đáp án câu 15 của khách là *"Admin, HLV và học viên được xem"*: không có STAFF, và "HLV" chưa rõ là mọi HLV hay HLV phụ trách. **Mặc định an toàn: HLV phụ trách.** Đang chờ khách xác nhận (câu hỏi mở #2a). Theo chốt ngày 2026-09-14, chỉ học viên tự đăng ký/hủy/đổi; nhân viên và HLV không đặt hộ.

Ba quy tắc dễ làm sai, phải có test riêng: **HLV chỉ thấy lớp mình dạy** · **học viên chỉ thấy dữ liệu của chính mình** · **STAFF không xem được ảnh tiến trình**.

### Xác thực

- JWT access ngắn hạn + refresh; hash mật khẩu bằng argon2.
- **Refresh token lưu trong DB** (`refresh_token`, schema ở F00) với `jti`, xoay vòng khi dùng, phát hiện tái sử dụng. Khoá tài khoản hoặc đổi mật khẩu → **thu hồi toàn bộ refresh token của người đó**.
  > Không có bước này thì tiêu chí "tài khoản bị khoá không đăng nhập được" là đúng nhưng vô nghĩa: JWT vô trạng thái, người bị khoá vẫn cầm refresh token và tiếp tục phát access token tới hết hạn. Nhân viên nghỉ việc chiều thứ Sáu vẫn đọc được PII học viên, gói, thanh toán suốt cuối tuần.
- **Giới hạn tần suất `/auth/login`** theo IP và theo tài khoản, backoff luỹ tiến.
- Token đặt lại mật khẩu: lưu dạng hash, có `expires_at` và `used_at`; dùng rồi là hỏng; **không bao giờ trả token trong response API**. Không tiết lộ email có tồn tại hay không.
- **Kênh gửi: transactional email** (chốt ở phiên validate, dựng ở F00). Đổi mật khẩu ADMIN phải nhập mật khẩu hiện tại. Mỗi lần đặt lại ghi một dòng audit.
<!-- Updated: Validation Session 1 - transactional email thay cho đặt lại có nhân viên hỗ trợ -->
- Phân quyền cưỡng chế ở tầng dependency của FastAPI, không ở route thủ công.
- Truy vấn của TRAINER/STUDENT **luôn kèm điều kiện lọc theo chủ sở hữu ở tầng query**, không lọc sau khi lấy.

### Giao diện (Soul-1)

- Form đăng nhập: hairline, không card. Lỗi hiện dưới trường, **có chữ**, không chỉ đổi màu viền.
- Danh sách tài khoản: bảng hairline, trạng thái là badge bo 2px, không pill.

## Related Code Files

- Create: `src_BE/app/api/auth.py`, `src_BE/app/api/accounts.py`
- Create: `src_BE/app/core/security.py` — argon2, JWT, refresh store, token đặt lại
- Create: `src_BE/app/core/permissions.py` — dependency phân quyền + helper lọc chủ sở hữu
- Create: `src_BE/app/core/rate_limit.py`
- Create: `src_BE/tests/test_permissions.py`, `src_BE/tests/test_session_revocation.py`
- Create: `src_FE/src/pages/auth/*`, `src_FE/src/pages/accounts/*`
- Create: `src_FE/src/lib/auth-context.tsx`, `src_FE/src/lib/api-client.ts`

## Implementation Steps

1. Model `user`, `refresh_token`, `password_reset` + migration; seed ADMIN qua biến môi trường, không hardcode.
2. `security.py`: argon2, phát/kiểm JWT, lưu và xoay vòng refresh, phát hiện tái sử dụng, sinh/kiểm token đặt lại.
3. `rate_limit.py` cho `/auth/login`, theo IP và theo tài khoản.
4. `permissions.py`: dependency theo vai + helper lọc theo chủ sở hữu.
5. Endpoint: đăng nhập, làm mới, quên/đặt lại mật khẩu, tôi-là-ai, CRUD tài khoản, thu hồi session.
6. Khoá tài khoản và đổi mật khẩu → thu hồi toàn bộ refresh token.
7. Test phân quyền: mỗi vai × mỗi nhóm tài nguyên, khẳng định cả **cho phép** và **từ chối**.
8. Test thu hồi: khoá tài khoản → access token và refresh token hiện hành mất hiệu lực ngay.
9. FE: trang đăng nhập, luồng đặt lại, context xác thực, route bảo vệ, xử lý hết hạn token theo cách lưu đã chốt ở F00.
10. FE: danh sách tài khoản với thao tác tạo/khoá/mở.
11. FE: trang hồ sơ cá nhân, trường hiện ra khác nhau theo vai.

## Success Criteria

- [x] Bốn vai đăng nhập được và chỉ thấy đúng phần được phép.
- [x] **STAFF không truy cập được ảnh tiến trình**; HLV chỉ xem được ảnh học viên mình phụ trách — có test cho cả hai.
- [x] Liên kết đặt lại hết hạn đúng và **không dùng lại được lần hai**; token không bao giờ xuất hiện trong response.
- [x] **Khoá tài khoản → token đang dùng mất hiệu lực ngay** — có test.
- [x] `/auth/login` chặn được brute-force.
- [x] Test phân quyền phủ đủ ma trận, gồm cả trường hợp bị từ chối.
- [x] HLV không truy cập được lớp không phải của mình, kể cả gọi thẳng API bằng id.
- [x] Học viên không truy cập được dữ liệu học viên khác, kể cả gọi thẳng API bằng id.
- [ ] Cổng CI Soul-1 xanh trên các màn hình mới.

## Risk Assessment

- **Phân quyền rò rỉ theo id trực tiếp** — lỗi phổ biến nhất ở loại app này. Chặn bằng lọc ở tầng query + test gọi thẳng bằng id người khác.
- **Ảnh cơ thể lộ cho STAFF/HLV không phụ trách** — bản trước của ma trận này cho phép đúng điều đó. Có test âm cho cả hai vai.
- **Thiếu 15h BE cho khối lượng thật**: argon2, JWT, refresh store có xoay vòng, rate limit, token đặt lại, CRUD tài khoản, ma trận quyền đầy đủ. Refresh store và rate limit là bổ sung của red team, không có trong 58 hạng mục.
