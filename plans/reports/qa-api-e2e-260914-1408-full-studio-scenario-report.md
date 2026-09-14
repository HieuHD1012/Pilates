# Demo nghiệm thu — Một ngày vận hành studio, chạy thật trên API

- Ngày chạy: 2026-09-14. **Bổ sung 2026-09-15: Màn 13 — vai STAFF**, vai duy
  nhất chưa có mặt trong buổi demo gốc.
- Phạm vi: backend `src_BE` (FastAPI + PostgreSQL 16), **88 endpoint**.
- Cách chạy: request thật qua FastAPI `TestClient` → PostgreSQL thật (container
  `pilates_db_test`, cổng 5434, database `pilates_test`), schema dựng bằng migration.
- Không có mock, không sửa thẳng vào bảng. Mọi dữ liệu trên sân khấu đều được
  tạo qua chính API mà nhân viên studio sẽ bấm. Ngoại lệ duy nhất: tài khoản
  admin đầu tiên, giống hệt script seed lúc khai trương.

## Đọc tài liệu này thế nào

Đây **không phải** bảng kê "bao nhiêu test đã pass". Mỗi màn dưới đây là một
tình huống có thật ở quầy lễ tân, viết theo đúng thứ tự người dùng bấm. Phần
"Trên màn hình" là thứ khán giả nhìn thấy; phần "Hệ thống chốt" là điều kiện
bài kiểm bắt buộc phải đúng, nếu sai thì demo dừng ngay tại đó.

Mỗi màn là một test độc lập: **dựng lại studio mới từ đầu**, chạy, rồi xóa. Màn
sau không thừa hưởng gì của màn trước, nên không có màn nào "chỉ chạy được khi
chạy sau màn kia".

Chạy toàn bộ buổi demo (13 màn, ~25 giây), từ thư mục `src_BE`:

```bash
DATABASE_URL=postgresql+psycopg://pilates:pilates@localhost:5434/pilates_test \
ENVIRONMENT=test TZ=UTC .venv/bin/python -m pytest -v --disable-warnings tests/e2e/
```

## Bản đồ buổi demo

```mermaid
flowchart TB
    M0["🎬 Mở màn · test_main_flow<br/>Một học viên đi hết vòng đời<br/>sổ cân ở từng bước"]
    M1["Màn 1 · Điểm danh sân khấu<br/>1 admin · 3 HLV · 8 học viên"]

    subgraph A ["① Đăng ký lớp — nơi buổi tập đổi chủ"]
        direction LR
        M2["Màn 2<br/>Đặt → đổi → hủy<br/>và hạn hủy"]
        M3["Màn 3<br/>4 lý do<br/>không đặt được"]
        M4["Màn 4<br/>Lớp đầy<br/>→ nhả chỗ"]
    end

    subgraph B ["② Vận hành lịch lớp"]
        direction LR
        M5["Màn 5<br/>Lịch lặp · trùng giờ HLV<br/>đổi HLV · hủy lớp"]
        M12["Màn 12<br/>HLV điểm danh<br/>sau giờ tan lớp"]
    end

    subgraph C ["③ Tiền và sổ buổi"]
        direction LR
        M6["Màn 6<br/>PENDING · CONFIRMED · VOID<br/>gia hạn · điều chỉnh tay"]
        M7["Màn 7<br/>Nhắc gia hạn"]
        M8["Màn 8<br/>Báo cáo<br/>xuất CSV · XLSX"]
    end

    subgraph D ["④ Ranh giới truy cập"]
        direction LR
        M9["Màn 9<br/>Bốn vai chạm được gì"]
        M10["Màn 10<br/>Trang công khai"]
        M11["Màn 11<br/>Ảnh tiến trình"]
        M13["Màn 13<br/>Lễ tân trực ca<br/>và bốn cánh cửa đóng"]
    end

    M0 --> M1 --> A --> B --> C --> D
```

## Dàn nhân vật

**1 ADMIN** (`quanly@example.com`) · **3 HLV** — Ngọc Mai, Thu Hà (hiện trên web),
Quốc Bảo (không hiện; cờ này chỉ quyết định hiển thị công khai, **không** chia
HLV theo Group/Private).

**8 học viên, 8 tình trạng gói khác nhau** — cố ý, vì phần lớn lỗi còn sót nằm ở
chỗ nối giữa các màn hình, và chúng chỉ lệch nhau khi có đủ dữ liệu để lệch:

| Học viên | Gói | Tiền | Còn | Vai trò trong demo |
|---|---|---|---|---|
| Lan | Group 20 | CONFIRMED 4,5tr | 20 | Nhân vật chính: đặt / đổi / hủy |
| Minh | Group 10 | **PENDING** 2,5tr chuyển khoản | 10 | Khoản treo chưa xác nhận |
| Trang | Private 5 | CONFIRMED 3tr | 5 | Gói không dùng chéo loại lớp |
| Huy | Group 10, điều chỉnh −8 | CONFIRMED 2,5tr | 2 | Sắp hết buổi → hết buổi |
| Phương | Group 10, mua 80 ngày trước | CONFIRMED 2,5tr | 10 | Còn 10 ngày → gia hạn |
| Nam | *chưa mua gì* | — | 0 | `NO_PACKAGE` |
| Ngân | Group 10 | CONFIRMED 2,5tr | 10 | Nhả chỗ ở lớp đầy |
| Yến | Group 10 | **VOID** (tiền không về) | 0 | Khách web → học viên; gói bị thu hồi |

**Một LỄ TÂN (STAFF)** — *Lễ tân Thảo*, dựng riêng trong Màn 13 chứ không nằm ở
sân khấu chung: mười hai màn còn lại khẳng định "ADMIN làm được X", thêm một
nhân vật vào seed chung sẽ đổi số đếm của chúng mà không màn nào nói về lễ tân.

**Sân khấu lớp học** — 7 lớp lẻ, mỗi lớp dựng cho đúng một tình huống:
lớp mai (sức chứa 6) · lớp **sau 2 giờ nữa** (dưới ngưỡng hủy 4 giờ của Group) ·
lớp **sức chứa 1** để thử hết chỗ · lớp để studio hủy · lớp để đổi HLV ·
Private Duo (2 chỗ) · Private 1 kèm 1. Cộng thêm 6 buổi lịch lặp tạo trong màn 5.

**Chốt chặn chạy ngầm suốt buổi demo:** sau **mỗi** thao tác làm đổi số buổi,
`assert_ledger_is_sound` kiểm lại toàn bộ 7 bất biến của sổ. Sổ lệch một dòng ở
màn 2 mà đến màn 8 mới phát hiện là mất cả buổi chiều để truy.

## Xương sống của cả buổi demo — một lượt đăng ký đi qua đâu

Gần như mọi màn dưới đây đều là một đường đi trên sơ đồ này. Chú ý cột bên phải
của từng mũi tên: **thao tác nào đụng vào sổ buổi và thao tác nào không.**

