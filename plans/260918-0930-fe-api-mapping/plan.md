---
title: "Nối src_FE vào API thật — ánh xạ 88 endpoint"
description: "src_FE đang gọi một bề mặt API tự chế (/staff/*, /student/*, /trainer/*) không tồn tại ở backend. Kế hoạch dựng lớp hợp đồng thật cho cả 88 endpoint trong docs/api/, rồi đổi toàn bộ hook và màn hình sang nó."
status: in_progress
priority: P1
branch: "feat/fe-api-mapping"
tags: [frontend, api, mapping, contract]
blockedBy: []
blocks: []
created: "2026-09-18T09:30:00+07:00"
createdBy: "ck:plan"
source: skill
---

# Nối `src_FE` vào API thật — ánh xạ 88 endpoint

## Phát hiện mở đầu

`src_FE/` được dựng khi backend chưa có gì để gọi, nên nó gọi **một bề mặt API
do chính nó nghĩ ra** và phục vụ bằng MSW. Không phải vài chỗ lệch tên trường —
là hai hệ khác nhau:

| | FE đang gọi | Backend thật |
|---|---|---|
| Không gian đường dẫn | `/staff/*`, `/student/*`, `/trainer/*` | theo tài nguyên: `/classes`, `/bookings`, `/students`… |
| Phiên đăng nhập | `GET /auth/session` + cookie | `POST /auth/login` → cặp token, `GET /auth/me`, `Bearer` |
| Kiểu id | `string` | `integer` |
| Enum | `"group"`, `"booked"` | `"GROUP"`, `"BOOKED"` |
| Tên trường | `camelCase` | `snake_case` |
| Tiền | `number` | `string` (thập phân, không mất chính xác) |

**Không một request nào của FE hiện tại chạm được backend.** 47 lời gọi trong
`app/` trỏ vào 44 đường dẫn không tồn tại.

Ngoài ra FE đang mang những khái niệm **backend cố ý không có**: hàng chờ
(`waitlist`), `title`/`room` của lớp, `eligibility` như một đối tượng, `Paginated<T>`,
`RescheduleOption`. Và ngược lại, **34 endpoint thật chưa có chỗ nào ở FE gọi tới**:
điểm danh, thông báo, ảnh tiến trình, đổi/khoá tài khoản, lịch lặp, xuất file báo cáo…

## Mục tiêu

Mọi endpoint trong `docs/api/` có **đúng một** hàm gọi có kiểu ở FE, và mọi
màn hình lấy dữ liệu qua chúng. Sau việc này, đổi `VITE_API_BASE_URL` sang
backend thật là ứng dụng chạy — không còn lớp phiên dịch nào ở giữa.

## Nguyên tắc ràng buộc (từ `src_FE/AGENTS.md`)

- Quy tắc nghiệp vụ **không** được dựng lại ở FE. `can_cancel`,
  `refund_if_cancelled_now`, `seats_left`, `detail_path` — hiện thứ server trả.
- Một adapter mạng duy nhất (`app/lib/api/client.ts`). Không thêm axios.
- Trạng thái server thuộc TanStack Query. Query key chỉ sinh ở `query-keys.ts`.
- `npm run verify` là cổng. Chưa xanh thì chưa xong.

## Bốn quyết định đã chốt trước khi viết dòng nào

1. **Giữ nguyên `snake_case` của backend** trong lớp hợp đồng
   (`app/lib/api/schema.ts`). Đổi tên ở FE tạo ra một từ điển thứ hai phải bảo
   trì, và mọi trang trong `docs/api/` nói bằng tên gốc.
2. **Token nằm trong `localStorage`, làm mới theo hàng đợi một-promise.**
   `docs/api/README.md` nói thẳng: hai lần `/auth/refresh` song song bị coi là
   token bị đánh cắp và **thu hồi mọi phiên**. Đây là chỗ sai đắt nhất.
3. **Bỏ hẳn hàng chờ khỏi FE.** Xác nhận ngày 14/09 của chủ dự án đã bỏ hàng chờ;
   backend không có endpoint nào cho nó. Giữ lại UI hàng chờ là hứa một tính năng
   không tồn tại.
4. **Tiền là chuỗi cho tới sát chỗ hiển thị.** `amount: "1500000.00"` parse thành
   `number` ở tầng format, không ở tầng mạng.

## Các pha

| Pha | Việc | Cổng |
|---|---|---|
| 1 | Bảng ánh xạ 88 endpoint → ràng buộc FE (`src_FE/docs/API_MAPPING.md`) | Đủ 88 dòng, không dòng nào "?" |
| 2 | `schema.ts` — kiểu 1:1 với backend | `tsc` sạch |
| 3 | `client.ts` + `tokens.ts` — Bearer, hàng đợi refresh, 401/403 | Test hàng đợi refresh |
| 4 | `endpoints/*.ts` — 88 hàm, 16 nhóm | Test đối chiếu số lượng |
| 5 | `query-keys.ts` viết lại theo tài nguyên thật | `tsc` sạch |
| 6 | Hook tính năng đổi sang endpoint thật | `tsc` + unit test |
| 7 | Màn hình: bỏ trường không tồn tại, thêm trường mới | `npm run verify` |
| 8 | MSW dựng lại đúng hợp đồng thật | `npm run verify`, e2e |

## Rủi ro đã biết

- **`/classes` trả `trainer_id`, không trả tên HLV.** Lịch tuần phải nạp kèm
  `GET /trainers` và tự nối. Lớp `staff/calendar.tsx` đang đọc `session.trainer.fullName`.
- **`/classes/{id}` trả `booked_count`/`seats_left` cho nhân viên, bản rút gọn cho
  học viên.** Cùng một kiểu TypeScript phải có hai trường optional, không phải hai kiểu.
- **Học viên không có endpoint "lịch sử đăng ký" riêng.** Dùng
  `GET /my-schedule?include_cancelled=true` rồi tách ở FE theo `starts_at`.
- **Không có `POST /staff/bookings`.** Nhân viên **không** đặt hộ được — đây là
  quy tắc, không phải thiếu sót. Màn roster của staff phải bỏ nút "thêm học viên".
