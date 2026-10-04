---
name: project-pilates-review-context
description: Bối cảnh review backend Pilates — nguồn sự thật nghiệp vụ, mốc, và những quyết định không được đảo
metadata:
  type: project
---

Backend quản lý & đặt lớp Pilates cho một studio ở Nha Trang, giao theo mốc M1…M4
(F00…F10). Không có git repo — **đừng dùng lệnh git** để xem thay đổi; phạm vi review do
người dùng liệt kê trong prompt.

**Why:** Dự án chạy theo hợp đồng có ngày nghiệm thu cố định (UAT 12–18/11/2026, nhập dữ
liệu thật trên PROD 12/11), nên rủi ro lớn nhất không phải là mã xấu mà là một cơ chế an
toàn *có mã nhưng không có test*, và một lỗi nhập liệu đúng tuần nghiệm thu.

**How to apply:**
- Đọc `docs/business-rules.md` **trước** khi đọc mã — nó là nguồn chuẩn duy nhất và giải
  thích *vì sao* từng cơ chế tồn tại. Mục "Success Criteria" trong các file
  `plans/260914-0856-pilates-mvp-rebaseline/phase-*.md` là tiêu chí nghiệm thu.
- Bảng **"Đang chờ khách xác nhận"** cuối `business-rules.md` là các quyết định người dùng
  đã chốt theo mặc định an toàn. Thấy vấn đề thì trình bày đánh đổi và để họ quyết —
  **không đề xuất đảo ngược**. Ví dụ đã gặp: `POST /waitlist/{id}/promote` cố ý trả 200 kèm
  `promoted: false`, không phải mã lỗi.
- Báo cáo trước ở `plans/reports/from-code-reviewer-to-cook-m*.md`; đọc để không lặp lại
  phát hiện cũ. Lỗi hay tái diễn: rò dữ liệu vận hành sang vai học viên, và cơ chế khoá
  chỉ tồn tại trong docstring.
- Không đặt mã phase (F07…), số mốc (M4), hay mã phát hiện vào mã nguồn, tên test, tên
  migration.
- Chạy test: `cd src_BE && uv run pytest -q` (PostgreSQL test ở cổng 5434, container đã
  chạy sẵn). Lint `uv run ruff check .`. `timeout` không có trên máy này.

Phương pháp review bắt buộc: [[feedback-review-method]].
