# Quy tắc nghiệp vụ — nguồn chuẩn duy nhất

Tài liệu này là nơi duy nhất phát biểu quy tắc nghiệp vụ của hệ thống. Mã nguồn
khai hằng số ở [`src_BE/app/domain/rules.py`](../src_BE/app/domain/rules.py);
nếu hai chỗ lệch nhau thì một trong hai là lỗi, không phải là "hai phiên bản".

Nguồn gốc: `docs/nguon/pham-vi-xac-nhan.xlsx` (13.09) là baseline nghiệp vụ,
thay cho sheet "Phạm vi & giả định" trong `.xlsm` (ảnh chụp 24.08).
**Xác nhận mới của chủ dự án ngày 2026-09-14 được ưu tiên hơn baseline:**
chỉ học viên đăng ký/hủy/đổi cho mình, bỏ hàng chờ, khóa hủy/đổi sau hạn,
gói còn hạn ngày học và HLV điểm danh sau lớp. Chốt tiếp: bỏ dời lịch/ân hạn,
không yêu cầu lịch sử ngày gia hạn, bổ sung tự sửa hồ sơ. Hai file nguồn không sửa.
Xem [đối chiếu nguồn và các phần chưa chốt](doi-chieu-nguon-va-nghiep-vu.md).

> **Mục "Đang chờ khách xác nhận"** ở cuối tài liệu liệt kê các quy tắc đang
> chạy theo **mặc định an toàn**. Chúng đã được cài đặt thật, không phải chỗ
> trống — khi khách chốt khác đi thì sửa đúng một chỗ đã ghi rõ ở đây.

---

## 1. Múi giờ — quyết định trước mọi thứ khác

Toàn hệ thống dùng `Asia/Ho_Chi_Minh`. **Mọi cột thời gian là `timestamptz`.**
`class_session` lưu `starts_at` / `ends_at`, không lưu `date` + `start_time`
rời và naive.

Lý do: container chạy UTC theo mặc định, Việt Nam là UTC+7. Ngưỡng hủy là 4 giờ
và 1 giờ — **độ lệch 7 giờ vượt cả hai**, nên một phép quy đổi sai sẽ làm mọi
lần hủy muộn được hoàn buổi, trên mọi lớp, vĩnh viễn.

Cưỡng chế:

