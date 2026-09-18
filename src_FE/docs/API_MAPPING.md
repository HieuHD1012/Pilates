# API mapping

Every endpoint the backend serves, and the one place in this frontend that
calls it. 88 endpoints, 88 bindings, no second route to the same data.

The backend contract lives in `../../docs/api/` (generated from the app's own
OpenAPI and pinned by `src_BE/tests/test_api_docs.py`). **When this file and
that directory disagree, that directory is right.**

## How the layer is put together

```
app/lib/api/
  schema.ts       Backend types, 1:1. snake_case, integer ids, UPPERCASE enums.
  tokens.ts       Access/refresh token store.
  client.ts       The one fetch adapter: Bearer, refresh queue, ApiError.
  endpoints/      One module per feature group; one function per endpoint.
  query-keys.ts   The key registry (see QUERY_CONVENTIONS.md).
```

Four rules this layer exists to hold:

1. **Field names are the backend's.** `starts_at`, not `startsAt`. A second
   vocabulary is a second thing to keep in sync, and every page in `docs/api/`
   is written in the first one.
2. **One refresh in flight, ever.** `POST /auth/refresh` rotates the refresh
   token with a 10-second grace window; presenting a spent token after that is
   treated as theft and **revokes every session that person has**. So 401s
   queue behind a single shared promise in `client.ts` — never one refresh per
   failed request.
3. **Money stays a string** (`"1500000.00"`) until the formatter. Parsing at
   the network edge is how a decimal turns into a float and a total ends in
   `.9999999`.
4. **Business decisions are rendered, not recomputed.** `can_cancel`,
   `refund_if_cancelled_now`, `seats_left`, `detail_path`, `fill_rate` arrive
   decided. See rule 12 in `../AGENTS.md`.

## Conventions that bite

| Thing                            | Rule                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Time range params                | Half-open: `starts_from <= x < starts_to`. All of 30/09 means `starts_to = 2026-10-01T00:00:00`.                                |
| Naive datetimes in query strings | Read as studio time (`Asia/Ho_Chi_Minh`). Sending an offset is equivalent.                                                      |
| `null` in a response             | _Not measured_, not zero. Render an empty cell. `fill_rate: null` means no classes ran.                                         |
| `404`                            | Also means "exists, but not yours". Deliberate — do not branch on it.                                                           |
| `409 CONCURRENT_CONFLICT`        | Retryable. Offer the button again instead of a red error.                                                                       |
| `detail_path`                    | Use the string the server returned. Never assemble it.                                                                          |
| Binary endpoints                 | Authenticated images/exports are fetched as blobs (`*Blob`, `export*`); only `/public/trainer-photos/…` is a plain `<img src>`. |

### Auth & session — `endpoints/auth.ts`

| Method  | Path                    | Role      | FE binding               | Cache key / kind       | Consumer                                               |
| ------- | ----------------------- | --------- | ------------------------ | ---------------------- | ------------------------------------------------------ |
| `POST`  | `/auth/change-password` | đăng nhập | `authApi.changePassword` | mutation               | routes/student/account.tsx                             |
| `POST`  | `/auth/forgot-password` | công khai | `authApi.forgotPassword` | mutation               | routes/auth/forgot-password.tsx                        |
| `POST`  | `/auth/login`           | công khai | `authApi.login`          | mutation               | routes/auth/login.tsx                                  |
| `POST`  | `/auth/logout`          | đăng nhập | `authApi.logout`         | mutation               | features/auth/use-logout.ts                            |
| `GET`   | `/auth/me`              | đăng nhập | `authApi.me`             | `session()`            | features/auth/use-session.ts                           |
| `PATCH` | `/auth/me`              | đăng nhập | `authApi.updateMe`       | mutation → `session()` | routes/student/account.tsx, routes/trainer/profile.tsx |
| `POST`  | `/auth/refresh`         | công khai | `authApi.refresh`        | client internal        | lib/api/client.ts — single-flight queue                |
| `POST`  | `/auth/reset-password`  | công khai | `authApi.resetPassword`  | mutation               | routes/auth/reset-password.tsx                         |

### Accounts — `endpoints/accounts.ts`

