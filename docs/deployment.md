# Triển khai

Tài liệu này nói ba điều mà mã nguồn không tự nói được: chạy hệ thống ở PROD
cần gì, **rollback một migration chạm `credit_ledger` bằng cách nào**, và đối
soát dữ liệu sau mỗi lần đổi.

---

## 1. Biến môi trường

Không có bí mật nào nằm trong mã nguồn hay trong repo. `.env` bị gitignore và
chỉ tồn tại trên máy dev.

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql+psycopg://user:pass@host:5432/db` |
| `JWT_SECRET` | ✅ | Ít nhất 32 byte ngẫu nhiên. Ứng dụng **từ chối khởi động** ở PROD nếu còn giá trị mặc định |
| `ENVIRONMENT` | ✅ | Đúng một trong `dev` / `test` / `prod`. **`prod`, không phải `production`** — giá trị khác làm ứng dụng chết lúc khởi động. Ở `prod` các phép kiểm cấu hình được bật |
| `CORS_ORIGINS` | ✅ | Allow-list tường minh, **không dùng `*`**. Định dạng là **mảng JSON**, kể cả khi chỉ có một origin: `CORS_ORIGINS='["https://studio.example.com"]'`. Chuỗi trần làm ứng dụng chết lúc khởi động với lỗi parse khó đọc |
| `STORAGE_DIR` | ✅ | Thư mục ảnh tiến trình. Phải nằm ngoài cây mã nguồn và **không được web server phục vụ trực tiếp** |
| `SMTP_*` | ✅ | Gửi email đặt lại mật khẩu và kích hoạt tài khoản |
| `EMAIL_FROM` | ✅ | Địa chỉ người gửi. Mặc định `no-reply@pilates.local` là **tên miền dành riêng**, MTA thật sẽ từ chối |
| `PASSWORD_RESET_URL_TEMPLATE` | ✅ | Liên kết trong email đặt lại mật khẩu. Mặc định trỏ `http://localhost:5173` — quên đặt thì email vẫn gửi đi bình thường và **mọi liên kết đều hỏng**, không có lỗi nào báo |
| `UPLOAD_MAX_BYTES` | | Giới hạn dung lượng ảnh tiến trình, mặc định 8 MiB |
| `TRUST_PROXY_HEADERS` | khi có proxy | `true` **chỉ khi** có reverse proxy đứng trước. Xem mục dưới |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | chỉ lần đầu | Dùng một lần cho `scripts.seed_admin`, xoá khỏi môi trường sau đó |

## 2. Yêu cầu hạ tầng

- **PostgreSQL 16** có **sao lưu tự động**. Sổ buổi là append-only nên bản sao
  lưu là đường phục hồi duy nhất cho một sự cố dữ liệu diện rộng.
- Extension `btree_gist` (migration đầu tiên tự tạo) — cần cho ràng buộc chống
  trùng giờ HLV.
- **HTTPS bắt buộc.** Access token đi trong header `Authorization`.
- Múi giờ container không quan trọng (mọi mốc là `timestamptz`, quy tắc tính
  theo `Asia/Ho_Chi_Minh`), nhưng đặt `TZ=Asia/Ho_Chi_Minh` giúp log đọc được.

### Số worker và giới hạn tần suất

Bộ đếm rate limit (`app/core/rate_limit.py`) nằm **trong bộ nhớ tiến trình**.
Chạy nhiều uvicorn worker thì mỗi worker giữ một bộ đếm riêng và ngưỡng thật
nhân lên theo số worker.

Với một studio, **một worker là đủ** và giữ đúng ngưỡng đã thiết kế. Cần nhiều
worker thì phải chuyển bộ đếm sang Redis trước — đây là một quyết định hạ tầng
còn để ngỏ, ghi ở `docs/business-rules.md`.

`TRUST_PROXY_HEADERS` phải khớp với hạ tầng thật, và **sai theo cả hai chiều
đều hỏng**:

- Có proxy mà để `false`: mọi request trông như đến từ một IP duy nhất là
  proxy, nên một người thử sai mật khẩu sẽ khoá đăng nhập của cả studio.
- Không có proxy mà để `true`: client tự khai `X-Forwarded-For` và vòng qua mọi
  giới hạn theo IP bằng một header.

## 3. Chạy migration

```bash
uv run alembic upgrade head
uv run alembic check     # phải in "No new upgrade operations detected"
```

Chạy ứng dụng (một worker — xem mục trên):

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

`alembic check` chạy ở CI: nó bắt trường hợp model đã đổi mà quên sinh
migration — sai lệch sẽ lộ ra lần đầu trên PROD nếu không có bước này.

### Rollback một migration chạm `credit_ledger`

Đây là phần quan trọng nhất của tài liệu.

`credit_ledger` có trigger cấm `UPDATE`, `DELETE` **và `TRUNCATE`**. Quy tắc đó
không chừa ai — nó chặn mọi migration **sửa dữ liệu** trong bảng, kể cả khi
chạy bằng tài khoản owner của schema. Một migration như vậy sẽ **dừng giữa
chừng** với lỗi trigger, để lại schema ở trạng thái nửa vời.