- `ruff` bật rule `DTZ` (flake8-datetimez) — naive datetime không qua được lint.
- `app.domain.rules.now()` / `today()` là đường duy nhất lấy thời điểm hiện tại.
- Test biên hủy lớp chạy với **cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`** và phải
  cho kết quả giống hệt nhau (`tests/test_timezone_rules.py`).
- Có test quét `information_schema` khẳng định không cột `timestamp` nào thiếu
  múi giờ (`tests/test_db_constraints.py`).

## 2. Lớp học

- Hai loại: `GROUP` và `PRIVATE`. **Duo = Private sức chứa 2.**
- **Một HLV mỗi lớp** — `class_session.trainer_id` là khoá đơn.
- Sức chứa Group do nhân viên đặt khi tạo lớp. **Không hardcode con số nào**,
  đặc biệt không dùng 3 (con số của cơ sở Đà Nẵng, quy tắc nội dung cấm).
- Một HLV không dạy hai lớp chồng giờ. Cưỡng chế ở CSDL bằng
  `EXCLUDE USING gist (trainer_id WITH =, slot WITH &&) WHERE (status = 'SCHEDULED')`.
  Mệnh đề `WHERE` là bắt buộc: thiếu nó, một lớp đã hủy vẫn chiếm khung giờ của
  chính nó vĩnh viễn.

## 3. Số buổi và sổ buổi

- **Trừ 1 buổi ngay khi đăng ký thành công.**
- Sổ buổi `credit_ledger` là **append-only**. Không UPDATE, không DELETE, và
  không cả **TRUNCATE** — sai thì ghi bút toán đối ứng. Cưỡng chế bằng trigger
  ở CSDL, không phải bằng quy ước. (`TRUNCATE` cần trigger riêng: trigger
  `FOR EACH ROW` không nhìn thấy nó.)
- Hệ quả cần biết khi vận hành: cơ chế này chặn cả `alembic downgrade` và mọi
  migration sửa dữ liệu chạm bảng đó. Đường hợp lệ duy nhất là
  `ALTER TABLE credit_ledger DISABLE TRIGGER USER` → thao tác → `ENABLE`, chạy
  bằng chủ sở hữu bảng, trong cùng một transaction, và ghi lại lý do.
- Mọi dòng ledger có `actor_user_id` và `created_at`.
- `ADMIN_ADJUST` bắt buộc `note` khác rỗng — CHECK constraint ở CSDL, không chỉ
  ở form.
- `reason_code ∈ {PACKAGE_SOLD, PACKAGE_RENEWED, BOOKING_DEDUCT, CANCEL_REFUND,
  ADMIN_ADJUST, PAYMENT_VOID}`.
  `EXPIRY_FORFEIT` **cố ý không tồn tại** — xem mục 6.

### Số dư và cách đối soát

`student_package.balance_cached` là **biểu diễn thứ hai độc lập** của số dư,
với `CHECK (balance_cached >= 0)`.

Nó tồn tại để phép đối soát có nghĩa. Nếu số dư *chỉ* được định nghĩa là
`SUM(delta)` thì khẳng định "số dư = `SUM(delta)`" là so sánh một đại lượng với
chính nó: luôn đúng, kể cả trên một CSDL hỏng hoàn toàn.

**`balance_cached` chỉ được ghi bởi `app/services/credit_ledger.py`** (dựng ở F05), trong
cùng transaction với dòng ledger. Quy tắc này do máy giữ, không phải do người
nhớ: một constraint trigger `DEFERRABLE INITIALLY DEFERRED` kiểm
`balance_cached = SUM(delta)` ở thời điểm COMMIT, nên mọi đường ghi số dư mà
không ghi bút toán tương ứng (và ngược lại) đều vỡ.

## 4. Hủy đăng ký, hủy lớp và điểm danh — chốt 2026-09-14

| Tình huống | Kết quả |
|---|---|
| Học viên đăng ký thành công | BOOKED, trừ ngay 1 buổi; không cần xác nhận |
| Hủy còn ≥ ngưỡng trước giờ học | CANCELLED_INTIME, hoàn 1 buổi vào gói đã trừ |
| Hủy trễ hơn ngưỡng | CANCELLATION_CLOSED, giữ đăng ký và số buổi |
| Học viên đổi lớp khi lớp cũ còn hạn hủy | Hủy + hoàn cũ, đăng ký + trừ mới; cả hai trong một giao dịch |
| Đổi lớp sau hạn hoặc lớp mới không hợp lệ | Từ chối, không thay đổi booking và số buổi |
| Studio hủy lớp chưa có điểm danh | Hoàn mọi lượt BOOKED, bất kể ngưỡng hủy của học viên |
| HLV điểm danh ATTENDED/NO_SHOW | Không trừ hoặc hoàn thêm |

Group hủy trước starts_at ít nhất **4 giờ**; Private/Duo ít nhất **1 giờ**,
theo Asia/Ho_Chi_Minh. Đúng mốc vẫn được hủy. Sau hạn khóa cả hủy và đổi,
kể cả HLV chưa điểm danh. Lịch trả can_cancel=false và refund_if_cancelled_now=false.
CANCELLED_LATE chỉ còn để đọc dữ liệu lịch sử; luồng mới không tạo trạng thái này.

**Không có thao tác dời lịch lớp:** studio tạo lịch hoặc hủy lịch. Muốn giờ
khác thì hủy lớp cũ, hoàn người đã đăng ký, tạo lớp mới; học viên tự đăng ký
lớp mới nếu còn chỗ và gói hợp lệ. Không chuyển người tự động, không có ân hạn
dời lịch. Cột has_reschedule_grace cũ được giữ trong DB nhưng không có hiệu lực
và không còn trả qua API. Thay HLV giữ nguyên giờ học, kiểm trùng lịch.

Hủy chỉ UPDATE lượt còn BOOKED; chỉ thành công mới ghi CANCEL_REFUND.
Partial unique ledger theo booking chặn hoàn lần hai. Gọi lại trả lỗi,
không thay đổi số buổi. ADMIN trả buổi ca đặc biệt qua ADMIN_ADJUST, bắt buộc lý do.

Chỉ HLV được gán lớp điểm danh sau ends_at thành ATTENDED (đã đến) hoặc
NO_SHOW (vắng). Cho sửa nhầm, lưu người/thời điểm; gửi lặp giữ audit.
Lượt/lớp đã hủy không được điểm danh. Lượt đã điểm danh không hủy/đổi;
lớp đã có điểm danh không được hủy hoặc đổi HLV.

Dashboard **Lượt đăng ký lớp hôm nay** đếm BOOKED + ATTENDED + NO_SHOW;
điểm danh không làm số lượt giảm. Chỉ số này không phải số người có mặt.
Danh sách lớp còn cần điểm danh chỉ xét BOOKED ở lớp đã kết thúc.

## 5. Chọn gói khi đặt lớp — quy tắc tất định

Khi học viên giữ nhiều gói hợp lệ, hệ thống chọn:

> gói **đang hoạt động**, khớp `class_type_snapshot` của lớp, có `end_date`
> **sớm nhất**; hoà thì `id` nhỏ hơn.

Quy tắc này khai đúng một chỗ và mọi đường vào đều dùng chung.

**Định nghĩa "gói đang hoạt động"** (dùng ở F03, F05, F08, F09):

> `status = ACTIVE` **và** `start_date <= hôm nay <= end_date` **và**
> `SUM(delta) > 0`

"Hôm nay" tính theo `Asia/Ho_Chi_Minh`.

**Khi đăng ký, gói còn phải có hiệu lực vào ngày lớp học:**
`start_date <= ngày starts_at theo giờ studio <= end_date`.
Gói hết hạn hôm nay nhưng lớp học ngày mai không đủ điều kiện, dù còn buổi.
Ngày cuối của gói vẫn được học. Áp dụng cả chọn tự động và chỉ định gói;
không có gói phù hợp ngày học trả `PACKAGE_NOT_VALID_FOR_SESSION`.
Nếu có nhiều gói đủ điều kiện, chọn gói còn buổi và hết hạn sớm nhất.

**Gói phải thuộc đúng học viên đang đặt.** Cưỡng chế ở CSDL bằng composite FK
`booking(student_id, student_package_id) → student_package(student_id, id)`.
Không có nó, học viên A truyền `student_package_id` của B (đoán được bằng cách
tăng id) và tập miễn phí trên buổi của B — mà phép đối soát tổng không thấy gì,
vì bút toán gian lận vẫn là một dòng ledger thật.

Gia hạn có cộng buổi vẫn ghi PACKAGE_RENEWED với người/thời điểm thực hiện.
Gia hạn chỉ thêm ngày cập nhật end_date hiện tại; **không yêu cầu lưu ngày
hết hạn cũ/ngày mới thành lịch sử** theo xác nhận mới của chủ dự án.

## 6. Gói hết hạn

Buổi chưa dùng của gói hết hạn **không bị thu hồi**. Số dư hiển thị chỉ tính gói
đang hoạt động.

Vì vậy `EXPIRY_FORFEIT` bị loại khỏi enum: không có chủ thể nào ghi được nó, và
hệ thống cố ý không chạy job nền.

Hệ quả cần biết: người có gói vừa hết hạn còn buổi sẽ **rời** danh sách nhắc gia
hạn. Nếu studio muốn vẫn gọi những người này thì cần một bộ lọc riêng — hiện
chưa thuộc phạm vi.

## 7. Thanh toán

- Chỉ `CASH` và `TRANSFER`, do nhân viên ghi nhận. Không cổng thanh toán online.
- `status`: `PENDING` → `CONFIRMED` hoặc `VOID`. `VOID` là trạng thái cuối.
- Lưu đủ **người và thời điểm cho cả ba chuyển trạng thái**:
  `recorded_by/recorded_at`, `confirmed_by/confirmed_at`,
  `voided_by/voided_at/void_reason`. CHECK constraint ở CSDL bắt buộc điều này.
- **Chỉ `CONFIRMED` vào báo cáo doanh thu**, tính theo `confirmed_at`.

### VOID thanh toán

- Gói **chưa tiêu buổi nào** và **mọi buổi đều đến từ chính lần bán** → cho
  `VOID`, kèm bút toán `PAYMENT_VOID` đối ứng thu hồi toàn bộ số buổi đã cộng,
  trong **cùng transaction**; gói chuyển sang `CANCELLED`.
- Gói **đã tiêu ít nhất một buổi** → **từ chối `VOID`**, thông báo nêu rõ đã
  tiêu bao nhiêu buổi. Nhân viên xử lý bằng `ADMIN_ADJUST` có lý do.
- Gói còn **giao dịch khác chưa huỷ**, hoặc còn buổi đến từ **nguồn không phải
  lần bán này** (`PACKAGE_RENEWED`, `ADMIN_ADJUST`, nhập liệu ban đầu) →
  **từ chối `VOID`**. Số buổi không gắn với từng khoản tiền, nên "buổi nào
  thuộc riêng giao dịch này" là câu hỏi không có đáp án trong dữ liệu.

  Không có phép chặn này, huỷ khoản tiền của lần bán đầu sẽ xoá luôn số buổi
  studio vừa gia hạn và số buổi studio tự bù cho học viên — mất tài sản của
  người khác, không cảnh báo, và **phép đối soát vẫn báo sạch** vì sổ vẫn cân.

Lý do: số buổi đã tiêu là chuyện phải bàn với học viên, không được là hệ quả âm
thầm của một lần đổi trạng thái thanh toán.

## 8. Học viên tự đăng ký, không có hàng chờ — chốt ngày 2026-09-14

Chỉ STUDENT được đăng ký, hủy và đổi lớp cho chính mình. ADMIN, STAFF và HLV
không đặt hộ. Thành công là BOOKED ngay, không có bước nhân viên xác nhận.
Lớp đầy trả `SESSION_FULL`, không tạo đăng ký và không trừ buổi.
Khi có người hủy, học viên có thể tự đăng ký lại nếu còn chỗ và gói hợp lệ.

Đã bỏ các API `/waitlist`, service và giao diện dự kiến cho hàng chờ.
Bảng/enum lịch sử được giữ để không xóa dữ liệu cũ; không còn luồng vào chờ
hoặc chuyển người chờ trong ứng dụng.

## 9. Thứ tự khoá toàn cục

> `student_package` (theo `id` tăng dần nếu nhiều gói) **trước** `class_session`.

Mọi transaction chạm cả hai bảng phải theo đúng thứ tự này.

Khoá `class_session` một mình **không** bảo vệ số dư: học viên còn đúng 1 buổi,
đặt hai lớp **khác giờ** cùng lúc — hai transaction khoá hai hàng khác nhau,
không tranh chấp, cả hai đọc số dư = 1, cả hai ghi −1. Partial unique
`(class_session_id, student_id)` không bắt được vì là hai lớp khác nhau.

**Nhánh khó là hủy lớp**: nó xuất phát từ buổi lớp nhưng phải hoàn buổi vào
nhiều gói. Trình tự đã chốt:

1. Đọc **không khoá** để biết tập `student_package_id` bị ảnh hưởng.
2. Khoá các gói đó `FOR UPDATE` theo `id` **tăng dần**.
3. Khoá `class_session` `FOR UPDATE`, từ chối nếu đã có ATTENDED/NO_SHOW,
   rồi **đặt `status = 'CANCELLED'` ngay**.
4. **Đọc lại** bookings `WHERE status = 'BOOKED'` dưới khoá và hoàn buổi.

Bước 4 tồn tại vì giữa bước 1 và 3 vẫn có người kịp đặt ghế cuối. Sau bước 3
không ai chen thêm được nữa nên vòng hoàn là đầy đủ. Lọc `status = 'BOOKED'`
cũng là bắt buộc: thiếu nó, một booking đã hủy đúng hạn (đã hoàn) sẽ được hoàn
lần thứ hai.

Phương án bị loại: cho hủy lớp khoá `class_session` trước rồi retry khi
`deadlock_detected` — đơn giản hơn nhưng đẩy deadlock vào luồng đăng ký, là
luồng chạy nhiều nhất trong ngày.

**Đăng ký trên lớp đã hủy bị CSDL cấm.** Bước đọc lại ở trên chỉ đúng nếu mọi
đường ghi `booking` cũng khoá `class_session`. Hợp đồng đó không sống được
trong tài liệu, nên có trigger `trg_booking_requires_live_session`: nó đọc
trạng thái buổi lớp bằng `FOR SHARE`, tức là **chờ** transaction hủy commit rồi
mới phán quyết. Đọc trần sẽ thấy bản đã commit (`SCHEDULED`) và cho qua, để lại
đúng thứ nó sinh ra để chặn.

**Đổi lớp khoá hai buổi lớp theo `id` tăng dần.** Đổi lớp = hủy + đăng ký nên
nó chạm hai hàng `class_session`. Hai người đổi chéo nhau (A→B và B→A) sẽ khoá
ngược thứ tự của nhau; khoá sẵn cả hai theo thứ tự cố định là cách duy nhất
không phải trông vào việc PostgreSQL gỡ deadlock. Tập gói ứng viên cũng được
khoá trước theo `id` tăng dần, vì gói nhận buổi hoàn và gói trả buổi cho lớp mới
có thể là hai gói khác nhau.

### Bốn lớp phòng vệ của luồng đăng ký

1. `FOR UPDATE` trên `student_package` — bảo vệ **số dư**.
2. `FOR UPDATE` trên `class_session` — bảo vệ **sức chứa**.
3. Partial unique trên `booking` — chặn đặt trùng cùng lớp ở tầng CSDL.
4. `CHECK (balance_cached >= 0)` — chặn số dư âm kể cả khi logic app sai.

## 10. Nhắc gia hạn

Ngưỡng `RENEWAL_THRESHOLD`: còn **≤6 buổi HOẶC ≤15 ngày**.

Quan hệ là **HOẶC**, không phải VÀ — người còn 20 buổi nhưng hết hạn sau 10 ngày
vẫn cần liên hệ. Tính trên gói đang hoạt động, ngày tính theo `Asia/Ho_Chi_Minh`.

**Không gửi tin tự động** ở bất kỳ đâu. Hệ thống chỉ lập danh sách người cần
liên hệ. Zalo/WhatsApp chỉ có nút **mở kênh** (deep link), không gửi nội dung.

Lịch sử liên hệ `renewal_contact` là **append**, không ghi đè.

## 11. Phân quyền

| Tài nguyên | ADMIN | STAFF | TRAINER | STUDENT | Ẩn danh |
|---|---|---|---|---|---|
| Trang công khai, form tư vấn | ✓ | ✓ | ✓ | ✓ | ✓ |
| Học viên, gói, thanh toán, sổ buổi | ✓ | ✓ | — | chỉ của mình | — |
| HLV (quản lý) | ✓ | ✓ | chỉ hồ sơ mình | — | — |
| Lịch dạy | ✓ | ✓ | **chỉ lớp mình** | — | — |
| Lớp & lịch (tạo/sửa/hủy) | ✓ | ✓ | — | — | — |
| Đăng ký/hủy/đổi lớp | — | — | — | **chỉ của mình** | — |
| Xem danh sách / cập nhật điểm danh | — | — | **chỉ lớp mình dạy, cập nhật sau ends_at** | — | — |
| **Ảnh tiến trình** (xem/tải lên) | ✓ | **—** | **chỉ HLV phụ trách** | **chỉ của mình** | — |
| **Ảnh tiến trình** (xoá) | ✓ | — | — | — | — |
| Điều chỉnh số buổi thủ công | ✓ | — | — | — | — |
| Quản lý tài khoản | ✓ | — | — | — | — |
| Tự sửa tên/số điện thoại | chỉ của mình | chỉ của mình | chỉ của mình | chỉ của mình | — |
| Báo cáo | ✓ | ✓ | — | — | — |

Ba quy tắc dễ làm sai nhất, mỗi quy tắc có test riêng **và test âm**:
HLV chỉ thấy lớp mình dạy · học viên chỉ thấy dữ liệu của mình ·
**STAFF không xem được ảnh tiến trình**.

Cưỡng chế: truy vấn của TRAINER và STUDENT **luôn kèm điều kiện lọc theo chủ sở
hữu ngay trong câu truy vấn**, không lấy hết rồi lọc sau. Lọc sau là cách rò rỉ
dữ liệu qua id trực tiếp.

**Quyền xoá ảnh tiến trình hẹp hơn quyền xem.** Xem là thao tác đọc; xoá là huỷ
dữ liệu không hoàn tác. Cho HLV phụ trách xoá nghĩa là họ xoá được ảnh của học
viên mình dạy, và cho học viên xoá nghĩa là bằng chứng tiến trình biến mất theo
một lần bấm nhầm. Đáp án câu 15 của khách chỉ nói về quyền **xem** — đây là mặc
định an toàn, đang chờ khách xác nhận.

### "HLV phụ trách học viên đó" nghĩa là gì

Định nghĩa đang dùng: HLV đã hoặc đang dạy ít nhất một buổi mà học viên có đăng
ký chưa bị hủy. Hệ thống không có bảng phân công riêng và một studio một cơ sở
chưa cần tới nó. Cài đặt: `app/core/permissions.py::is_assigned_trainer`.

## 12. Xác thực và phiên

- GET /auth/me trả tên, số điện thoại và liên kết hồ sơ của người đăng nhập.
  PATCH /auth/me cho mọi vai tự sửa full_name/phone; học viên/HLV đồng bộ
  hồ sơ liên kết trong cùng giao dịch. Email đăng nhập, role, liên kết và
  trạng thái tài khoản không sửa qua API này. Phone học viên không được trống
  hoặc trùng học viên khác. STAFF có thể xóa phone tùy chọn.

- **Không có chức năng tự đăng ký tài khoản.** Học viên liên hệ studio, admin
  tạo hồ sơ rồi cấp tài khoản STUDENT kèm `student_id`. Tạo tài khoản và nối hồ
  sơ là một giao dịch. Chiều đọc của liên kết đối xứng với chiều ghi: response
  tài khoản mang `student_id` / `trainer_id`, đúng hình dạng của `GET /auth/me`. Tài khoản cũ chưa nối có thể được admin nối bằng PATCH
  tài khoản; không chuyển chủ sở hữu hoặc đổi vai tài khoản đang nối hồ sơ.

- Mật khẩu băm bằng **argon2**. JWT access ngắn hạn + refresh token.
- **Refresh token lưu trong CSDL**, xoay vòng khi dùng, phát hiện tái sử dụng.
  Dùng lại một token đã xoay vòng → thu hồi **toàn bộ** token của người đó.
- **Khoá tài khoản hoặc đổi mật khẩu → thu hồi toàn bộ refresh token.**
  Không có bước này, tiêu chí "tài khoản bị khoá không đăng nhập được" là đúng
  nhưng vô nghĩa: JWT vô trạng thái, người bị khoá vẫn phát access token mới.
- **Chặn brute-force** `/auth/login` theo **cả IP và tài khoản**, backoff luỹ tiến.
  Bộ đếm theo tài khoản được xoá sau một lần đăng nhập thành công; **bộ đếm
  theo IP thì không** — nếu xoá, kẻ rải mật khẩu qua nhiều tài khoản chỉ cần
  xen một lần đăng nhập thật bằng tài khoản của chính mình là vòng qua được.
- `/auth/forgot-password` cũng có giới hạn tần suất (theo IP và theo email), và
  **gửi thư ngoài đường phản hồi**: gửi đồng bộ thì chỉ email tồn tại mới tốn
  một vòng SMTP, nên thân response giống nhau mà thời gian phản hồi thì không.
- **Ràng buộc triển khai:** bộ đếm tần suất nằm trong bộ nhớ tiến trình, nên API
  phải chạy **một worker**. `uvicorn --workers N` sẽ lặng lẽ nhân mọi ngưỡng lên
  N lần. Chạy nhiều worker đòi hỏi chuyển bộ đếm sang kho chung trước.
- Access token mang claim `typ: "access"` và **phép kiểm claim này là bắt buộc**.
  Thiếu nó, refresh token (cũng mang `sub`) dùng thẳng được làm
  `Authorization: Bearer`, và đăng xuất hay đổi mật khẩu đều không chạm tới nó.
- Refresh token xoay vòng có **cửa sổ ân hạn vài giây**: gửi trùng trong cửa sổ
  được trả lại đúng bản thay thế (SPA hay bắn nhiều request cùng lúc), ngoài
  cửa sổ vẫn là trộm token và vẫn thu hồi sạch.
- Token đặt lại mật khẩu: lưu dạng **hash**, có `expires_at` và `used_at`, dùng
  một lần. **Không bao giờ trả token trong response API** — kênh duy nhất là
  transactional email.
- `/auth/forgot-password` luôn trả cùng một thông điệp dù email có tồn tại hay
  không — phản hồi khác nhau chính là công cụ dò danh sách email của studio.
- **Đổi mật khẩu phải nhập mật khẩu hiện tại**, áp cho mọi vai kể cả ADMIN.
- Tài khoản nhập từ Excel tạo ở `PENDING_ACTIVATION`, **không mật khẩu**, kích
  hoạt qua email. **Không bao giờ sinh mật khẩu suy ra từ số điện thoại** — số
  điện thoại lộ qua form tư vấn và danh bạ studio.

## 13. Bảo vệ đầu vào và đầu ra

- Giới hạn độ dài + validate phía server cho **mọi** trường văn bản tự do,
  **gồm cả `phone`**: trường ngắn nhưng vẫn đủ chỗ cho `<svg onload=...>`.
- Số điện thoại được **chuẩn hoá** (bỏ khoảng trắng và dấu phân tách) trước khi
  so trùng. Không chuẩn hoá thì `0900 000 055` và `0900000055` là hai bản ghi
  khác nhau, và mọi phép chặn trùng vòng qua được bằng một dấu cách.
- Ảnh được kiểm dung lượng **trước khi đọc vào bộ nhớ**, và chỉ ghi xuống đĩa
  **sau khi** hàng tương ứng đã qua ràng buộc CSDL — ghi tệp trước thì mỗi lần
  vi phạm ràng buộc để lại một tệp mồ côi.
- `announcement.body` chỉ nhận văn bản thuần hoặc một tập markup giới hạn qua
  sanitizer whitelist. Đường XSS lưu trữ ngắn nhất: khách ẩn danh gửi form tư
  vấn → nhân viên mở danh sách lead → token bị đánh cắp.
- Upload ảnh: sniff content-type (**không tin phần mở rộng**), giới hạn dung
  lượng, **re-encode phía server để bóc EXIF** (ảnh cơ thể mang toạ độ GPS nhà
  học viên), lưu dưới khoá ngẫu nhiên, không public bucket.
- **CORS allow-list** tường minh + CSP header.
- Response công khai dùng schema riêng `app/schemas/public.py` (dựng ở F02) với
  **allow-list trường tường minh**: HLV chỉ `full_name`, `photo_key`, `bio` — không `phone`,
  không id nội bộ. Buổi lớp chỉ `starts_at`, `ends_at`, `class_type`,
  `trainer_name`, `is_full` (**boolean**, không phải danh sách người).

## 14. Quy tắc nội dung trang công khai

**Không được xuất hiện trên trang công khai:**

- Chứng chỉ / bằng cấp / số năm kinh nghiệm HLV
- Tên Việt trông như thật trong dữ liệu mẫu (dùng `Học viên Demo 01`)
- Giờ mở cửa
- Số liệu kinh doanh (doanh thu, % tăng, tổng số học viên)
- Cụm **"tối đa 3 người mỗi lớp"**

**Giá gói:** hiện giá **khi studio cung cấp**, trạng thái rỗng có nhãn khi chưa
có. Cấm *bịa* giá, **không** cấm giá.
`package_type.price` vì thế nhận NULL: NULL nghĩa là "chưa có giá", khác hẳn 0 —
0 là một con số và nó nói sai. API công khai trả `price` dạng **chuỗi thập
phân** hoặc `null`, không bao giờ là số thực.

**Phân biệt phải giữ:** lịch lớp công khai hiển thị các buổi *đã được xếp* là sự
kiện có thật, hợp lệ. "Giờ mở cửa 7:30–19:30" là một khẳng định về studio mà
chưa ai cung cấp — vẫn cấm.

**Chỗ trống:** giữ nguyên hình học, nhưng nhãn nói thật — "Ảnh studio — đang
chờ", không phải "Sắp ra mắt". Số chưa có thì **để trống, không để 0**.

**Cưỡng chế ba lớp:**

1. **Validator phía server khi ghi** (`app/core/content_rules.py`, đã có) cho mọi
   trường đăng công khai — trả 422 nêu rõ luật bị vi phạm. Đây là lớp duy nhất
   bắt được nội dung nhân viên nhập **sau go-live**.
   Áp cho: `trainer.full_name`, `trainer.bio`, `trainer.specialties`,
   `announcement.title`, `announcement.body`, `student.full_name`.
   Phép đối chiếu chạy trên **dạng người đọc nhìn thấy**, không phải dạng lưu:
   bóc thẻ, giải mã thực thể, chuẩn hoá NFC, xoá ký tự vô hình. Thiếu bước này,
   `Lớp tối đa <strong>3</strong> người` và `Chứng<ZWSP>chỉ` đều lọt qua trong
   khi trang vẫn hiển thị đúng câu bị cấm.
2. Cổng CI kiểm **DOM của các route công khai** (không grep toàn bundle — SPA
   một bundle chứa cả màn bán gói và báo cáo, grep sẽ fail giả).
3. Rà thủ công **sau khi nhập dữ liệu thật**, trước khi khách ký nghiệm thu.

## 15. Doanh thu và báo cáo

- Doanh thu **chỉ tính giao dịch `CONFIRMED`**, theo `confirmed_at`, biên kỳ
  tính theo `Asia/Ho_Chi_Minh`.
- Mọi con số trên bảng tổng hợp phải **mở ra được danh sách chi tiết** đứng sau
  nó. Không mở ra xem được thì con số đó không có chỗ trên màn hình.
- `detail_path` phải mang **đúng khoảng nửa mở** mà con số đã dùng, không phải
  một cặp ngày xấp xỉ. Truyền `period_end` dạng ngày làm mất trọn ngày cuối kỳ,
  vì danh sách lọc `starts_at < starts_to`.
- **Mốc thời gian không kèm múi giờ trên query string nghĩa là giờ studio**
  (`as_studio_time`). So một giá trị naive với cột `timestamptz` thì PostgreSQL
  diễn giải nó theo múi giờ *của kết nối* — UTC trên container — nên
  `?starts_from=2026-09-01` lệch 7 giờ. Rule `DTZ` của ruff không phủ được chỗ
  này vì giá trị do FastAPI dựng.
- Số lớp theo HLV luôn tính từ `class_session` — cùng nguồn với màn chi tiết HLV,
  phải cho cùng con số.
- **Chưa có dữ liệu thì để trống, không để 0.** Mức lấp đầy của một kỳ không có
  lớp nào trả về `null`, không phải `0` — không có lớp thì mức lấp đầy không tồn
  tại, còn 0% nói rằng lớp có mở mà không ai đến.
- **Bảng tổng hợp không có ô doanh thu.** Nó mở suốt ngày ở quầy lễ tân, nơi
  khách đứng nhìn được màn hình; doanh thu có màn riêng.
- File xuất dùng **đúng truy vấn của màn hình**, không viết truy vấn thứ hai.
- **Trung hoà công thức khi xuất**: ô bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc
  CR phải được trung hoà. `lead.need` đến từ form công khai ẩn danh — không có
  bước này thì một khách ẩn danh gửi `=cmd|'...'!A1`, nhân viên mở file xuất và
  thực thi mã trên máy studio.

## 16. Nhập dữ liệu ban đầu — phải idempotent

- Mỗi dòng có **khoá ngoài ổn định** từ file nguồn; unique trên
  `(import_source, external_ref)` cho `student`, `student_package`,
  `class_session`.
- Toàn bộ import trong **một transaction**. Dòng đã có khoá ngoài thì bỏ qua;
  ràng buộc `UNIQUE` là phán quyết cuối, phép kiểm ở script chỉ là đường nhanh.
- **Mỗi dòng ghi trong một savepoint riêng.** Va chạm ràng buộc biến dòng đó
  thành một dòng `problems` chỉ đúng vị trí, rồi chạy tiếp. Không có lớp này,
  một số điện thoại trùng ở dòng 340/500 ném traceback ra khỏi cả lần chạy:
  người vận hành không biết dòng nào hỏng và không dòng nhật ký nào được ghi.
  Hai người thật dùng chung một email — mẹ và con — thì người thứ hai vẫn được
  nhập, chỉ là chưa có tài khoản.
- Mặc định là **chạy thử rồi rollback**; phải có `--commit` mới ghi thật.
- Mỗi lần chạy ghi một dòng `import_run` kèm `file_hash` (SHA-256) và tóm tắt,
  trong **transaction riêng commit độc lập với dữ liệu**. Ghi chung thì lần chạy
  thử rollback luôn dòng nhật ký, cột `dry_run` không bao giờ mang giá trị
  `True`, và yêu cầu *diễn tập đầy đủ trước ngày nhập thật* không để lại gì để
  chứng minh đã diễn tập. Một lần nhập hỏng vì số dư lệch cũng vẫn để lại bằng
  chứng nó đã chạy và hỏng vì lý do gì.
- Gói đã mua nhập kèm số buổi còn lại → sinh bút toán mở sổ `PACKAGE_SOLD`,
  **không ghi thẳng số dư**.
- Sau import: khẳng định `SUM(delta)` mỗi gói **khớp số dư ghi trong file
  Excel**, không chỉ khớp chính nó; rồi chạy bảy mệnh đề đối soát. Lệch thì
  rollback toàn bộ.
- Số điện thoại được **chuẩn hoá trước khi ghi**. Chính khoảng trắng thừa trong
  `0900 000 055` là thứ làm lần chạy đầu chết giữa chừng ở kịch bản đã lường
  trước.
- Giờ trong file là **giờ studio**, không phải UTC — file do nhân viên ở Nha
  Trang gõ tay.
- Tài khoản cho người được nhập tạo ở `PENDING_ACTIVATION`, **không mật khẩu**.
  Không có email thì **không tạo tài khoản**; bịa một địa chỉ suy ra từ tên hay
  số điện thoại là tạo ra một hộp thư không ai kiểm soát rồi gửi link đặt mật
  khẩu tới đó.
- `so_buoi_ban_dau` là cột **tuỳ chọn**. Thiếu thì `credits_snapshot` lấy bằng
  số buổi còn lại — studio không nhớ gói gốc bao nhiêu buổi là chuyện bình
  thường, còn bịa một con số tròn trịa là nói rằng học viên đã tập bấy nhiêu
  buổi, điều không ai kiểm được.
- **HLV nhận diện theo họ tên**, vì `trainer` không có cặp cột
  `(import_source, external_ref)` như ba bảng kia. Một studio một cơ sở có chưa
  tới mười HLV nên trùng tên phát hiện được bằng mắt; đây là ngoại lệ duy nhất
  của quy tắc khoá ngoài ổn định (xem câu hỏi #6 cuối tài liệu).

Bố cục file Excel (tên sheet · cột ở hàng đầu):

| Sheet | Cột |
|---|---|
| `hoc_vien` | `ma_hoc_vien`, `ho_ten`, `so_dien_thoai`, `email`, `ghi_chu` |
| `hlv` | `ho_ten`, `so_dien_thoai`, `email` |
| `goi_tap` | `ma_goi`, `ma_hoc_vien`, `ten_goi`, `loai_lop`, `so_buoi_con_lai`, `ngay_bat_dau`, `ngay_het_han`, `gia`, `so_buoi_ban_dau` (tuỳ chọn) |
| `lich_lop` | `ma_lop`, `ten_hlv`, `bat_dau`, `ket_thuc`, `loai_lop`, `suc_chua` |

---

## Bất biến sổ buổi — bảy mệnh đề kiểm được

Mỗi mệnh đề **có thể fail**, và mỗi mệnh đề có test âm chứng minh nó fail được.

| # | Bất biến |
|---|---|
| 1 | `balance_cached = SUM(delta)` cho mọi `student_package` |
| 2 | `SUM(delta) >= 0` cho mọi `student_package` |
| 3 | Mỗi `booking` đang hoạt động có **đúng một** `BOOKING_DEDUCT`, trỏ đúng `student_package_id` của booking |
| 4 | Mỗi `booking_id` có **tối đa một** `CANCEL_REFUND` |
| 5 | Mọi `BOOKING_DEDUCT` có booking tương ứng, và ngược lại |
| 6 | Không bút toán tiêu buổi nào mang dấu dương (`BOOKING_DEDUCT` và `PAYMENT_VOID` chỉ được làm giảm số dư) |
| 7 | `student_package` của mọi dòng ledger thuộc đúng học viên của booking |

Bất biến #7 là thứ duy nhất bắt được kiểu gian lận "dùng gói người khác" — phép
đối soát tổng mù hoàn toàn với nó.

> Bất biến #6 từng được phát biểu là "`SUM(delta)` không vượt số buổi đã được
> cấp". Cách viết đó **không thể đỏ**: mọi lần hoàn thừa hay cộng khống đều
> làm cả hai vế tăng cùng nhịp. Nay nó phát biểu đúng điều nó kiểm được.

---

## Đang chờ khách xác nhận

Các quy tắc dưới đây **đã được cài đặt theo mặc định an toàn** và đang chạy.
Khi khách chốt khác đi, mỗi dòng chỉ ra đúng chỗ cần sửa.

| # | Câu hỏi | Mặc định đang chạy | Sửa ở đâu nếu khách chốt khác |
|---|---|---|---|
| 1 | Cộng buổi khi *tạo gói* hay khi *xác nhận thanh toán*? | Cộng khi **tạo gói** — nhân viên đứng quầy cần học viên tập được ngay; đối soát tiền là việc khác | `app/services/credit_ledger.py` + luồng bán gói ở F05 |
| 2 | Gói hết hạn có thu hồi buổi chưa dùng không? | **Không thu hồi**. Số dư hiển thị chỉ tính gói đang hoạt động | Mục 6 tài liệu này + định nghĩa "gói đang hoạt động" ở `app/domain/rules.py` |
| 3 | "HLV" được xem ảnh tiến trình là mọi HLV hay HLV phụ trách? | **Chỉ HLV phụ trách** (mặc định an toàn; đáp án của khách không nói rõ) | `app/core/permissions.py::is_assigned_trainer` |
| 4 | Giá gói có hiển thị công khai không? | **Hiện khi studio cung cấp**, trạng thái rỗng có nhãn khi chưa có | `app/schemas/public.py` |
| 5 | Ai được **xoá** ảnh tiến trình? | **Chỉ ADMIN** — đáp án câu 15 chỉ nói về quyền xem | `app/api/progress_photos.py::delete_progress_photo` |
| 6 | HLV trong file nhập liệu có mã riêng không? | Nhận diện theo **họ tên** — `trainer` chưa có cặp cột khoá ngoài | Thêm cột vào `app/models/people.py::Trainer` + một migration, rồi `scripts/import_initial_data.py::_import_trainers` |
| 7 | `VOID` một thanh toán của gói **đã có buổi từ nguồn khác** (gia hạn, điều chỉnh tay) | **Từ chối** — thu hồi cả số dư sẽ xoá cả buổi không thuộc giao dịch đó | `app/services/payments.py::void_payment`. Phương án "chỉ thu hồi phần của lần bán" cần gắn `payment_id` vào bút toán ledger — đổi schema |
| 8 | "Chi tiết HLV / thống kê tháng" là màn của nhân viên hay HLV tự xem? | **Chỉ nhân viên** (`require_staff`) — HLV hiện không xem được số của chính mình | `app/api/classes.py::trainer_monthly_stats` |

Ngoài ra, **khung giờ thật studio dạy** vẫn cần studio cung cấp — nó chỉ ảnh
hưởng thước giờ ở giao diện, không ảnh hưởng quy tắc backend.
