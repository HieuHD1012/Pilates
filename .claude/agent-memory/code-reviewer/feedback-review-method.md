---
name: feedback-review-method
description: Review ở dự án Pilates phải chứng minh chất lượng test bằng mutation testing, không chỉ đọc mã
metadata:
  type: feedback
---

Mỗi lần review một mốc (M1…M4), phải **áp đột biến vào mã sản xuất, chạy test, rồi khôi
phục nguyên trạng** — và báo cáo rõ đột biến nào sống sót. Đọc mã và khen "test trông đầy
đủ" không được tính.

**Why:** Ở M3, reviewer chứng minh một test đua là test giả bằng cách thay hàm bằng đúng
bản lỗi mà docstring mô tả; test vẫn xanh. Từ đó người dùng coi mutation testing là phần
bắt buộc của review, và tự chạy trước vài đột biến rồi yêu cầu reviewer nghĩ ra những cái
họ *chưa* thử.

**How to apply:**
- Ưu tiên đột biến vào các cơ chế mà docstring/tài liệu tuyên bố là "bắt buộc" — đó là chỗ
  hay có khoảng cách giữa lời hứa và test.
- Phân biệt rõ *đột biến sống sót vì thiếu test* với *đột biến tương đương* (mã đúng, đột
  biến không đổi hành vi thật). Nói thẳng cái nào là cái nào.
- Mỗi phát hiện kèm **kịch bản hỏng cụ thể**: dữ liệu vào → hành vi sai → hậu quả với
  người thật. Phân loại Critical/High/Medium/Low.
- Nêu rõ mục "kiểm rồi, không phải vấn đề" để người dùng không kiểm lại.
- Báo cáo viết **tiếng Việt**, kết bằng khối `Status: / Summary: / Concerns/Blockers:`.
- Reviewer là advisory: **không sửa mã sản xuất**; đột biến phải khôi phục và đối chiếu
  byte-by-byte, rồi ghi lại trong báo cáo.

Xem thêm [[project-pilates-review-context]].