| Method  | Path                                         | Role  | FE binding                      | Cache key / kind      | Consumer                  |
| ------- | -------------------------------------------- | ----- | ------------------------------- | --------------------- | ------------------------- |
| `GET`   | `/accounts`                                  | ADMIN | `accountsApi.list`              | `accounts.list(f)`    | routes/staff/accounts.tsx |
| `POST`  | `/accounts`                                  | ADMIN | `accountsApi.create`            | mutation              | routes/staff/accounts.tsx |
| `GET`   | `/accounts/{account_id}`                     | ADMIN | `accountsApi.get`               | `accounts.detail(id)` | routes/staff/accounts.tsx |
| `PATCH` | `/accounts/{account_id}`                     | ADMIN | `accountsApi.update`            | mutation              | routes/staff/accounts.tsx |
| `POST`  | `/accounts/{account_id}/lock`                | ADMIN | `accountsApi.lock`              | mutation              | routes/staff/accounts.tsx |
| `POST`  | `/accounts/{account_id}/send-password-reset` | ADMIN | `accountsApi.sendPasswordReset` | mutation              | routes/staff/accounts.tsx |
| `POST`  | `/accounts/{account_id}/unlock`              | ADMIN | `accountsApi.unlock`            | mutation              | routes/staff/accounts.tsx |

### Public site — `endpoints/public.ts`

| Method | Path                                    | Role      | FE binding                  | Cache key / kind       | Consumer                                    |
| ------ | --------------------------------------- | --------- | --------------------------- | ---------------------- | ------------------------------------------- |
| `GET`  | `/public/announcements`                 | công khai | `publicApi.announcements`   | `pub.announcements(n)` | routes/public/promotions.tsx                |
| `POST` | `/public/leads`                         | công khai | `publicApi.createLead`      | mutation               | routes/public/consultation.tsx, contact.tsx |
| `GET`  | `/public/packages`                      | công khai | `publicApi.packages`        | `pub.packages()`       | routes/public/packages.tsx                  |
| `GET`  | `/public/schedule`                      | công khai | `publicApi.schedule`        | `pub.schedule(days)`   | routes/public/schedule.tsx, home.tsx        |
| `GET`  | `/public/trainer-photos/{prefix}/{key}` | công khai | `publicApi.trainerPhotoUrl` | URL builder — no fetch | routes/public/trainers.tsx `<img src>`      |
| `GET`  | `/public/trainers`                      | công khai | `publicApi.trainers`        | `pub.trainers()`       | routes/public/trainers.tsx, home.tsx        |

### Leads — `endpoints/leads.ts`

| Method  | Path                       | Role         | FE binding         | Cache key / kind   | Consumer                     |
| ------- | -------------------------- | ------------ | ------------------ | ------------------ | ---------------------------- |
| `GET`   | `/leads`                   | ADMIN, STAFF | `leadsApi.list`    | `leads.list(f)`    | routes/staff/leads.tsx       |
| `GET`   | `/leads/{lead_id}`         | ADMIN, STAFF | `leadsApi.get`     | `leads.detail(id)` | routes/staff/lead-detail.tsx |
| `PATCH` | `/leads/{lead_id}`         | ADMIN, STAFF | `leadsApi.update`  | mutation           | routes/staff/lead-detail.tsx |
| `POST`  | `/leads/{lead_id}/convert` | ADMIN, STAFF | `leadsApi.convert` | mutation           | routes/staff/lead-detail.tsx |

### Students — `endpoints/students.ts`

| Method  | Path                              | Role         | FE binding             | Cache key / kind        | Consumer                                                  |
| ------- | --------------------------------- | ------------ | ---------------------- | ----------------------- | --------------------------------------------------------- |
| `GET`   | `/students`                       | đăng nhập    | `studentsApi.list`     | `students.list(f)`      | routes/staff/students.tsx                                 |
| `POST`  | `/students`                       | ADMIN, STAFF | `studentsApi.create`   | mutation                | routes/staff/students.tsx                                 |
| `GET`   | `/students/{student_id}`          | đăng nhập    | `studentsApi.get`      | `students.detail(id)`   | routes/staff/student-detail.tsx                           |
| `PATCH` | `/students/{student_id}`          | ADMIN, STAFF | `studentsApi.update`   | mutation                | routes/staff/student-detail.tsx                           |
| `GET`   | `/students/{student_id}/overview` | đăng nhập    | `studentsApi.overview` | `students.overview(id)` | routes/staff/student-detail.tsx, routes/student/index.tsx |