```mermaid
stateDiagram-v2
    direction LR
    [*] --> BOOKED: đặt lớp · sổ −1

    BOOKED --> CANCELLED_INTIME: học viên hủy TRƯỚC hạn · sổ +1 · ghế trả lại
    BOOKED --> CANCELLED_INTIME: studio hủy LỚP · sổ +1 · bất kể còn bao lâu
    BOOKED --> ATTENDED: HLV điểm danh có mặt · sổ KHÔNG đổi
    BOOKED --> NO_SHOW: HLV điểm danh vắng · sổ KHÔNG đổi, KHÔNG hoàn

    BOOKED --> BOOKED: hủy SAU hạn → CANCELLATION_CLOSED · không đổi gì cả

    ATTENDED --> NO_SHOW: HLV sửa nhầm
    NO_SHOW --> ATTENDED: HLV sửa nhầm

    note right of NO_SHOW
        BOOKED · ATTENDED · NO_SHOW
        đều còn GIỮ GHẾ
        → sĩ số lớp không đổi sau điểm danh
        → vắng mặt vẫn mất buổi
    end note
```

Ba điều đọc thẳng ra từ sơ đồ, và cũng là ba chỗ hay bị hiểu ngược nhất:

1. **Chỉ hai mũi tên có `+1`** — học viên hủy đúng hạn, và studio hủy lớp. Không
   có đường nào khác trả buổi về cho khách.
2. **`CANCELLATION_CLOSED` là mũi tên vòng lại chính nó** — quá hạn thì bấm hủy
   không tạo ra trạng thái mới nào, không trừ thêm, không hoàn thêm. Không có
   trạng thái "đã hủy muộn" trong luồng hiện tại.
3. **Điểm danh không có nhánh nào chạm sổ** — buổi đã trừ từ lúc đặt.

---

## Mở màn — Một học viên đi hết vòng đời, sổ cân ở từng bước

`tests/e2e/test_main_flow.py`

Một studio tối giản, một học viên: mua gói → thanh toán → đặt lớp → hủy → gia hạn.
Sau **từng** bước, số dư đọc từ sổ phải khớp số hiển thị trên hồ sơ.

Màn này đi trước vì nó trả lời câu hỏi rẻ nhất: nếu chuỗi cơ bản đã lệch thì
không cần xem 12 màn sau.

---

## Màn 1 — Điểm danh sân khấu trước khi diễn

**Trên màn hình.** Admin mở danh sách tài khoản, học viên, HLV.

**Hệ thống chốt.** Đúng 1 ADMIN + 3 TRAINER + 8 STUDENT. Mỗi vai đăng nhập đọc
`/auth/me` ra đúng danh tính nghiệp vụ của mình — HLV ra `trainer_id`, học viên
ra `student_id`. Tám số dư đúng như bảng trên: Huy còn 2 sau điều chỉnh tay, Nam
0 vì chưa mua, **Yến 0 vì giao dịch bị hủy đã thu hồi toàn bộ buổi**. Khách để lại
số trên Facebook đã thành học viên Yến, và bản ghi tư vấn gốc vẫn còn nguyên
(`CONVERTED`, `source=facebook`).

*Vì sao có màn này:* một seed sai làm mọi khẳng định sau đó nói về một hệ thống
khác. Sân khấu phải đúng trước khi kịch bản bắt đầu.

## Màn 2 — Lan đặt, đổi, hủy, và gặp hạn hủy

**Trên màn hình.** Lan đặt lớp ngày mai → **còn 19 buổi ngay lập tức**. Lịch của
Lan hiện tên HLV Ngọc Mai, nút hủy sáng, kèm lời hứa "hủy bây giờ được hoàn".

Lan đổi sang lớp khác → màn hình báo buổi cũ đã hoàn, buổi mới đã trừ, **vẫn 19**.
Lan hủy hẳn → **về 20**, và ghế vừa nhả hiện lại ở lớp đó.

Rồi Lan đặt lớp **bắt đầu sau 2 giờ nữa**. Lịch lần này hiện khác hẳn: nút hủy
**tắt**, không hứa hoàn gì. Lan vẫn bấm hủy → `CANCELLATION_CLOSED`. Bấm lần hai
→ vẫn `CANCELLATION_CLOSED`, số buổi đứng yên ở 19.

**Hệ thống chốt.** Đổi lớp là **một giao dịch**: hoàn buổi cũ rồi trừ buổi mới,
áp đúng quy tắc hoàn của lần hủy đó. Sau hạn hủy (Group 4 giờ) thì **khóa thao
tác**, không phải "hủy được nhưng mất buổi". Hai trường `can_cancel` và
`refund_if_cancelled_now` trên lịch cố ý luôn bằng nhau, tính từ **đúng hàm mà
luồng hủy dùng** — màn hình không được hứa một đằng, nút bấm làm một nẻo. Hủy
lần hai không hoàn thêm lần nữa.

### Hạn hủy nhìn trên trục thời gian

```text
LỚP GROUP — ngưỡng 4 giờ
   ──────────────────────────────────────┬───────────────┬────────►
    hủy được · HOÀN 1 buổi               │   KHÓA hủy    │  🏁 lớp
    (nút sáng, lịch hứa hoàn)            │   và KHÓA đổi │  bắt đầu
                                   T−4h ─┘          T−0 ─┘

LỚP PRIVATE / DUO — ngưỡng 1 giờ
   ──────────────────────────────────────────────┬───────┬────────►
    hủy được · HOÀN 1 buổi                       │ KHÓA  │  🏁
                                           T−1h ─┘  T−0 ─┘

   Đúng mốc T−4h / T−1h: VẪN hủy được (so sánh là <=, không phải <).
   Mọi mốc tính theo giờ studio Asia/Ho_Chi_Minh, không theo giờ máy chủ.
```

### Bốn thao tác của Lan, và sổ buổi chạy kèm

```mermaid
sequenceDiagram
    autonumber
    actor L as Lan
    participant API as API
    participant S as Sổ buổi

    Note over L,S: Số dư mở màn — 20 buổi

    L->>API: POST /bookings · lớp mai
    API->>S: BOOKING_DEDUCT −1
    API-->>L: BOOKED · còn 19
    L->>API: GET /my-schedule
    API-->>L: can_cancel ✅ · hoàn nếu hủy ✅ · HLV Ngọc Mai

    rect rgb(232, 245, 233)
    Note over L,S: Đổi lớp là MỘT giao dịch — hoặc cả hai vế, hoặc không gì cả
    L->>API: POST /bookings/{id}/change
    API->>S: CANCEL_REFUND +1
    API->>S: BOOKING_DEDUCT −1
    API-->>L: hoàn buổi cũ · trừ buổi mới · vẫn 19
    end

    L->>API: POST /bookings/{id}/cancel
    API->>S: CANCEL_REFUND +1
    API-->>L: CANCELLED_INTIME · về 20 · ghế trả lại lớp

    rect rgb(253, 236, 234)
    Note over L,S: Lớp bắt đầu sau 2 GIỜ — dưới ngưỡng 4 giờ của Group
    L->>API: POST /bookings · lớp sau 2h
    API->>S: BOOKING_DEDUCT −1
    API-->>L: BOOKED · còn 19
    L->>API: GET /my-schedule
    API-->>L: can_cancel ⛔ · KHÔNG hứa hoàn gì
    L->>API: POST /bookings/{id}/cancel
    API--xL: CANCELLATION_CLOSED · sổ không đổi
    L->>API: POST /bookings/{id}/cancel · bấm lại lần hai
    API--xL: CANCELLATION_CLOSED · vẫn 19
    end
```

