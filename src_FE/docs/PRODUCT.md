# Product

J Pilates Nha Trang combines a public studio website and a private operational
application. Preserve the approved public layout and beige/brown/copper brand.

## Audiences and implemented surfaces

| Audience    | Main workflows                                                                                      | Primary device    |
| ----------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| Visitor     | Judge the studio, see services/packages/trainers/schedule, submit an enquiry                        | Phone             |
| Student     | See packages/balances, discover eligible classes, book/cancel/change, view schedule/history/profile | Phone             |
| Trainer     | Own teaching schedule, class roster, attendance, profile                                            | Phone             |
| ADMIN/STAFF | Calendar, leads, students/trainers, packages/receipts/ledger, renewals, reports                     | Desktop and phone |
| ADMIN       | Account invitations/access and authorized photo administration                                      | Desktop           |

Backend contracts and role/object checks determine availability. An adapter or
an old screen count is not proof of operational or release completeness.
See [BUSINESS_RULES.md](BUSINESS_RULES.md) and [API_MAPPING.md](API_MAPPING.md).

## Current scope

Responsive web for one studio/location. `GROUP` and `PRIVATE` are the class types;
internal Duo uses Private capacity 2. Students self-serve booking/cancel/change.
Staff do not have a supported booking-on-behalf endpoint. Waitlists are excluded.
Class times/capacity are immutable after creation. Recurrence omits known
conflicts and writes the currently available set atomically. Payments are staff-recorded cash/transfer,
not online payment. Contact links do not imply automated messaging.

Current cancellation is Group 4h/Private 1h. Product scope and the API
contract govern acceptance; do not restore excluded historical features.

## Readiness

The screens and adapters are implemented, but production acceptance remains
open. The FE review adds transaction/cache/race coverage and deployment gates;
it does not prove every business scenario on a deployed API.

- Address, phone, Zalo and map link are still missing without accountable owner
  and due date. `check:release` must remain red until supplied.
- Six concept photographs remain temporary; owner acceptance and real assets
  are needed. Public provisional policies require confirmation.
- Current bearer credentials use localStorage; an HttpOnly/CSRF architecture
  decision needs coordinated backend and deployment work.
- Real-API execution, role/privacy/concurrency negative cases, deployed headers,
  monitoring, rollback and owner workflow acceptance need release evidence.
- Capped APIs without pagination still need scale decisions; the UI must never
  silently treat incomplete records as a complete operational answer.

See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for remaining release gates, and [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) for studio
and backend decisions. Historical “all delivered” or route-parity statements
are not current production approval.