### Progress photos — `endpoints/progress-photos.ts`

| Method   | Path                                                     | Role      | FE binding                   | Cache key / kind             | Consumer                                                |
| -------- | -------------------------------------------------------- | --------- | ---------------------------- | ---------------------------- | ------------------------------------------------------- |
| `GET`    | `/students/{student_id}/progress-photos`                 | đăng nhập | `progressPhotosApi.list`     | `students.photos(id)`        | routes/staff/student-detail.tsx — tab hidden from STAFF |
| `POST`   | `/students/{student_id}/progress-photos`                 | đăng nhập | `progressPhotosApi.upload`   | mutation (multipart)         | routes/staff/student-detail.tsx                         |
| `DELETE` | `/students/{student_id}/progress-photos/{photo_id}`      | ADMIN     | `progressPhotosApi.remove`   | mutation — ADMIN only        | routes/staff/student-detail.tsx                         |
| `GET`    | `/students/{student_id}/progress-photos/{photo_id}/file` | đăng nhập | `progressPhotosApi.fileBlob` | `students.photoFile(id,pid)` | routes/staff/student-detail.tsx — object URL            |

### Trainers — `endpoints/trainers.ts`

| Method  | Path                           | Role         | FE binding                | Cache key / kind      | Consumer                                                    |
| ------- | ------------------------------ | ------------ | ------------------------- | --------------------- | ----------------------------------------------------------- |
| `GET`   | `/trainers`                    | ADMIN, STAFF | `trainersApi.list`        | `trainers.list(f)`    | routes/staff/trainers.tsx, calendar filter                  |
| `POST`  | `/trainers`                    | ADMIN, STAFF | `trainersApi.create`      | mutation              | routes/staff/trainers.tsx                                   |
| `GET`   | `/trainers/{trainer_id}`       | đăng nhập    | `trainersApi.get`         | `trainers.detail(id)` | routes/staff/trainer-detail.tsx, routes/trainer/profile.tsx |
| `PATCH` | `/trainers/{trainer_id}`       | đăng nhập    | `trainersApi.update`      | mutation              | routes/staff/trainer-detail.tsx, routes/trainer/profile.tsx |
| `GET`   | `/trainers/{trainer_id}/photo` | đăng nhập    | `trainersApi.photoBlob`   | `trainers.photo(id)`  | routes/staff/trainer-detail.tsx — object URL                |
| `POST`  | `/trainers/{trainer_id}/photo` | đăng nhập    | `trainersApi.uploadPhoto` | mutation (multipart)  | routes/staff/trainer-detail.tsx                             |

### Announcements — `endpoints/announcements.ts`

| Method   | Path                               | Role         | FE binding                | Cache key / kind        | Consumer                                    |
| -------- | ---------------------------------- | ------------ | ------------------------- | ----------------------- | ------------------------------------------- |
| `GET`    | `/announcements`                   | ADMIN, STAFF | `announcementsApi.list`   | `announcements.list(f)` | routes/staff/announcements.tsx — NEW screen |
| `POST`   | `/announcements`                   | ADMIN, STAFF | `announcementsApi.create` | mutation                | routes/staff/announcements.tsx — NEW screen |
| `DELETE` | `/announcements/{announcement_id}` | ADMIN, STAFF | `announcementsApi.remove` | mutation                | routes/staff/announcements.tsx — NEW screen |
| `PATCH`  | `/announcements/{announcement_id}` | ADMIN, STAFF | `announcementsApi.update` | mutation                | routes/staff/announcements.tsx — NEW screen |

### Packages & credit ledger — `endpoints/packages.ts`

