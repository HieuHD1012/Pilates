# Chạy frontend với backend thật

`npm run dev` mặc định bật MSW, nên một bản clone mới dựng được màn hình mà
không cần backend. Cách đó chứng minh được mã nguồn khớp với **mô tả** của API;
nó không chứng minh được mã nguồn khớp với **API**. Muốn biết màn hình có chạy
thật hay không thì phải cắm vào backend thật.

## Dựng backend

```bash
docker compose up -d db mailpit          # PostgreSQL cổng 5433, Mailpit 8025
cd src_BE
uv sync && uv run alembic upgrade head

cat > .env <<'ENV'
ENVIRONMENT=dev
JWT_SECRET=dev-only-change-me
CORS_ORIGINS=["http://localhost:5177"]
SEED_ADMIN_EMAIL=admin@soulpilates.vn
SEED_ADMIN_PASSWORD=<mật khẩu ít nhất 10 ký tự>
PASSWORD_RESET_URL_TEMPLATE=http://localhost:5177/dat-lai-mat-khau?token={token}
ENV

uv run python -m scripts.seed_admin
uv run uvicorn app.main:app --port 8099
```

`CORS_ORIGINS` phải chứa đúng cổng dev đang dùng. Thiếu nó thì trình duyệt chặn
mọi request trước khi chúng rời máy, và lỗi hiện ra là "CORS", không phải lỗi
thật — kể cả khi lỗi thật là một `500` ở server, vì middleware CORS của FastAPI
không gắn header vào response của ngoại lệ chưa bắt.

Miền `.local` **không dùng được cho email**: `email-validator` từ chối nó, nên
tài khoản tạo bằng miền đó đăng nhập được nhưng `GET /accounts` sẽ nổ khi
serialize. Dùng một miền thật (`soulpilates.vn`, `example.com`).

## Dựng dữ liệu để bấm thử

```bash
uv run python -m scripts.seed_demo_studio --base-url http://127.0.0.1:8099
```

Script đi qua HTTP chứ không ghi thẳng vào bảng, nên dữ liệu nó dựng ra chỉ gồm
những trạng thái mà API thật sự tạo được. Nó từ chối chạy trên `prod` và từ
chối chạy lần hai.

Nó dựng: 3 HLV, 6 học viên, 4 loại gói, 5 gói đã bán (một khoản thu cố ý để
chờ xác nhận), 31 buổi lớp trải hai tuần, 3 thông báo, 3 khách quan tâm, và 8
lượt đăng ký do chính học viên đặt.

| Vai                    | Đăng nhập                              | Mật khẩu                         |
| ---------------------- | -------------------------------------- | -------------------------------- |
| ADMIN                  | `admin@soulpilates.vn`                 | `SEED_ADMIN_PASSWORD`            |
| STAFF                  | `letan@soulpilates.vn`                 | `SoulPilates2026!`               |
| TRAINER                | `hlv@soulpilates.vn`                   | `SoulPilates2026!`               |
| STUDENT                | `mai@example.com`, `nhung@example.com` | `SoulPilates2026!`               |
| STUDENT chưa kích hoạt | `chi@example.com`                      | chưa có — đặt qua liên kết email |

Backend xác thực bằng **email**, không phải số điện thoại — xem
[OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

## Chạy frontend

```bash
cd src_FE
VITE_ENABLE_MSW=false VITE_API_BASE_URL=http://localhost:8099 \
  npm run dev -- --port 5177 --strictPort
```

`VITE_ENABLE_MSW=false` tắt cả worker lẫn nhãn `<DemoDataNotice>` — hai thứ đọc
chung một hằng số ở `app/lib/mocks.ts`, nên không có cách nào nhãn "dữ liệu
mẫu" nằm trên dữ liệu thật.

## Thứ không dựng được bằng API

Màn điểm danh của HLV cần **một lớp đã tan mà vẫn có người đăng ký**. Không có
đường nào qua API tới được trạng thái đó: lớp đã bắt đầu thì không đặt được, và
studio không dời được giờ lớp — chỉ hủy rồi tạo lại. Trên máy dev thì lùi giờ
thẳng trên CSDL; `seed_demo_studio` in sẵn câu lệnh khi chạy xong.
