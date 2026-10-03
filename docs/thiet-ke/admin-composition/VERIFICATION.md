# Kiểm tra version admin độc lập

Ngày 03/10/2026 · nhánh `codex/admin-composition` · baseline `d4dd038`.

## Phạm vi và kết quả

| Kiểm tra | Kết quả |
|---|---|
| Typecheck / lint | Đạt, không warning lint |
| Unit tests | 9 files, 66 tests đạt |
| Production build / contract | Đạt; 9 route prerender và SPA fallback, `ssr:false` |
| Content gate phần code | Đạt |
| Browser flows | 26 cases đạt: 13 luồng ở 390 và 1440 px |
| Route audit | 21 màn × 390 / 768 / 1024 / 1440 = 84 cases |
| Axe WCAG 2 A/AA, 2.1 AA, 2.2 AA | Không phát hiện violation trong 84 cases |
| Geometry | Không phát hiện tràn ngang viewport hoặc đoạn chữ bị cắt trong các phần tử được kiểm |
| Gallery | 21 màn trước–sau; 18 trạng thái tương tác; ảnh thật được nhúng, chuyển desktop / điện thoại |

13 luồng: đăng nhập; tạo và tìm học viên có tên/email dài; lưu tư vấn/chuyển học viên; ghi nhận gia hạn; chọn sổ/điều chỉnh buổi; khóa tài khoản; quyền STAFF; chọn gói/gửi tư vấn; lịch công khai; đặt/hủy lớp học viên; menu/lịch/tạo lớp; tab hồ sơ; khôi phục/đặt lại mật khẩu.

Sau lượt audit đầy đủ, chụp lại các màn được chỉnh tiếp và thay đúng cặp route/width trong report cuối. Kiểm tra lại chọn ngày trên điện thoại và grid tuần trên desktop. Mật khẩu 9 ký tự bị từ chối; hướng dẫn 10 ký tự khớp frontend và backend.

## Review bằng mắt

Đã xem full-page contact sheets của cả 21 màn ở desktop và điện thoại; zoom các cụm dashboard, auth, hồ sơ, tư vấn, gia hạn, tài khoản, lịch và trạng thái form. Lịch mobile được rút từ bảy danh sách thành một ngày được chọn. Tên dài được kiểm bằng dữ liệu nhập trong browser, không chỉ tên ngắn trong fixture.

Gallery: mở `index.html`, chọn màn ở cột trái và kích thước ở trên. Bấm ảnh để xem ảnh gốc. Các trạng thái dialog/tab nằm trong nhóm “Tương tác”.

## Chạy lại

Từ `src_FE`:

```powershell
npm run verify
npx playwright test e2e/admin-composition.app.spec.ts e2e/ui-clusters.app.spec.ts e2e/auth-recovery.app.spec.ts --project=app --workers=2
$env:AUDIT_SCOPE='admin'
node scripts/audit-clusters.mjs http://localhost:5208 visual-qa/admin-final 1440,390,768,1024
```

Log và screenshot QA trong `src_FE/visual-qa/`, được gitignore. Bản sao ảnh review và `route-report.json` nằm cạnh gallery, không nằm trong production bundle.

## Giới hạn của bằng chứng

- Browser dùng API DEMO qua MSW development. Đây là kiểm tra UI/luồng/phân quyền hiển thị, chưa xác nhận tích hợp backend production hay dịch vụ gửi email thật.
- Axe không chứng minh accessibility đầy đủ; geometry không đo được mọi lỗi optical alignment. Chưa có usability test với nhân viên studio.
- Verify đạt phần code. Release công khai vẫn chờ bốn dữ kiện studio (địa chỉ, điện thoại, Zalo, bản đồ) và thay sáu ảnh concept đã có từ baseline.
- Version này redesign auth và khu quản lý; các chỉnh sửa public/học viên/HLV từ audit trước được kế thừa và kiểm luồng hồi quy, không tự nhận đã redesign tất cả những khu đó.

## Xem bản chạy

- App riêng: `http://localhost:5208/dang-nhap`.
- Gallery riêng: `http://127.0.0.1:5230/`.
- DEMO: `admin@demo.local`, mật khẩu bất kỳ không rỗng; chỉ áp dụng development.

Worktree: `C:/Users/ASUS-PRO/.codex/worktrees/admin-design-audit/Pilates`. Không thao tác checkout nơi Claude đang làm.
