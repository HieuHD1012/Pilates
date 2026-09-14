# Tài liệu dự án Pilates Studio

Bắt đầu từ câu hỏi đang cần trả lời, không phải từ cây thư mục.

| Câu hỏi | Đọc ở đâu |
|---|---|
| Vì sao quy tắc lại như vậy? | [`business-rules.md`](business-rules.md) — nguồn chuẩn duy nhất |
| Màn hình này gọi những endpoint nào? | [`api-cho-frontend.md`](api-cho-frontend.md) — sắp theo màn hình |
| Endpoint này nhận gì, trả gì? | [`api/`](api/README.md) — 88 endpoint, sinh tự động |
| Chạy lên PROD thế nào? | [`deployment.md`](deployment.md) |
| Giao diện phải trông ra sao? | [`thiet-ke/`](thiet-ke/) |
| Khách đã chốt những gì? | [`doi-chieu-nguon-va-nghiep-vu.md`](doi-chieu-nguon-va-nghiep-vu.md) — nguồn gốc và xác nhận mới |

---

## Bốn nhóm tài liệu

### 1. Nghiệp vụ và API — mã nguồn đang ghim

Sửa đường dẫn ở nhóm này là làm đỏ test, vì `src_BE/` trỏ thẳng vào chúng.

| Đường dẫn | Nội dung | Ai ghim |
|---|---|---|
| `business-rules.md` | 18 mục quy tắc nghiệp vụ | docstring trong `app/` |
| `api/` | 88 endpoint / 16 nhóm tính năng | `tests/test_api_docs.py`, `tests/test_api_surface.py` |
| `api-cho-frontend.md` | Endpoint sắp theo 9 nhóm màn hình F01–F09 | `tests/test_api_docs.py` |
| `deployment.md` | Biến môi trường, migration, đối soát, nhập liệu | — |
| `templates/` | File Excel mẫu gửi studio điền | `tests/test_import_template.py` |

**`api/` được sinh tự động** bằng `cd src_BE && uv run python -m scripts.gen_api_docs`.
Sửa tay ở ngoài khối `<!-- ghi-chu -->` sẽ bị ghi đè ở lần sinh sau. Đổi bề mặt
API mà quên sinh lại thì CI đỏ — đó là chủ ý.

### 2. `thiet-ke/` — hệ thiết kế và tài sản thương hiệu

| Tệp | Nội dung |
|---|---|
| `brief-thiet-ke-soul-1.html` | Brief gửi bên thiết kế: 5 bất biến P1–P5, ngưỡng đo được, quy tắc nội dung |
| `soul-doi-chieu.html` | Đối chiếu Soul-1 / Soul-2 (25.08.2026). **Soul-1 được chọn.** 1,3 MB, ảnh nhúng base64 — mở bằng trình duyệt, đừng `cat` |
| `anh-studio/` | 21 ảnh thương hiệu studio, kèm bảng ánh xạ tên gốc |

### 3. `nguon/` — tài liệu gốc, chỉ đọc

Không sửa hai tệp này. Chúng là ảnh chụp thứ đã thống nhất; quy tắc nghiệp vụ
đã được chuyển thành văn xuôi ở `business-rules.md` và thành hằng số ở
[`src_BE/app/domain/rules.py`](../src_BE/app/domain/rules.py).

| Tệp | Nội dung | Ngày |
|---|---|---|
| `pham-vi-xac-nhan.xlsx` | 51 chức năng + 15 câu xác nhận **đã có đáp án của khách** | 13.09.2026 |
| `ke-hoach-mvp-noi-bo-2026.xlsm` | 58 hạng mục, 527 giờ công, timeline gốc | 24.08.2026 |

> **Thứ tự ưu tiên:** xác nhận mới của chủ dự án ngày 2026-09-14 → đáp án
> trong `.xlsx` → danh sách chức năng `.xlsx` → kế hoạch nội bộ `.xlsm`.
> Xác nhận mới đã bỏ đặt hộ/hàng chờ và khóa hủy sau hạn; hai file nguồn giữ
> nguyên để đối chiếu lịch sử. [Bảng đối chiếu](doi-chieu-nguon-va-nghiep-vu.md)
> ghi rõ từng thay đổi. Chốt tiếp đã bỏ dời lịch/ân hạn, không cần lịch sử
> ngày gia hạn và thêm PATCH /auth/me tự sửa hồ sơ.
> Khi hai tệp nguồn nói khác nhau thì **`.xlsx` đúng** — nó mới hơn ba tuần. Trường
> hợp đã gặp: ngưỡng hủy lớp, sheet trong `.xlsm` ghi "chưa điền" còn `.xlsx`
> đã chốt Group 4h / Private 1h.

### 4. Ngoài thư mục này

- [`plans/`](../plans/) — kế hoạch triển khai và báo cáo review, không phải tài liệu bàn giao.
- [`src_BE/app/domain/rules.py`](../src_BE/app/domain/rules.py) — hằng số nghiệp vụ. Lệch với `business-rules.md` là lỗi, không phải "hai phiên bản".

---

## Quy ước đặt tên

Tệp mới đặt tên **kebab-case, không dấu**: `bao-cao-doanh-thu.md`, không phải
`Báo cáo doanh thu.md`. Tên có dấu và khoảng trắng buộc phải mã hoá URL trong
liên kết markdown (`Ph%E1%BA%A1m%20vi`) và phải bọc nháy trong mọi lệnh shell.