Bảy migration hiện có chỉ chạm *cấu trúc* chứ không chạm dòng nào, nên
`alembic downgrade` hôm nay chạy suốt mà không cần thao tác gì thêm — đã diễn
tập ngày 14/09, xuống `0002` rồi lên lại `head`, `alembic check` sạch. Phần
dưới là bắt buộc **kể từ migration đầu tiên sửa dữ liệu sổ**.

Đường hợp lệ duy nhất là tắt trigger trong đúng transaction đó:

```sql
BEGIN;
ALTER TABLE credit_ledger DISABLE TRIGGER USER;

-- các câu lệnh của migration

ALTER TABLE credit_ledger ENABLE TRIGGER USER;
COMMIT;
```

Ba điều kèm theo, không được bỏ:

1. **Trong cùng một transaction.** Tắt rồi commit rồi mới sửa là mở một cửa sổ
   trong đó mọi đường ghi của ứng dụng đều sửa được sổ.
2. **Chạy khi ứng dụng đã dừng**, hoặc ít nhất trong cửa sổ bảo trì. `DISABLE
   TRIGGER USER` có hiệu lực với mọi kết nối, không riêng kết nối đang chạy.
3. **Chạy `scripts.reconcile_ledger` ngay sau khi commit.** Nếu bảy mệnh đề
   không xanh thì phục hồi từ bản sao lưu, đừng sửa tiếp.

Cùng cơ chế này được dùng ở `tests/conftest.py` để dọn dữ liệu giữa các test —
nên đường rollback không phải lý thuyết, nó chạy hàng trăm lần mỗi lần CI chạy.

**Cách sửa một bút toán sai mà không tắt trigger:** ghi thêm một bút toán đối
ứng (`ADMIN_ADJUST` kèm lý do). Đây là cách đúng cho mọi sai sót nghiệp vụ; tắt
trigger chỉ dành cho thay đổi cấu trúc.

## 4. Đối soát

```bash
uv run python -m scripts.reconcile_ledger          # cho người đọc
uv run python -m scripts.reconcile_ledger --json   # cho cron/giám sát
```

Mã thoát khác 0 khi có vi phạm. Chạy **sau mỗi lần triển khai** và **sau mỗi
lần nhập dữ liệu**; đặt lịch chạy hằng ngày nếu có chỗ chạy cron.

Script này chạy đúng bảy mệnh đề mà bộ test chạy, bằng cách import chung một
module. Một script "gần giống" là một script kiểm những điều khác với điều đã
được chứng minh là bắt được lỗi.

## 5. Nhập dữ liệu ban đầu

File mẫu gửi studio điền: `docs/templates/mau-nhap-du-lieu-ban-dau.xlsx`. Sheet
`huong_dan` giải thích từng cột; các sheet dữ liệu **chỉ có dòng tiêu đề**, vì
một dòng ví dụ quên xoá sẽ thành một học viên có thật kèm một số dư mở sổ. Tên
cột của file mẫu được ghim bằng test, đọc thẳng từ mã nguồn script — thêm cột
vào script mà quên cập nhật file mẫu thì CI đỏ, không phải đợi tới ngày nhập
thật mới biết.

```bash
# 1. Chạy thử — làm thật rồi rollback, số liệu là số liệu thật
uv run python -m scripts.import_initial_data \
    --file du-lieu-studio.xlsx --source studio-2026-11

# 2. Ghi thật
uv run python -m scripts.import_initial_data \
    --file du-lieu-studio.xlsx --source studio-2026-11 --commit

# 3. Đối soát
uv run python -m scripts.reconcile_ledger
```

**Diễn tập đầy đủ trên một bản sao giống PROD trước ngày nhập thật.** Lần đầu
chạy trên PROD không được là lần đầu chạy.

Chạy lại cùng một file **không** nhân đôi số dư — nhưng tính chất đó dựa vào
`--source` giữ nguyên giữa hai lần chạy. Đổi nhãn nguồn là tạo ra một tập khoá
ngoài mới, và mọi dòng sẽ vào lần nữa.

## 6. Trước khi bàn giao

- [ ] `alembic upgrade head` và `alembic check` sạch.
- [ ] `scripts.reconcile_ledger` xanh trên dữ liệu thật.
- [ ] Số dư sau nhập liệu khớp file Excel của studio.
- [ ] Tài khoản ADMIN đầu tiên đã tạo, biến `SEED_ADMIN_*` đã gỡ khỏi môi trường.
- [ ] `CORS_ORIGINS` là allow-list thật, không phải `*`, và viết dạng mảng JSON.
- [ ] `PASSWORD_RESET_URL_TEMPLATE` trỏ tên miền thật, `EMAIL_FROM` không còn
      `.local` — **gửi thử một email đặt lại mật khẩu và bấm vào liên kết**.
- [ ] Email của ADMIN đầu tiên là **tên miền thật**. `scripts.seed_admin` nhận
      cả `.local`, nhưng API đặt lại mật khẩu từ chối tên miền dành riêng — một
      ADMIN seed bằng `.local` sẽ vĩnh viễn không tự lấy lại được mật khẩu.
- [ ] Sao lưu tự động đã bật và **đã thử phục hồi một lần**.
- [ ] Rà nội dung trang công khai bằng tay — **sau khi nhập dữ liệu**, vì nội
      dung công khai (`trainer.bio`, `announcement.body`, `specialties`) do nhân
      viên nhập vào CSDL, không nằm trong mã nguồn.