## Màn 3 — Bốn cách không đặt được lớp, bốn câu trả lời khác nhau

**Trên màn hình.** Nhân viên đứng quầy cần biết phải bán gì cho khách, nên bốn
tình huống này phải ra bốn thông báo, không gộp thành "không đặt được":

| Ai | Bấm gì | Nhận |
|---|---|---|
| Nam | Đặt lớp Group | `NO_PACKAGE` — chưa có gói nào |
| Lan (gói Group) | Đặt lớp Private | `PACKAGE_TYPE_MISMATCH` |
| Trang (gói Private) | Đặt lớp Group | `PACKAGE_TYPE_MISMATCH` |
| Trang | Đặt Private Duo | ✅ trừ 1, còn 4 |
| Trang | Đặt lại đúng buổi đó | `ALREADY_BOOKED` |
| Huy sau khi dùng hết 2 buổi | Đặt lớp | `PACKAGE_OUT_OF_CREDITS` |

**Hệ thống chốt — hai phép chặn nằm ở server, không ở giao diện.** Huy gửi kèm
`student_package_id` **của Lan** (id là số, đoán được) → **404**, không phải 403:
hai mã khác nhau sẽ thành một bộ đếm số gói của studio. Huy gửi kèm
`student_id` của Lan để đặt hộ → **403**. Không vai nào đặt hộ được, kể cả ADMIN.

### Sơ đồ cổng kiểm — mọi lối ra của `POST /bookings`

Sơ đồ này là bản đồ chung cho cả Màn 3 và Màn 4, và cũng là thứ FE cần để biết
mình phải bắt bao nhiêu nhánh. Nửa dưới khung xám là chỗ quan trọng nhất:
**sau khi lấy khóa, mọi phép kiểm chạy lại từ đầu** — đếm chỗ trước khi khóa là
đọc một con số hết hạn ngay lúc đọc xong.

```mermaid
flowchart TD
    S(["POST /bookings"]) --> G1{"Buổi lớp có tồn tại?"}
    G1 -- không --> X404["404 NOT_FOUND"]
    G1 -- có --> G2{"Đặt cho CHÍNH MÌNH?"}
    G2 -- "đặt hộ người khác<br/>hoặc không phải STUDENT" --> X403["403 FORBIDDEN"]
    G2 -- có --> G3{"Lớp còn nhận đăng ký?"}
    G3 -- "lớp đã hủy" --> E1["SESSION_CANCELLED"]
    G3 -- "lớp đã bắt đầu" --> E2["SESSION_STARTED"]
    G3 -- ok --> P{"CHỌN GÓI sẽ bị trừ"}

    P -- "chưa có gói nào" --> E3["NO_PACKAGE"]
    P -- "không gói nào đúng loại lớp" --> E4["PACKAGE_TYPE_MISMATCH"]
    P -- "gói hết hạn tính theo HÔM NAY" --> E5["PACKAGE_EXPIRED"]
    P -- "gói hết hạn tính theo NGÀY HỌC" --> E6["PACKAGE_NOT_VALID_FOR_SESSION"]
    P -- "gói đúng nhưng hết buổi" --> E7["PACKAGE_OUT_OF_CREDITS"]
    P -- "chỉ định gói của NGƯỜI KHÁC" --> X404B["404 NOT_FOUND<br/>cố ý — không dùng 403"]
    P -- "chọn được: hết hạn sớm nhất,<br/>hòa thì id nhỏ nhất" --> L1

    subgraph LOCK ["Dưới khóa — mọi phép kiểm chạy LẠI"]
        direction TB
        L1["🔒 Chốt 1 · FOR UPDATE trên GÓI"] --> L2["🔒 Chốt 2 · FOR UPDATE trên BUỔI LỚP"]
        L2 --> R{"Kiểm lại gói: ACTIVE · đúng loại lớp<br/>· còn hạn hôm nay · còn hạn ngày học"}
        R -- sai --> ER["cùng bộ mã PACKAGE_*"]
        R -- ok --> C{"Đếm ghế DƯỚI KHÓA<br/>còn chỗ không?"}
        C -- hết --> E8["SESSION_FULL<br/>KHÔNG trừ buổi"]
        C -- còn --> I{"🔒 Chốt 3 · ghi dòng đăng ký<br/>unique index chống đặt trùng"}
        I -- trùng --> E9["ALREADY_BOOKED"]
        I -- ok --> D{"🔒 Chốt 4 · ghi sổ −1<br/>CHECK số dư >= 0"}
        D -- "âm — hai lớp tranh nhau<br/>buổi cuối cùng" --> E10["INSUFFICIENT_CREDITS"]
    end

    D -- ok --> OK(["BOOKED · trả về số buổi TÍNH TỪ SỔ"])
    OK --> T["COMMIT · trigger kiểm<br/>balance_cached == SUM(delta)"]
```

**`PACKAGE_OUT_OF_CREDITS` và `INSUFFICIENT_CREDITS` là cùng một tình huống với
người dùng, nhưng ra ở hai độ sâu khác nhau** — một cái trước khóa, một cái ở
tầng ghi sổ sau khóa. Học viên còn đúng một buổi mà bấm đặt hai lớp khác giờ
cùng lúc thì một trong hai nhận mã thứ hai. FE phải bắt cả hai, xử lý y hệt.

## Màn 4 — Lớp đầy, rồi có người nhả chỗ

**Trên màn hình.** Lớp sức chứa 1. Ngân đặt trước → đầy. Lan bấm đặt →
`SESSION_FULL`, **số buổi của Lan vẫn nguyên 20**. Lớp đó cũng **biến mất khỏi
danh sách lớp Lan đặt được**, nên bình thường Lan không nhìn thấy nó để mà bấm.

Ngân hủy → ghế trả lại → lớp **hiện lại** trong danh sách của Lan → Lan tự đặt,
còn 19.

**Hệ thống chốt.** Thất bại không trừ buổi. Không có hàng chờ: đường
`POST /waitlist` trả **404**. Ai nhanh tay thì được — không giữ lượt, không tự
động đẩy người vào lớp.

## Màn 5 — Xếp lịch lặp, đụng giờ HLV, đổi HLV, hủy lớp

