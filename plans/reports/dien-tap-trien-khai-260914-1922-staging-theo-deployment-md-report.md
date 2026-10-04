# Diễn tập triển khai staging theo `docs/deployment.md`

Ngày: 2026-09-14. CSDL dựng mới `pilates_staging` trên PostgreSQL 16 (container
`pilates_db`), `ENVIRONMENT=prod`, SMTP là Mailpit. Mục tiêu: **lần đầu chạy
trên PROD không được là lần đầu chạy** — làm đúng theo tài liệu, xem chỗ nào
tài liệu sai.

## Kết quả

| Bước | Kết quả |
|---|---|
| `alembic upgrade head` trên CSDL rỗng | ✅ 7 migration `0001`→`0007` |
| `alembic check` | ✅ "No new upgrade operations detected" |
| `scripts.seed_admin` | ✅ tạo ADMIN |
| `scripts.reconcile_ledger` | ✅ "Sổ buổi sạch — 7 mệnh đề đều đúng", mã thoát 0 |
| Khởi động `uvicorn` ở `prod` | ✅ `/health` 200, kèm CSP, `nosniff`, `no-referrer` |
| CORS allow-list | ✅ origin lạ **không** nhận `Access-Control-Allow-Origin`; origin đúng thì có |
| Email đặt lại mật khẩu | ✅ `POST /auth/forgot-password` → 200 → thư tới đúng hộp — **lần đầu chạy thật** |
| `scripts.import_initial_data` chạy thử với file mẫu | ✅ 0 dòng, `problems: []`, tự rollback |
| `downgrade 0002` rồi `upgrade head` | ✅ suốt, không kẹt trigger; `alembic check` vẫn sạch |

## Bốn chỗ tài liệu sai hoặc thiếu — đã vá

**1. `ENVIRONMENT=production` không chạy được.** Tài liệu ghi `production`; mã
chỉ nhận `dev` / `test` / `prod`. Hỏng ngay lúc khởi động: `Input should be
'dev', 'test' or 'prod'`. Loại lỗi ồn ào, không âm thầm — nhưng đủ để đốt một
buổi chiều nếu gặp lúc triển khai.

**2. `CORS_ORIGINS` phải là mảng JSON.** Tài liệu chỉ nói "allow-list tường
minh, không dùng `*`", không nói định dạng. Viết
`CORS_ORIGINS=https://studio.example.com` thì ứng dụng chết với
`error parsing value for field "cors_origins"` — không nhắc gì tới JSON, không
nhắc `CORS_ORIGINS` là biến nào sai. Đúng phải là
`CORS_ORIGINS='["https://studio.example.com"]'`, kể cả khi chỉ có một origin.

**3. Thiếu hai biến bắt buộc, một trong hai hỏng âm thầm.** Bảng biến môi
trường không có `EMAIL_FROM` (mặc định `no-reply@pilates.local` — tên miền dành
riêng, MTA thật từ chối) và không có `PASSWORD_RESET_URL_TEMPLATE`. Cái thứ hai
là loại nguy hiểm nhất: mặc định trỏ `http://localhost:5173`, nên quên đặt thì
**email vẫn gửi đi thành công, người nhận vẫn thấy thư, chỉ có liên kết là
hỏng** — không log lỗi, không cảnh báo, phát hiện qua khiếu nại của học viên.

**4. Không có câu lệnh chạy ứng dụng.** Tài liệu bàn về số worker nhưng chưa
bao giờ viết ra dòng lệnh khởi động. Đã thêm.

## Một chỗ tài liệu nói quá — đã chỉnh

Mục rollback viết: "Một lần `downgrade` chạm bảng này sẽ **dừng giữa chừng** với
lỗi trigger". Diễn tập đi từ `head` xuống `0002` rồi lên lại `head`, **không
kẹt**. Lý do: trigger cấm `UPDATE`/`DELETE`/`TRUNCATE` **dòng dữ liệu**, còn
bảy migration hiện có chỉ chạm cấu trúc. Thủ tục `DISABLE TRIGGER USER` trong
tài liệu vẫn đúng và vẫn cần — nhưng **kể từ migration đầu tiên sửa dữ liệu
sổ**, chứ không phải hôm nay. Đã viết lại cho đúng phạm vi, giữ nguyên thủ tục.

## Một cái bẫy mới, không nằm trong tài liệu cũ

`scripts.seed_admin` nhận email `.local` không phàn nàn; API
`POST /auth/forgot-password` thì từ chối tên miền dành riêng bằng 422. Nghĩa là
**seed ADMIN bằng `admin@pilates.local` tạo ra một tài khoản quản trị vĩnh viễn
không tự lấy lại được mật khẩu** — và chỉ lộ ra vào đúng ngày người ta quên mật
khẩu. Đã thêm vào checklist bàn giao.

## Còn để ngỏ

- `/docs` và `/openapi.json` **mở công khai ở `prod`** (trả 200). Không phải lỗ
  hổng — không endpoint nào chạy được nếu thiếu token — nhưng nó công bố toàn
  bộ bề mặt API cho người ngoài. Đây là một quyết định chưa ai chốt, không phải
  một cái sai. Cần hỏi: đóng ở PROD, hay để mở?
- Sao lưu tự động và **thử phục hồi một lần** vẫn chưa diễn tập — nó cần hạ
  tầng thật, không dựng lại được bằng container trên máy dev.
- Nhập dữ liệu mới chỉ chạy với **file mẫu rỗng**. Diễn tập thật cần file
  studio điền, mà studio chưa giao.
