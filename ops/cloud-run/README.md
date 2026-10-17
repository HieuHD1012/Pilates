# Cloud Run cho j-pilate

Project `j-pilate` (449252724960), region `asia-southeast1` (Singapore, gần HCM
và cùng khu vực với Neon `aws-ap-southeast-1`). API là `j-pilate-api`; hai Job
`j-pilate-migrate` và `j-pilate-reconcile` dùng cùng image. Cloud Run được đặt
`min-instances=0`, `max-instances=1`, một Uvicorn worker và CPU chỉ cấp khi có
request. Giới hạn một instance giữ đúng rate limit trong bộ nhớ hiện tại.

## Lần đầu thiết lập

1. Bật billing cho project `j-pilate`. Đây là điều kiện của Google để bật các
   API và tạo Cloud Run, dù mức sử dụng có thể nằm trong free tier.
2. Đăng nhập `gcloud auth login` bằng tài khoản có quyền quản lý project. Chạy
   `ops/cloud-run/bootstrap.ps1` từ PowerShell. Script kiểm tra project và
   billing, rồi tạo Artifact Registry, tài khoản dịch vụ, GitHub OIDC provider
   chỉ tin repo `HieuHD1012/Pilates` trên `main`, và các Secret Manager secret.
3. Trong repo, chạy `neon deploy` cho branch Neon đúng, rồi chạy:

   ```powershell
   src_BE/.venv/Scripts/python.exe ops/cloud-run/sync-secrets.py
   ```

   Script đọc `.env.local`, chuyển 5 giá trị Neon cùng JWT secret ngẫu nhiên
   vào Secret Manager qua stdin. Nó không in hoặc tạo file mới chứa bí mật.
   Chạy lại không thay đổi secret đang có. `--rotate` tạo phiên bản mới cho
   **tất cả** secret, kể cả JWT và sẽ khiến phiên đăng nhập cũ hết hiệu lực.
4. Đẩy mã nguồn đã kiểm tra lên nhánh `main`, xác nhận workflow CI xanh, rồi
   chạy thủ công GitHub Actions **Deploy API to Cloud Run** với
   `public_api=false`. Workflow build image, chạy migration bằng URL direct của
   Neon, deploy API private và đối soát sổ buổi. URL được ghi trong job summary.

Deploy API private cho phép kiểm tra qua Google identity mà chưa mở cổng dữ
liệu thật. Không chọn `public_api=true` khi chưa có frontend và email hoạt động.

## Cloudflare Pages khi API private đã có URL

Tạo Pages project `j-pilate` trong Cloudflare account
`530c58515a986494f59545756787c4df` (production branch `main`). Tạo API
token phạm vi Account → Cloudflare Pages → Edit và lưu thành GitHub Actions
secret `CLOUDFLARE_API_TOKEN`; không gửi token qua chat. Đặt GitHub repository
variable `PILATES_API_ORIGIN` bằng origin HTTPS Cloud Run rồi chạy thủ công
workflow **Deploy frontend to Cloudflare Pages** với `release_public=false`.
Workflow verify/build bằng Node 24 và deploy preview branch `demo`; URL dự
kiến là `demo.j-pilate.pages.dev` nếu tên project khả dụng. Chỉ chọn
`release_public=true` khi `npm run check:release` đạt, vì site hiện thiếu địa
chỉ, số điện thoại, Zalo, bản đồ và còn ảnh concept chưa được studio duyệt.
`_redirects` chỉ rewrite các route runtime vào
`__spa-fallback.html`, giữ HTML SEO đã prerender; `404.html` cho path không
tồn tại. Kiểm tra một URL sâu `/hv/...` và một trang công khai sau deploy.

Sau lần deploy Pages đầu, lấy origin Pages thực tế để điền
`PILATES_FRONTEND_ORIGIN` ở mục kế tiếp. Có thể dùng `*.pages.dev` trước; chưa
cần mua domain chỉ để kiểm chứng hạ tầng.

## Khi mở API cho frontend

Đặt các GitHub **repository variables** sau rồi chạy lại workflow với
`public_api=true`:

| Variable | Giá trị |
|---|---|
| `PILATES_FRONTEND_ORIGIN` | Origin HTTPS của Cloudflare Pages, không có path hoặc slash cuối |
| `PILATES_SMTP_HOST` / `PILATES_SMTP_PORT` | SMTP của nhà cung cấp email |
| `PILATES_SMTP_USER` | Tài khoản SMTP |
| `PILATES_SMTP_USE_TLS` | `true` nếu nhà cung cấp yêu cầu TLS |
| `PILATES_EMAIL_FROM` | Địa chỉ sender đã xác thực domain |

Tạo một phiên bản cho secret `j-pilate-smtp-password` trước khi mở công khai.
Workflow đặt CORS và URL đặt lại mật khẩu theo `PILATES_FRONTEND_ORIGIN`.
Frontend build với `VITE_API_BASE_URL` là URL HTTPS của Cloud Run. Không đưa URL
Postgres hoặc khóa S3 vào GitHub vars hay frontend.

ADMIN `admin@jpilate.com` đã được tạo trên Neon production bằng
`ops/neon/seed_production_admin.py`. Mật khẩu ngẫu nhiên chỉ lưu cục bộ trong
`.env.production-admin` (gitignored); script chạy lại sẽ kiểm tra mật khẩu đó
khớp hash trong database. Không dùng
script `seed_demo_studio` trên production: script chủ động từ chối
`ENVIRONMENT=prod` vì nó tạo người dùng và giao dịch giả.

## Chi phí và vận hành

- Cloud Run request-based và `min-instances=0` không giữ container chạy khi
  không có request. Artifact Registry và Secret Manager có free allowance nhưng
  có thể tính phí khi số image hoặc phiên bản secret vượt ngưỡng. Theo dõi
  billing sau deploy và dọn image cũ định kỳ.
- Không tăng `max-instances` hoặc số worker cho tới khi rate limiter chuyển sang
  kho chia sẻ. Trong lúc rollout, hai revision có thể cùng tồn tại ngắn hạn.
- Migration phải tương thích với revision cũ đang nhận traffic. Workflow dừng
  nếu migration hoặc đối soát thất bại; khi đó kiểm tra Job logs trước khi
  chạy lại. Bản sao lưu và thử restore vẫn cần hoàn tất trước khi nhập dữ liệu
  khách thật.