**Trên màn hình.** Admin xem trước một lịch lặp cho HLV Quốc Bảo → 6 buổi, 0 trùng.
Tạo → 6 buổi ra đời cùng một `recurrence_id`.

Xem trước **lại đúng khung giờ đó** → lần này **6/6 báo trùng**, 0 buổi tạo được.
Thử lách bằng cách tạo lẻ một buổi chèn vào đúng giờ đó → `TRAINER_DOUBLE_BOOKED`,
**không phải lỗi 500**.

Admin đổi HLV một lớp lẻ. Lan đã đăng ký lớp đó vẫn giữ nguyên chỗ và gói.
Studio hủy lớp vì "HLV báo nghỉ đột xuất" → **Lan được hoàn buổi, bất kể còn bao
lâu nữa tới giờ học** (về 20). Lan bấm đặt lại lớp đã hủy → `SESSION_CANCELLED`.
Admin lỡ bấm hủy lần hai → `SESSION_ALREADY_CANCELLED`.

**Hệ thống chốt.** Không có thao tác **dời giờ** lớp: `POST /classes/{id}/reschedule`
trả **404**. Studio muốn đổi giờ thì hủy lớp cũ (hoàn cho mọi người) và mở lớp
mới; học viên tự đăng ký lại nếu gói còn hợp lệ. Hạn hủy của **học viên** không
áp cho việc **studio** hủy lớp — đó là hai câu chuyện khác nhau.

## Màn 6 — Tiền đi qua đủ ba trạng thái, sổ buổi vẫn cân

**Trên màn hình.** Admin xác nhận khoản chuyển khoản treo của Minh → `CONFIRMED`,
ghi tên người xác nhận. Bấm xác nhận **lần hai** → vẫn `CONFIRMED`, **không báo
lỗi**: thao tác lặp vô hại, vì nhân viên sẽ bấm lại khi mạng chậm.

Giao dịch đã hủy của Yến là trạng thái cuối: xác nhận → `PAYMENT_VOIDED`, hủy
lần nữa → `PAYMENT_ALREADY_VOID`.

Lan đặt một lớp (đã tiêu 1 buổi của gói). Admin thử hủy giao dịch của Lan vì
"khách đòi trả gói" → **`PACKAGE_HAS_CONSUMED_CREDITS`**. Buổi đã tiêu không rút
lại bằng một nút bấm được; ca này phải xử lý tay.

Admin gia hạn gói của Phương (+30 ngày, +5 buổi) → còn 15 buổi, hạn mới đúng
+40 ngày. Mở sổ gói đó ra: đúng hai dòng `PACKAGE_SOLD` → `PACKAGE_RENEWED`,
**cộng xuôi từ trên xuống ra đúng số dư cuối**, dòng cuối `balance_after = 15`.

Admin cộng bù buổi cho Huy với lý do "x" → **422 ngay tại schema**; lý do đủ dài
thì qua, +3 → 5 buổi.

Cuối màn, báo cáo doanh thu: **17.500.000đ / 6 giao dịch**. Khoản chuyển khoản
chỉ còn 2,5tr của Minh — **khoản của Yến bị hủy nên không vào doanh thu**.

**Hệ thống chốt.** Số buổi hiển thị ở mọi màn hình đều cộng từ sổ, không đọc
bộ nhớ đệm. Sổ chỉ ghi thêm, không sửa dòng cũ, nên lịch sử luôn giải thích
được số dư hiện tại.

## Màn 7 — Danh sách nhắc gia hạn nói rõ lý do từng người

**Trên màn hình.** Đúng 3 người trong danh sách, mỗi người một lý do:

- **Huy** — `LOW_CREDITS`, còn 2 buổi (ngưỡng ≤6).
- **Phương** — `EXPIRING_SOON`, còn 10 ngày (ngưỡng ≤15).
- **Trang** — `LOW_CREDITS`. **Gói Private 5 buổi nằm dưới ngưỡng ngay từ lúc
  bán.** Đây là đúng thiết kế, không phải lỗi đếm.

Ba người **không** trong danh sách: Lan (20 buổi, còn 180 ngày), Nam (không có
gói thì không nhắc gì), Yến (gói đã hủy không phải gói cần gia hạn).

Nhân viên gọi cho Huy, ghi "khách hẹn ghé cuối tuần", đặt lịch gọi lại sau 3
ngày → lọc `contacted=true` ra **đúng một mình Huy**, ô "chưa liên hệ lần nào"
tụt từ 3 xuống 2, lịch sử liên hệ của Huy có 1 dòng.

## Màn 8 — Báo cáo đếm đúng lớp, đúng HLV, đúng tiền

**Trên màn hình.** Lan + Ngân đặt lớp mai (2 người). Minh đặt một lớp khác rồi
studio hủy lớp đó vì sự cố điện.

Báo cáo lớp: **1 lớp đã hủy, 2 lượt đăng ký** — lớp đã hủy không còn lượt nào
giữ chỗ. Báo cáo HLV Ngọc Mai: 1 lớp hủy, 2 lượt. Báo cáo sĩ số: đúng **1 lớp có
2 người**, và **tổng số lớp ở hai báo cáo phải bằng nhau** — hai màn hình cùng
một nguồn thì không được ra hai con số.

Dashboard: "cần liên hệ gia hạn" = 3 (Huy, Trang, Phương). "Thanh toán chưa xác
nhận" = **0** — ô này chỉ đếm khoản treo **quá 7 ngày**, mà khoản của Minh vừa
ghi hôm nay. Hạ ngưỡng xuống `older_than_days=0` thì đúng khoản đó hiện ra, 0
ngày treo. Cùng một truy vấn, khác mỗi tham số, nên hai màn hình không thể nói
ngược nhau.

**Xuất file — mở ra đọc, không chỉ kiểm chữ ký tệp.** CSV báo cáo HLV được
`csv.DictReader` đọc lại, từng ô so với số của API. XLSX được `openpyxl` mở ra,
đếm đúng số dòng và so từng cột. Một file tải về đúng định dạng mà sai số liệu
vẫn là một file sai.

## Màn 9 — Mỗi vai chỉ chạm được phần của mình

**Học viên Lan.** Danh sách học viên chỉ ra **chính mình**. Xem hồ sơ Huy → 403.
Xem **sổ buổi gói của Huy → 404**, cố ý khác 403: hai mã khác nhau cho "không có
quyền" và "không tồn tại" sẽ thành bộ đếm số gói của studio. Sổ của chính mình → mở được.

**HLV Ngọc Mai.** Hồ sơ học viên → 403. Danh sách thanh toán → 403. Nhắc gia hạn
→ 403. Báo cáo doanh thu → 403. Danh sách lớp chỉ có lớp mình dạy, và **giao của
lớp Mai với lớp Bảo là tập rỗng**.

**Ai mở được lớp, ai bán được gói.** HLV tạo lớp → 403. Học viên bán gói cho
chính mình → 403. Chỉ ADMIN/STAFF.