| Method  | Path                               | Role         | FE binding               | Cache key / kind         | Consumer                                                     |
| ------- | ---------------------------------- | ------------ | ------------------------ | ------------------------ | ------------------------------------------------------------ |
| `GET`   | `/package-types`                   | ADMIN, STAFF | `packagesApi.listTypes`  | `packages.types(f)`      | routes/staff/packages.tsx                                    |
| `POST`  | `/package-types`                   | ADMIN, STAFF | `packagesApi.createType` | mutation                 | routes/staff/packages.tsx                                    |
| `PATCH` | `/package-types/{package_type_id}` | ADMIN, STAFF | `packagesApi.updateType` | mutation                 | routes/staff/packages.tsx                                    |
| `GET`   | `/packages`                        | đăng nhập    | `packagesApi.list`       | `packages.ofStudent(id)` | routes/student/packages.tsx, routes/staff/student-detail.tsx |
| `POST`  | `/packages/sell`                   | ADMIN, STAFF | `packagesApi.sell`       | mutation                 | routes/staff/student-detail.tsx                              |
| `POST`  | `/packages/{package_id}/adjust`    | ADMIN        | `packagesApi.adjust`     | mutation — ADMIN only    | routes/staff/session-ledger.tsx                              |
| `GET`   | `/packages/{package_id}/ledger`    | đăng nhập    | `packagesApi.ledger`     | `packages.ledger(id)`    | routes/staff/session-ledger.tsx, routes/student/packages.tsx |
| `POST`  | `/packages/{package_id}/renew`     | ADMIN, STAFF | `packagesApi.renew`      | mutation                 | routes/staff/renewals.tsx, student-detail.tsx                |

### Payments — `endpoints/payments.ts`

| Method | Path                             | Role         | FE binding            | Cache key / kind      | Consumer                  |
| ------ | -------------------------------- | ------------ | --------------------- | --------------------- | ------------------------- |
| `GET`  | `/payments`                      | ADMIN, STAFF | `paymentsApi.list`    | `payments.list(f)`    | routes/staff/payments.tsx |
| `POST` | `/payments`                      | ADMIN, STAFF | `paymentsApi.create`  | mutation              | routes/staff/payments.tsx |
| `GET`  | `/payments/{payment_id}`         | ADMIN, STAFF | `paymentsApi.get`     | `payments.detail(id)` | routes/staff/payments.tsx |
| `POST` | `/payments/{payment_id}/confirm` | ADMIN, STAFF | `paymentsApi.confirm` | mutation              | routes/staff/payments.tsx |
| `POST` | `/payments/{payment_id}/void`    | ADMIN, STAFF | `paymentsApi.void`    | mutation              | routes/staff/payments.tsx |

### Classes & schedule — `endpoints/classes.ts`

| Method | Path                               | Role                       | FE binding                     | Cache key / kind               | Consumer                                                       |
| ------ | ---------------------------------- | -------------------------- | ------------------------------ | ------------------------------ | -------------------------------------------------------------- |
| `GET`  | `/classes`                         | đăng nhập                  | `classesApi.list`              | `classes.list(f)`              | routes/staff/calendar.tsx, routes/student/classes.tsx          |
| `POST` | `/classes`                         | ADMIN, STAFF               | `classesApi.create`            | mutation                       | routes/staff/calendar.tsx                                      |
| `GET`  | `/classes/my-schedule`             | đăng nhập                  | `classesApi.mySchedule`        | `classes.mine(f,t)`            | routes/trainer/schedule.tsx, routes/trainer/today.tsx          |
| `POST` | `/classes/recurrence`              | ADMIN, STAFF               | `classesApi.createRecurrence`  | mutation                       | routes/staff/calendar.tsx                                      |
| `POST` | `/classes/recurrence/preview`      | ADMIN, STAFF               | `classesApi.previewRecurrence` | mutation (preview)             | routes/staff/calendar.tsx                                      |
| `GET`  | `/classes/trainer-stats`           | ADMIN, STAFF               | `classesApi.trainerStats`      | `classes.trainerStats(id,y,m)` | routes/staff/trainer-detail.tsx                                |
| `GET`  | `/classes/{session_id}`            | đăng nhập                  | `classesApi.get`               | `classes.detail(id)`           | routes/staff/class-detail.tsx, routes/student/class-detail.tsx |
| `GET`  | `/classes/{session_id}/attendance` | TRAINER (chỉ lớp mình dạy) | `classesApi.attendance`        | `classes.attendance(id)`       | routes/trainer/class-detail.tsx                                |
| `POST` | `/classes/{session_id}/cancel`     | ADMIN, STAFF               | `classesApi.cancel`            | mutation                       | routes/staff/class-detail.tsx                                  |
| `POST` | `/classes/{session_id}/trainer`    | ADMIN, STAFF               | `classesApi.assignTrainer`     | mutation                       | routes/staff/class-detail.tsx                                  |

