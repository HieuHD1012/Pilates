# Demo nghiệm thu — Một ngày vận hành studio, chạy thật trên API

- Ngày chạy: 2026-09-14.
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

| Thao tác | 🌐 Khách | 🧑‍🎓 STUDENT | 🏋️ TRAINER | 🔑 ADMIN |
|---|:--:|:--:|:--:|:--:|
| Trang công khai · bảng giá · lịch | ✅ | ✅ | ✅ | ✅ |
| Hồ sơ **của chính mình** | ⛔ 401 | ✅ | ✅ | ✅ |
| Hồ sơ học viên **khác** | ⛔ 401 | ⛔ 403 | ⛔ 403 | ✅ |
| Sổ buổi gói **người khác** | ⛔ 401 | ⛔ **404** | ⛔ 403 | ✅ |
| Đặt · hủy · đổi lớp **cho mình** | ⛔ 401 | ✅ | — | ⛔ 403 |
| Đặt **hộ** người khác | ⛔ | ⛔ 403 | ⛔ 403 | ⛔ 403 |
| Danh sách lớp | ⛔ 401 | lớp đặt được | **chỉ lớp mình dạy** | tất cả |
| Điểm danh | ⛔ | ⛔ 403 | ✅ lớp mình dạy,<br/>sau `ends_at` | ⛔ 403 |
| Mở lớp · bán gói | ⛔ | ⛔ 403 | ⛔ 403 | ✅ |
| Thanh toán · doanh thu · nhắc gia hạn | ⛔ 401 | ⛔ 403 | ⛔ 403 | ✅ |
| Tài khoản · điều chỉnh buổi thủ công | ⛔ | ⛔ 403 | ⛔ 403 | ✅ |
| Ảnh tiến trình của Lan | ⛔ | ✅ **chính Lan** | ✅ nếu đang dạy Lan | ✅ |

Hai ô đáng dừng lại: **sổ buổi của người khác trả 404 chứ không 403** — 403 xác
nhận "gói đó có thật", và một chuỗi 403/404 sẽ đếm ra studio đang có bao nhiêu
gói. Và **ADMIN không đặt hộ được** — ô đó ⛔ ở cả bốn cột, không phải sót.

Vai **STAFF** có trong hệ thống nhưng không có trong dàn nhân vật demo này;
quyền của STAFF được phủ ở `tests/test_permission_matrix.py`.

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

**Trên màn hình.** Lan và Minh cùng đăng ký lớp mai. HLV Ngọc Mai mở danh sách
điểm danh → thấy đúng hai người. HLV Quốc Bảo mở cùng lớp đó → **403**.

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

---

## Kết quả buổi demo

| Hạng mục | Kết quả |
|---|---|
| **13 màn demo** (`tests/e2e/`) | **13 passed** — 24,89s |
| Toàn bộ test, TZ=UTC | **522 passed, 0 failed** — 88,49s |
| Demo + test múi giờ/đăng ký/điểm danh, TZ=Asia/Ho_Chi_Minh | **86 passed** — 27,96s |
| `ruff check .` | **pass** |
| `alembic check` | **pass** — không có model lệch migration |
| `gen_api_docs --check` | **pass** — 88 endpoint khớp mã nguồn, 105 tệp tài liệu |

Lượt toàn bộ có 571 warning từ thư viện và khóa JWT kiểm thử; không có test
thất bại. Đây là **một** lượt regression sạch — không suy ra được rằng hệ thống
chắc chắn không có test chập chờn.

Chạy lượt toàn bộ và lượt múi giờ:

```bash
# Toàn bộ
DATABASE_URL=postgresql+psycopg://pilates:pilates@localhost:5434/pilates_test \
ENVIRONMENT=test TZ=UTC .venv/bin/python -m pytest -q --disable-warnings

# Lượt hai dưới giờ studio — bắt các ngưỡng ngày lệch 7 tiếng
DATABASE_URL=postgresql+psycopg://pilates:pilates@localhost:5434/pilates_test \
ENVIRONMENT=test TZ=Asia/Ho_Chi_Minh .venv/bin/python -m pytest -q --disable-warnings \
  tests/e2e/ tests/test_timezone_boundaries.py tests/test_timezone_rules.py \
  tests/test_registration_policy.py tests/test_attendance_api.py
```

**Vì sao chạy hai lượt múi giờ.** Lớp lúc 00:30 giờ Việt Nam rơi vào *ngày hôm
trước* theo UTC. Nếu lấy ngày từ timestamp UTC rồi mới so hạn gói thì ngưỡng
ngày lệch đúng 7 tiếng, và người bị đẩy ra/vào danh sách sai ở đúng ngày biên.
CI chạy lượt toàn bộ trên runner Ubuntu dưới giờ UTC, cộng thêm lượt hai này
dưới `TZ=Asia/Ho_Chi_Minh`.

## Những gì buổi demo này **không** chứng minh

- **Chưa có giao diện.** Toàn bộ kiểm chứng ở tầng API. `src_FE` chưa có mã;
  màn admin cấp tài khoản và màn HLV điểm danh cần được dựng theo tài liệu API.
  Chưa có kiểm chứng trình duyệt.
- **Chưa chạy trên môi trường vận hành.** Migration mới nhất là `0007`, đã chạy
  trên DB test và khớp model. Khi đưa lên môi trường thật, phải chạy
  `alembic upgrade head` trước.
- **88 endpoint là số API hiện có**, không phải tuyên bố 13 màn demo đã chạm hết
  88 endpoint. Phần còn lại được phủ bởi 509 test chức năng và phân quyền khác
  trong cùng lượt chạy.
- Dữ liệu hàng chờ cũ vẫn còn trong bảng/enum (giữ lịch sử), nhưng **không có
  đường API nào chạm tới** — mọi route `/waitlist` trả 404.