**Chỉ ADMIN.** Xem danh sách tài khoản (HLV cũng 403). Điều chỉnh buổi thủ công —
Huy tự cộng 10 buổi cho mình → 403.

**Khóa tài khoản cắt quyền ngay.** Admin khóa Huy → request tiếp theo của Huy
nhận **401**, không đợi token hết hạn. Mở khóa → dùng lại được.

### Ma trận quyền — đọc chéo một lần thay vì đọc bốn đoạn

| Thao tác | 🌐 Khách | 🧑‍🎓 STUDENT | 🏋️ TRAINER | 🧾 STAFF | 🔑 ADMIN |
|---|:--:|:--:|:--:|:--:|:--:|
| Trang công khai · bảng giá · lịch | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hồ sơ **của chính mình** | ⛔ 401 | ✅ | ✅ | ✅ | ✅ |
| Hồ sơ học viên **khác** | ⛔ 401 | ⛔ 403 | ⛔ 403 | ✅ | ✅ |
| Sổ buổi gói **người khác** | ⛔ 401 | ⛔ **404** | ⛔ 403 | ✅ | ✅ |
| Đặt · hủy · đổi lớp **cho mình** | ⛔ 401 | ✅ | — | — | ⛔ 403 |
| Đặt **hộ** người khác | ⛔ | ⛔ 403 | ⛔ 403 | ⛔ 403 | ⛔ 403 |
| Danh sách lớp | ⛔ 401 | lớp đặt được | **chỉ lớp mình dạy** | tất cả | tất cả |
| Điểm danh | ⛔ | ⛔ 403 | ✅ lớp mình dạy,<br/>sau `ends_at` | ⛔ 403 | ⛔ 403 |
| "Lịch dạy của tôi" | ⛔ | ⛔ 403 | ✅ **chỉ của mình** | ⛔ 403 | ⛔ 403 |
| Thống kê tháng của một HLV | ⛔ | ⛔ 403 | ⛔ **403** kể cả của chính mình | ✅ | ✅ |
| Mở lớp · đổi HLV · hủy lớp | ⛔ | ⛔ 403 | ⛔ 403 | ✅ | ✅ |
| Bán gói · gia hạn · thu và xác nhận tiền | ⛔ | ⛔ 403 | ⛔ 403 | ✅ | ✅ |
| Doanh thu · nhắc gia hạn · xuất file | ⛔ 401 | ⛔ 403 | ⛔ 403 | ✅ | ✅ |
| Thêm HLV · chuyển khách quan tâm | ⛔ | ⛔ 403 | ⛔ 403 | ✅ | ✅ |
| **Điều chỉnh buổi thủ công** | ⛔ | ⛔ 403 | ⛔ 403 | ⛔ **403** | ✅ |
| **Quản lý tài khoản** | ⛔ | ⛔ 403 | ⛔ 403 | ⛔ **403** | ✅ |
| Ảnh tiến trình của Lan | ⛔ | ✅ **chính Lan** | ✅ nếu đang dạy Lan | ⛔ **403** | ✅ |
| **Xoá** ảnh tiến trình | ⛔ | ⛔ 403 | ⛔ 403 | ⛔ 403 | ✅ |

Ba ô đáng dừng lại. **Sổ buổi của người khác trả 404 chứ không 403** — 403 xác
nhận "gói đó có thật", và một chuỗi 403/404 sẽ đếm ra studio đang có bao nhiêu
gói. **ADMIN không đặt hộ được** — ô đó ⛔ ở cả năm cột, không phải sót. Và cột
**STAFF không phải bản sao của ADMIN**: bốn ô ⛔ in đậm là toàn bộ khác biệt
giữa lễ tân và chủ studio, chạy thật ở Màn 13.

Mọi ô trong bảng đều được bấm thật trong buổi demo này, trừ hai dòng ảnh tiến
trình lấy kết quả từ `tests/test_photo_permissions.py` (quyền xoá của cả bốn vai
không phải ADMIN nằm gọn ở đó). Bảng vai × endpoint đầy đủ, gồm cả nhánh 401 khi
không có token, nằm ở `tests/test_permission_matrix.py`.

## Màn 10 — Trang công khai không lộ danh tính, không bịa giá

**Trên màn hình (khách vãng lai, không đăng nhập).** Danh sách HLV chỉ có Ngọc Mai
và Thu Hà — Quốc Bảo `is_public=false` nên không lên web. Mỗi dòng **chỉ** có
tên, ảnh, giới thiệu; không rò trường nào khác.

Bảng giá: gói ngừng bán không hiện. Gói 10 buổi Group 2.500.000đ. **Gói 8 buổi
"liên hệ giá" để trống — không bịa ra số 0.**

Lịch 2 tuần tới hiện giờ, loại lớp, tên HLV và **còn chỗ hay không** — không có
tên học viên nào. Thông báo chỉ hiện bài đã đăng, bài nháp không lên.

Không token thì `/students` → 401, `/reports/dashboard` → 401.

## Màn 11 — Ảnh tiến trình chỉ đến đúng người có quyền

**Trên màn hình.** Lan học lớp của HLV Ngọc Mai. Admin tải lên một ảnh tiến trình
của Lan. **Khóa lưu trữ ảnh không bao giờ ra khỏi server** — response không có
`storage_key`.

Xem được: Admin, **chính Lan**, và **HLV Ngọc Mai** (đang dạy Lan). Không xem được:
HLV Quốc Bảo (403, không dạy Lan), học viên Huy (403). Lan mở file ảnh → tải
được, đúng content-type ảnh. Xóa ảnh là quyền ADMIN — Mai xóa → 403.

**Hiểu cho đúng:** "HLV phụ trách" ở đây là **HLV đã hoặc đang dạy ít nhất một
buổi mà học viên có lượt chưa hủy**. Nhiều HLV có thể đủ điều kiện cùng lúc; đây
không phải giới hạn đúng ba người, cũng không phải chỉ người đang dạy ngay lúc này.

## Màn 12 — HLV điểm danh sau lớp, học viên đọc đúng kết quả

**Trên màn hình.** Lan và Minh cùng đăng ký lớp mai. Mai mở **"Lịch dạy của tôi"**
→ thấy lớp đó, và **giao với lịch của Quốc Bảo là tập rỗng**. Đây là đường riêng
của vai HLV: nó lọc theo `trainer_id` của chính người đăng nhập và **không nhận
tham số `trainer_id`**, nên không có gì để giả mạo. Admin — người thấy được mọi lớp
qua `/classes` — mở đường này vẫn nhận **403**: "lịch dạy của tôi" chỉ có nghĩa với
người có lớp để dạy.

Mai mở danh sách điểm danh → thấy đúng hai người. HLV Quốc Bảo mở cùng lớp đó → **403**.

Mai bấm điểm danh **khi lớp chưa kết thúc** → `SESSION_NOT_FINISHED`.