### Bookings — `endpoints/bookings.ts`

| Method  | Path                                | Role                       | FE binding                   | Cache key / kind        | Consumer                               |
| ------- | ----------------------------------- | -------------------------- | ---------------------------- | ----------------------- | -------------------------------------- |
| `GET`   | `/bookings`                         | ADMIN, STAFF               | `bookingsApi.list`           | `bookings.list(f)`      | routes/staff/class-detail.tsx — roster |
| `POST`  | `/bookings`                         | STUDENT (chỉ của mình)     | `bookingsApi.create`         | mutation — STUDENT only | routes/student/class-detail.tsx        |
| `PATCH` | `/bookings/{booking_id}/attendance` | TRAINER (chỉ lớp mình dạy) | `bookingsApi.markAttendance` | mutation — TRAINER only | routes/trainer/class-detail.tsx        |
| `POST`  | `/bookings/{booking_id}/cancel`     | STUDENT (chỉ của mình)     | `bookingsApi.cancel`         | mutation — STUDENT only | routes/student/my-schedule.tsx         |
| `POST`  | `/bookings/{booking_id}/change`     | STUDENT (chỉ của mình)     | `bookingsApi.change`         | mutation — STUDENT only | routes/student/my-schedule.tsx         |

### Student schedule — `endpoints/my-schedule.ts`

| Method | Path                    | Role      | FE binding               | Cache key / kind         | Consumer                                                                      |
| ------ | ----------------------- | --------- | ------------------------ | ------------------------ | ----------------------------------------------------------------------------- |
| `GET`  | `/my-schedule`          | đăng nhập | `myScheduleApi.list`     | `mySchedule.list(f)`     | routes/student/my-schedule.tsx, booking-history.tsx, staff/student-detail.tsx |
| `GET`  | `/my-schedule/bookable` | đăng nhập | `myScheduleApi.bookable` | `mySchedule.bookable(f)` | routes/student/classes.tsx                                                    |

### Renewal reminders — `endpoints/renewals.ts`

| Method | Path                                       | Role         | FE binding                   | Cache key / kind       | Consumer                                      |
| ------ | ------------------------------------------ | ------------ | ---------------------------- | ---------------------- | --------------------------------------------- |
| `GET`  | `/renewals`                                | ADMIN, STAFF | `renewalsApi.list`           | `renewals.list(f)`     | routes/staff/renewals.tsx                     |
| `POST` | `/renewals/contacts`                       | ADMIN, STAFF | `renewalsApi.logContact`     | mutation               | routes/staff/renewals.tsx                     |
| `GET`  | `/renewals/students/{student_id}/contacts` | ADMIN, STAFF | `renewalsApi.contactHistory` | `renewals.history(id)` | routes/staff/renewals.tsx, student-detail.tsx |
| `GET`  | `/renewals/summary`                        | ADMIN, STAFF | `renewalsApi.summary`        | `renewals.summary()`   | routes/staff/renewals.tsx                     |

### Reports — `endpoints/reports.ts`

