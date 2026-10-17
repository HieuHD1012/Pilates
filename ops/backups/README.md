# Bản sao lưu độc lập trên Cloudflare R2

Neon Free hiện giữ lịch sử khôi phục trong 6 giờ. Workflow
`Back up Neon to Cloudflare R2` chạy hằng ngày lúc 03:00 Việt Nam, tạo
`pg_dump` custom format từ URL Neon **direct**, sao chép các ảnh hiện có trong bucket
riêng tư `assets`, rồi ghi manifest cuối cùng. Chỉ manifest ở
`snapshots/<timestamp>.json` đánh dấu một bản sao lưu hoàn chỉnh. Ảnh giữ theo
phiên bản ETag nên các ngày sau chỉ tải ảnh mới hoặc đã đổi, tránh nhân bản
toàn bộ kho mỗi ngày.

## Thiết lập một lần

1. Kích hoạt R2 trong Cloudflare account `530c58515a986494f59545756787c4df`,
   tạo bucket riêng tư **j-pilate-backups** ở Standard storage. Cloudflare có
   thể yêu cầu thêm phương thức thanh toán để kích hoạt R2 dù lượng dùng nằm
   trong free allowance.
2. Tạo R2 S3 API token với quyền Object Read & Write chỉ cho bucket này.
3. Tạo GitHub Actions secrets sau trong repo `HieuHD1012/Pilates`:

   | Secret | Nguồn |
   |---|---|
   | `NEON_DATABASE_URL_UNPOOLED` | `.env.local`: `DATABASE_URL_UNPOOLED` |
   | `NEON_AWS_ENDPOINT_URL_S3` | `.env.local`: `AWS_ENDPOINT_URL_S3` |
   | `NEON_AWS_ACCESS_KEY_ID` | `.env.local`: `AWS_ACCESS_KEY_ID` |
   | `NEON_AWS_SECRET_ACCESS_KEY` | `.env.local`: `AWS_SECRET_ACCESS_KEY` |
   | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 S3 API token |

   Không gửi các giá trị này qua chat và không commit `.env.local`.
   Sau khi đăng nhập GitHub CLI, có thể dùng
   `src_BE/.venv/Scripts/python.exe ops/github/sync_neon_backup_secrets.py`
   trên Windows để đồng bộ bốn secret Neon từ `.env.local` mà không in giá trị.
   Hai khóa R2 vẫn phải thêm sau khi tạo R2 S3 API token.
4. Chạy workflow bằng `workflow_dispatch` lần đầu. Chỉ xem là xong khi có
   manifest trong R2, dump có kích thước hợp lý và log workflow báo thành công.
   Sau đó đặt GitHub repository variable `PILATES_BACKUP_ENABLED=true` để bật
   lịch chạy tự động hằng ngày. Trước đó lịch tự bỏ qua, tránh báo lỗi lặp khi
   R2 còn chưa sẵn sàng.

## Khôi phục

Tạo một Neon branch/database **mới** để thử. Tải manifest, dump và các object
liệt kê trong manifest từ R2; kiểm tra SHA-256 từng file. Chạy
`pg_restore --no-owner --no-acl --dbname=<URL_MOI> database.dump` bằng PostgreSQL
client 16 (cùng major với Neon hiện tại), sao chép các object về bucket `assets` trên branch mới, rồi kiểm tra
đăng nhập, một ảnh HLV và một ảnh tiến độ. Chỉ chuyển traffic sau khi kiểm tra
thành công. Không restore trực tiếp vào production trong lần thử.

Postgres và Object Storage không có transaction chung: ảnh bị xóa đúng lúc
backup có thể khiến manifest và dump lệch nhau. Chạy vào giờ vắng và xác minh
đầy đủ trên branch khôi phục. Workflow kiểm tra rằng `pg_restore` đọc được
archive và R2 lưu đúng kích thước, metadata SHA-256. Ngày 17/10/2026, bản
`snapshots/20261017T155708Z.json` đã được tải từ R2, kiểm tra SHA-256 và khôi
phục bằng PostgreSQL client 16 vào database `restore_drill_v2` trên Neon branch
riêng `restore-drill-20261017`. Kiểm tra được 18 bảng, migration `0007` và một
tài khoản ADMIN đang hoạt động với password hash. Snapshot production lúc đó có
**0 ảnh và chưa có dữ liệu khách hàng**, nên lần thử này chưa kiểm chứng khôi
phục ảnh hoặc đăng nhập qua API. Phải thử lại với ảnh và dữ liệu thực trước khi
coi bản sao lưu đáp ứng đầy đủ nghiệp vụ. Kho `objects/` giữ các phiên bản cũ; chưa bật tự xóa
để tránh mất ảnh mà một manifest cũ còn tham chiếu. Theo dõi dung lượng R2 và
đặt chính sách retention sau khi đã xác nhận thời gian cần giữ bản sao lưu.