Đồng hồ nhảy qua giờ tan lớp *(dịch đồng hồ, không sửa thẳng dữ liệu lớp hay
booking)*. Mai đánh Lan **ATTENDED**, Minh **NO_SHOW**. Mỗi lần ghi lại tên HLV
và thời điểm cập nhật.

Lan và Minh mở lịch của mình → thấy đúng trạng thái của mình, nút hủy **tắt**,
không hứa hoàn gì. Minh bấm hủy → `BOOKING_NOT_ACTIVE`.

**Hệ thống chốt — con số quan trọng nhất màn này.** Lan còn **19**, Minh còn **9**.
**Điểm danh không đụng tới sổ buổi**; buổi đã trừ từ lúc đặt lớp, và **vắng mặt
không được hoàn**. Sĩ số lớp vẫn là **2** sau khi điểm danh: người đặt chỗ rồi
không đến vẫn chiếm ghế đó và HLV vẫn dạy đủ buổi.

## Màn 13 — Lễ tân Thảo trực một ca, và bốn cánh cửa đóng

*Bổ sung 2026-09-15. Buổi demo gốc có 4 vai trên 5: khách vãng lai, học viên, HLV,
admin. **STAFF — vai đông người dùng nhất và luân chuyển nhiều nhất trong một
studio — không có màn nào.** Quyền đọc của STAFF vốn đã được phủ ở
`tests/test_permission_matrix.py`, nhưng đó là bảng vai × endpoint, không phải một
ca trực có thật: nó không trả lời được câu "lễ tân có bán được gói không" và cũng
không chứng minh được bốn ranh giới dưới đây.*

**Trên màn hình — nửa trên, một ca trực bình thường.** Admin cấp tài khoản STAFF
cho Thảo. Từ đây mọi thao tác đều bằng tài khoản của Thảo, không mượn quyền admin:

Khách gọi điện → Thảo mở hồ sơ học viên Đỗ Minh Khánh → bán gói Group 10 →
**còn 10 buổi** → thu 2.500.000đ tiền mặt → **xác nhận ngay tại quầy** → khách quen
tới gia hạn +30 ngày +5 buổi → **còn 15 buổi**. Một khách khác để lại số trên web →
Thảo tìm thấy trong danh sách khách quan tâm và **chuyển thành hồ sơ học viên**.

Khách đổi số điện thoại → Thảo **sửa hồ sơ học viên** đã có. Studio ra gói mới →
Thảo **thêm một loại gói vào danh mục** rồi **ngừng bán** nó; ngừng bán là rút khỏi
bảng giá công khai chứ không xoá, vì gói đã bán theo loại đó vẫn phải tra lại được.

Thảo **đăng một thông báo** khuyến mãi rồi **sửa lại** giờ khai giảng — bản sửa ghi
đúng tên Thảo. Rồi Thảo thử sửa nội dung thành câu bị cấm *"Lớp tối đa 3 người mỗi
buổi"* → **422**, và bản đang nằm trên trang công khai không đổi. Đây là đường vòng
ngắn nhất để đưa câu bị cấm lên web: đăng sạch, rồi sửa. Nó bị bịt.

Xếp lịch: Thảo mở một lớp Group cho HLV Thu Hà → đổi sang HLV Ngọc Mai → rồi hủy
lớp vì "HLV báo nghỉ đột xuất". Thêm HLV Bảo Trâm vào danh sách, hiện công khai.

Cuối ca: mở danh sách đăng ký, mở danh sách nhắc gia hạn, **gọi cho Huy và ghi
nhận nội dung cuộc gọi** (lịch sử ghi đúng tên Thảo, không gộp về admin), xem
**thống kê tháng của HLV Ngọc Mai**, xem bảng tổng hợp, xem doanh thu, xuất file
CSV báo cáo HLV.

Một chi tiết đáng chú ý ở đây: **chính HLV Ngọc Mai mở thống kê tháng của mình thì
nhận 403.** Đây là mặc định an toàn đang chờ studio xác nhận, không phải lỗi —
xem câu hỏi mở #8 trong `docs/business-rules.md`.

**Hệ thống chốt — nửa dưới, bốn cánh cửa đóng.** Bốn thao tác này Thảo bấm thật và
nhận **403**, mỗi cái vì một lý do khác nhau:

| # | Thảo bấm | Nhận | Vì sao ranh giới nằm ở đây |
|---|---|---|---|
| 1 | Mở tab ảnh tiến trình của Lan | **403** | Ảnh cơ thể học viên không phải dữ liệu vận hành quầy. Đây là quy tắc **dễ cài sai nhất** — bản ma trận trước từng cho `STAFF ✓`, nghĩa là mọi lễ tân xem được ảnh cơ thể của toàn bộ học viên |
| 2 | Cộng 5 buổi cho Lan, lý do "bù cho khách quen" | **403** | Điều chỉnh tay **tạo buổi từ hư không**. Người đứng quầy chịu áp lực trực tiếp từ khách là người không nên cầm nút đó |
| 3 | Mở danh sách tài khoản | **403** | Lễ tân không tự cấp quyền cho mình, và không đổi được vai của ai |
| 4 | Đặt lớp hộ Lan | **403** | Chỉ học viên tự đặt cho mình. Không có ngoại lệ "nhưng nhân viên đứng quầy thì được" |

Thêm một cánh nữa: mở **danh sách điểm danh** của lớp → **403**. Điểm danh là việc
của HLV đứng lớp, không phải của quầy.

**Chiều ngược lại cũng được bấm.** Học viên Lan và HLV Ngọc Mai thử làm việc của
quầy — thêm một HLV mới, mở danh sách khách quan tâm — đều nhận **403**. Không có
đường vòng nào vào công việc vận hành ngoài vai STAFF và ADMIN.

**Và phép kiểm ngược — quan trọng ngang bốn mã 403 trên.** Ngay sau đó admin mở
đúng hai thứ Thảo vừa bị từ chối (ảnh tiến trình, danh sách tài khoản) → **200**.
Không có bước này, bốn cái 403 kia không phân biệt được với một endpoint hỏng: một
API trả 403 cho *mọi người* cũng làm màn này xanh.

Sổ buổi được kiểm lại toàn bộ bảy bất biến sau khi Thảo bán gói, thu tiền và gia hạn.

```mermaid
flowchart LR
    subgraph OK ["✅ Lễ tân làm được — trọn một ca vận hành"]
        direction TB
        A1["Mở hồ sơ học viên<br/>chuyển khách quan tâm"]
        A2["Bán gói · gia hạn<br/>thu tiền · xác nhận"]
        A3["Mở lớp · đổi HLV<br/>hủy lớp · thêm HLV"]
        A4["Nhắc gia hạn · ghi liên hệ<br/>báo cáo · xuất file"]
    end
    subgraph NO ["⛔ Bốn cánh cửa đóng — 403"]
        direction TB
        B1["Ảnh tiến trình<br/>(ảnh cơ thể học viên)"]
        B2["Điều chỉnh buổi thủ công<br/>(tạo buổi từ hư không)"]
        B3["Quản lý tài khoản<br/>(tự cấp quyền)"]
        B4["Đặt lớp hộ<br/>+ điểm danh"]
    end
    OK -.->|"cùng một tài khoản STAFF"| NO
```

