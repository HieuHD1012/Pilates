# Domain notes

Vocabulary and conventions specific to a Vietnamese Pilates studio. Getting
these wrong makes the product feel foreign to the people using it.

## Vietnamese terms used in the UI

| Term                     | Meaning                                        |
| ------------------------ | ---------------------------------------------- |
| Học viên (HV)            | Student                                        |
| Huấn luyện viên (HLV)    | Trainer                                        |
| Buổi                     | One session. The unit a package is counted in. |
| Gói tập                  | A package: a number of sessions with an expiry |
| Lớp nhóm / Lớp riêng     | Group / Private class                          |
| Đặt lớp                  | To book a class                                |
| Danh sách chờ            | Waitlist                                       |
| Gia hạn                  | Renew / extend                                 |
| Khách quan tâm           | A lead                                         |
| Sổ lịch sử cộng/trừ buổi | The session ledger                             |

## Conventions

- **Time zone** — `Asia/Ho_Chi_Minh`, UTC+7, no DST. Never format with the
  browser's zone; use `app/lib/format.ts`.
- **Dates** — `dd/MM/yyyy`. Weekdays are `T2…T7, CN` (short) and
  `Thứ hai…Chủ nhật` (long). The week starts on **Monday**.
- **Currency** — VND, no decimals, `1.250.000 ₫` via `formatVnd`.
- **Phone** — the primary identifier for students. Zalo matters more than email
  for contact.
- **Names** — Vietnamese order (family name first) and are not split into
  first/last anywhere in this product. One `fullName` field.

## Product shape notes

- A studio day is bimodal: early morning and evening, with a long midday gap.
  The staff calendar sizes its ruler from real data rather than assuming a 9–5.
- Sessions are the currency students think in — "còn mấy buổi" is the question,
  not "how much have I spent". The balance leads every student screen.
- Group classes are small enough that one cancellation matters, which is why
  capacity is written as a fraction rather than a "spots left" pill.