| Method | Path                                   | Role         | FE binding                           | Cache key / kind           | Consumer                                 |
| ------ | -------------------------------------- | ------------ | ------------------------------------ | -------------------------- | ---------------------------------------- |
| `GET`  | `/reports/classes`                     | ADMIN, STAFF | `reportsApi.classes`                 | `reports.classes(p)`       | routes/staff/report-classes.tsx          |
| `GET`  | `/reports/dashboard`                   | ADMIN, STAFF | `reportsApi.dashboard`               | `reports.dashboard()`      | routes/staff/dashboard.tsx               |
| `GET`  | `/reports/revenue`                     | ADMIN, STAFF | `reportsApi.revenue`                 | `reports.revenue(p)`       | routes/staff/report-revenue.tsx          |
| `GET`  | `/reports/revenue/detail`              | ADMIN, STAFF | `reportsApi.revenueDetail`           | `reports.revenueDetail(p)` | routes/staff/report-revenue.tsx          |
| `GET`  | `/reports/trainers`                    | ADMIN, STAFF | `reportsApi.trainers`                | `reports.trainers(p)`      | routes/staff/report-trainers.tsx         |
| `GET`  | `/reports/trainers/class-sizes`        | ADMIN, STAFF | `reportsApi.trainerClassSizes`       | `reports.classSizes(p)`    | routes/staff/report-trainers.tsx         |
| `GET`  | `/reports/trainers/class-sizes/export` | ADMIN, STAFF | `reportsApi.exportTrainerClassSizes` | download (blob)            | routes/staff/report-trainers.tsx         |
| `GET`  | `/reports/trainers/export`             | ADMIN, STAFF | `reportsApi.exportTrainers`          | download (blob)            | routes/staff/report-trainers.tsx         |
| `GET`  | `/reports/unconfirmed-payments`        | ADMIN, STAFF | `reportsApi.unconfirmedPayments`     | `reports.unconfirmed(d)`   | routes/staff/payments.tsx, dashboard.tsx |

### Meta — `endpoints/meta.ts`

| Method | Path      | Role      | FE binding       | Cache key / kind | Consumer               |
| ------ | --------- | --------- | ---------------- | ---------------- | ---------------------- |
| `GET`  | `/health` | công khai | `metaApi.health` | no cache         | used by e2e smoke only |

---

## What the frontend used to believe

`src_FE/` was built before there was a backend to call, against a surface it
invented and served with MSW. These are the differences that cost screens, not
just renames.

### Concepts the backend deliberately does not have

| Frontend had                                                          | Reality                                                                                            |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Waitlist (`waitlistCount`, `waitlistPosition`, `waitlistAutoPromote`) | Dropped by the studio on 14/09. A full class is refused, full stop. No endpoint, no queue.         |
| `ClassSession.title`, `.room`, `.note`                                | A session is a time, a trainer, a type and a capacity. There is no title and no room.              |
| `BookingEligibility` object per class                                 | `GET /my-schedule/bookable` returns the ids a student can actually book. That is the whole answer. |
| Staff booking on a student's behalf (`POST /staff/bookings`)          | `POST /bookings` is STUDENT-only, own profile only. Confirmed rule, not a gap.                     |
| `RescheduleOption[]`                                                  | `POST /bookings/{id}/change` takes any session id and decides. There is no pre-filtered list.      |
| `Paginated<T>` envelope                                               | Lists are bare arrays with `limit`/`offset` on the query string.                                   |
| `CancellationTerms.policyHours`                                       | `/my-schedule` returns `cancel_deadline`, `refund_if_cancelled_now`, `can_cancel` per booking.     |

### Backend facts the frontend had nowhere to put

Attendance marking, announcements (all four endpoints), progress photos,
account lock/unlock and password-reset resend, recurrence preview, trainer
monthly stats, renewal contact history, report exports, unconfirmed payments,
`/students/{id}/overview`, `/packages/{id}/renew`, `/package-types` as a
catalogue distinct from a student's purchased packages.

### Shape changes that reach the screens

| Where                   | Change                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /classes`          | Returns `trainer_id`, not a trainer object. The week grid joins against `GET /trainers`.                                                                     |
| `GET /classes/{id}`     | One type, two projections: staff get real occupancy, a student gets `booked_count: 0` and `seats_left` as 1 or 0. Read it as a boolean on a student surface. |
| Student booking history | No dedicated endpoint. `GET /my-schedule?include_cancelled=true`, split by `starts_at`.                                                                      |
| Payments                | Belong to a `student_package_id`, not to a student and a free-text reference.                                                                                |
| Packages                | Two things: `/package-types` (catalogue) and `/packages` (what a student bought, with `*_snapshot` fields frozen at sale).                                   |
| Session ledger          | `GET /packages/{id}/ledger` — read `balance_after` per row; never add deltas in the client.                                                                  |