---

## Bịt tám endpoint chưa có test — 15/09

Phép quét độ phủ đối chiếu **88 endpoint trong tài liệu** với **mọi lời gọi HTTP
trong `tests/`**. Tám endpoint không có lời gọi nào. Bảng dưới là thứ đã viết cho
từng cái, và **vì sao** cái đó đáng viết chứ không phải để lấp cho đủ số.

| Endpoint | Test | Điều được khẳng định |
|---|---|---|
| `GET /announcements` | `test_announcements_api.py` | Danh sách của nhân viên **gồm cả bản nháp** — trang công khai lọc bản nháp, màn quản lý mà lọc theo thì một bản lưu dở là bản không còn đường mở lại |
| `PATCH /announcements/{id}` | ⬆ | **Nội dung sửa đi qua đúng bộ lọc của nội dung đăng mới.** Ba câu bị cấm đều bị chặn 422, bản trên web không đổi. Còn ghi lại người sửa và thời điểm, không ghi đè người tạo |
| `DELETE /announcements/{id}` | ⬆ | Xoá biến mất khỏi **cả** danh sách nhân viên lẫn trang công khai; bấm lần hai trả 404 |
| `POST /trainers/{id}/photo` | `test_leads_and_trainers_api.py` | **Toạ độ GPS không sống sót qua route.** Tệp không phải ảnh bị chặn 422 và **không** để lại hồ sơ trỏ vào tệp không tồn tại. Thay ảnh thì phục vụ ảnh mới |
| `GET /trainers/{id}/photo` | ⬆ | Trả JPEG; chưa có ảnh trả 404 mã `NO_PHOTO` để giao diện hiện ô trống thay vì lỗi đỏ. HLV mở hồ sơ người khác nhận **404**, không phải 403 |
| `GET /accounts/{id}` | `test_student_accounts_api.py` | Không trả băm mật khẩu; chỉ ADMIN đọc được — **kể cả lễ tân cũng 403** |
| `GET /payments/{id}` | `test_packages_payments_api.py` | Trả đủ **ba cặp người/thời điểm** (ghi nhận · xác nhận · huỷ); người xác nhận không ghi đè người ghi nhận |
| `GET /health` | `test_meta_api.py` | Trả lời **không cần token** — bắt xác thực thì mọi lần probe trả 401 và bộ điều phối đọc 401 là "còn sống". Và **không khai phụ thuộc CSDL** |

Thêm một chỗ nữa không lọt vào phép quét vì nó được gọi qua biến:
`GET /reports/revenue/detail` có test phân quyền nhưng chưa có phép kiểm *"con số
mở ra đúng danh sách đứng sau nó"* ở tầng HTTP. Nay có — đi theo đúng `detail_path`
server tự sinh, rồi cộng các dòng lại và so với tổng.

**Hai ghi chú về cách viết các test này.**

Test `/health` **đọc bảng route của ứng dụng**, không gọi qua `TestClient`. Bản đầu
tiên chặn `SessionLocal` rồi khẳng định "không nổ" — nhưng fixture `client` ghi đè
`get_db` bằng session của test, nên phép kiểm đó xanh vĩnh viễn kể cả khi route đã
thật sự khai phụ thuộc CSDL. Đã kiểm bằng đột biến: bản viết lại đỏ khi thêm
`Depends(get_db)` vào `/health`, bản đầu thì không.

Một khẳng định bị bỏ đi vì **sai hợp đồng, không phải vì khó làm xanh**: bản nháp
kiểm `photo_key` không được trả về, theo mẫu của ảnh tiến trình. Nhưng ảnh HLV khác
hẳn ảnh tiến trình — `app/schemas/public.py` cho HLV đúng ba trường `full_name`,
`photo_key`, `bio`, và trang công khai **lấy ảnh bằng chính khoá đó**. Phép kiểm
đúng là khoá dùng được ở đường ẩn danh, không phải khoá bị giấu đi.

**Một quan sát, đã sửa cùng ngày.** `AccountResponse` không trả `student_id`, dù
`PATCH /accounts/{id}` **nhận** `student_id` để nối hồ sơ — chiều đọc phải đi vòng
qua `student.user_id`. Không sai, nhưng bất đối xứng, và màn hình admin cấp tài
khoản là chỗ vấp đầu tiên.

Cách sửa chọn theo hợp đồng **đã có**, không dựng cái mới: `MeResponse` của
`GET /auth/me` từ lâu đã trả cặp `student_id` + `trainer_id`, nên `AccountResponse`
nhận đúng cặp đó. Áp cho cả bốn đường trả tài khoản (`GET /accounts`,
`GET|POST|PATCH /accounts/{id}`), và tài khoản **vừa tạo hoặc vừa nối trả liên kết
ngay trong response đó** — đây là lúc màn hình cần con số ấy nhất, trả `null` một
lần ở đúng bước đó buộc giao diện phải tải lại.

Hai quyết định đáng ghi lại:

- **Hai truy vấn cho cả trang, không phải hai truy vấn mỗi dòng.** Tra từng dòng là
  100 lượt đi CSDL cho một trang 50 tài khoản, và chi phí đó chỉ lộ ra khi studio đã
  có đủ người dùng. Có test đếm số câu lệnh SQL, đã kiểm bằng đột biến: đổi sang tra
  từng dòng thì nó đỏ với 10 truy vấn thay vì 2.
- **Tra cả hai bảng bất kể vai**, khác `get_current_actor` (hàm đó chỉ tra bảng ứng
  với vai). Đây là màn của admin và việc của nó là nói ra hiện trạng: một tài khoản
  STAFF lỡ nối vào hồ sơ học viên phải nhìn thấy được thì mới gỡ được.

Thay đổi này là **thêm trường**, không đổi hay bỏ trường nào — FE hiện có không vỡ.
Tài liệu API đã sinh lại (4 tệp), `api-cho-frontend.md` và `business-rules.md` §12 đã
cập nhật.

---

---

## Kết quả buổi demo

| Hạng mục | Kết quả |
|---|---|
| **13 màn demo** (`tests/e2e/`) — lượt 14/09 | **13 passed** — 24,89s |
| **14 màn demo** (thêm Màn 13 · STAFF) — lượt 15/09 | **14 passed** — 18,3s · xanh ở cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` |
| Toàn bộ test, TZ=UTC — lượt 14/09 | **522 passed, 0 failed** — 88,49s |
| Toàn bộ test, TZ=UTC — lượt 15/09 lúc ~02:45 giờ studio | **520 passed, 3 failed** — 81,1s · lỗi múi giờ trong test, xem ghi chú |
| Toàn bộ test, TZ=UTC — **sau khi sửa**, ~03:00 giờ studio | **525 passed, 0 failed** — 81,1s |
| Toàn bộ test, TZ=UTC — **sau khi bịt 8 endpoint**, ~03:30 giờ studio | **551 passed, 0 failed** — 88,8s |
| Toàn bộ test, TZ=UTC — **sau khi đối xứng liên kết tài khoản** | **553 passed, 0 failed** — 83,0s |
| Lượt hai TZ=Asia/Ho_Chi_Minh — cùng lượt | **134 passed** — 35,6s |
| Demo + test múi giờ/đăng ký/điểm danh, TZ=Asia/Ho_Chi_Minh | **86 passed** — 27,96s (lượt 14/09) · **112 passed** — 32,8s (lượt 15/09) |
| `ruff check .` | **pass** |
| `alembic check` | **pass** — không có model lệch migration |
| `gen_api_docs --check` | **pass** — 88 endpoint khớp mã nguồn, 105 tệp tài liệu |
| Phép quét độ phủ 88 endpoint | **0 endpoint không có test chạm tới** (trước 15/09: 8) |

Lượt toàn bộ ngày 14/09 có 571 warning từ thư viện và khóa JWT kiểm thử; không
có test thất bại. Đây là **một** lượt regression sạch — không suy ra được rằng hệ
thống chắc chắn không có test chập chờn.

> **Ba test đỏ ở lượt 15/09 — đã tìm ra nguyên nhân và đã sửa.**
> `test_attendance_api.py::test_attendance_correction_preserves_credits_and_audits`
> và `test_reports.py::test_dashboard_and_detail_keep_marked_registration[ATTENDED|NO_SHOW]`.
>
> **Không phải do Màn 13.** Đã kiểm bằng cách cất thay đổi đi (`git stash`) và chạy
> lại ba test đó trên bản gốc: vẫn đỏ y hệt. Chúng cũng đỏ ở **cả hai** múi giờ
> `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`, nên không phải lỗi cấu hình múi giờ của lượt chạy.
>
> **Điều kiện kích hoạt là giờ trong ngày.** Lượt 14/09 chạy lúc 14:08 giờ studio —
> xanh. Lượt 15/09 chạy lúc **02:45** giờ studio — đỏ. Ở khung 00:00–07:00 giờ Việt
> Nam, **ngày theo giờ studio và ngày theo UTC là hai ngày khác nhau**.
>
> **Nguyên nhân: test phá hợp đồng của `now()`.** Hợp đồng ghi ở
> `app/domain/rules.py` là *"luôn aware, luôn theo múi giờ studio"*, và mã sản phẩm
> dựa vào nó — `report_queries.sessions_today` lấy `now().date()` để biết hôm nay là
> ngày nào. Ba test này `monkeypatch` `now` bằng một mốc **đọc lại từ PostgreSQL**,
> mà giá trị đó về theo múi giờ *của kết nối* — UTC trên container. Đồng hồ giả vì
> thế trả về **ngày hôm trước**, kỳ báo cáo kết thúc trước buổi lớp, và
> `total_bookings` ra 0 thay vì 1.
>
> **Lỗi nằm ở test, không ở API** — điều này đã được kiểm chứng, không còn là phỏng
> đoán: API nhận `period_end` nào thì lọc theo đúng cái đó, và sau khi sửa phía test
> thì không dòng mã sản phẩm nào phải đổi.
>
> **Đã sửa (15/09).** Thêm `tests/conftest.py::studio_clock` — một đồng hồ giả quy đổi
> về giờ studio, khai đúng một chỗ thay vì bắt từng test nhớ gọi `.astimezone`. Áp cho
> **cả năm** chỗ `monkeypatch` đồng hồ trong bộ test, kể cả hai chỗ chưa đỏ nhưng phá
> cùng hợp đồng; riêng `test_attendance_api` còn sửa `period_end` lấy ngày theo giờ
> studio thay vì `.date()` của một timestamp UTC.
>
> **Chốt chặn cho chính cái bẫy này:**
> `test_timezone_rules.py::test_studio_clock_keeps_a_faked_now_in_studio_timezone`,
> dùng **mốc thời gian cố định** (19:30 UTC ngày 14 = 02:30 giờ studio ngày 15) chứ
> không dùng đồng hồ hệ thống — một test chỉ đỏ được vào ban đêm thì không phải là
> một chốt chặn. Đã kiểm bằng đột biến: làm hỏng `studio_clock` thì nó đỏ ở **cả
> hai** múi giờ, cùng với hai test báo cáo gốc.
>
> Lượt sửa này chạy lúc **~03:00 giờ studio**, tức vẫn nằm trong khung gây lỗi — nên
> 525 xanh dưới đây là bằng chứng đã sửa thật, không phải ngày đã sang giờ an toàn.

## Những gì buổi demo này **không** chứng minh

- **Chưa có giao diện.** Toàn bộ kiểm chứng ở tầng API. `src_FE` chưa có mã;
  màn admin cấp tài khoản và màn HLV điểm danh cần được dựng theo tài liệu API.
  Chưa có kiểm chứng trình duyệt.
- **Chưa chạy trên môi trường vận hành.** Migration mới nhất là `0007`, đã chạy
  trên DB test và khớp model. Khi đưa lên môi trường thật, phải chạy
  `alembic upgrade head` trước.
- **88 endpoint là số API hiện có**, không phải tuyên bố 14 màn demo đã chạm hết
  88 endpoint. Phần còn lại nằm ở các test chức năng và phân quyền theo nhóm
  trong cùng lượt chạy.

  > **Sửa ngày 15/09.** Câu này trước đây viết *"phần còn lại được phủ bởi 509
  > test chức năng và phân quyền khác"* — nói rộng hơn sự thật. Một phép quét
  > đối chiếu 88 endpoint với mọi lời gọi HTTP trong `tests/` tìm ra **8 endpoint
  > không có test nào chạm tới**: `GET /announcements`, `PATCH` và `DELETE
  > /announcements/{id}`, `POST` và `GET /trainers/{id}/photo`,
  > `GET /accounts/{id}`, `GET /payments/{id}`, `GET /health`. Hai chỗ trong số
  > đó có rủi ro thật — đường **sửa** thông báo là đường vòng để đưa câu bị cấm
  > lên trang công khai sau khi đã đăng một nội dung sạch, và ảnh HLV là tệp duy
  > nhất do người dùng đưa vào rồi được phục vụ lại cho khách ẩn danh. Cả 8 đã
  > được viết test trong ngày; chi tiết ở mục dưới.
- **Màn 13 chứng minh ranh giới của STAFF, không phải toàn bộ bề mặt STAFF.**
  Một ca trực đi qua khoảng hai chục endpoint; phần còn lại của vai này vẫn dựa
  vào `tests/test_permission_matrix.py` và các test chức năng theo nhóm.
- Dữ liệu hàng chờ cũ vẫn còn trong bảng/enum (giữ lịch sử), nhưng **không có
  đường API nào chạm tới** — mọi route `/waitlist` trả 404.
