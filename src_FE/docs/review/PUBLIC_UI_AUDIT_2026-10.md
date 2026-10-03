# Public UI audit — 03/10/2026

Detail pass over every public screen on `ui/warm-measure`, read at 2× zoom at
1440, 1024 and 390 px. Each finding names the defect, why it costs trust or
clarity, and what was changed. Policies follow Soul Pilates Đà Nẵng as
owner-authorised placeholders (see `docs/OPEN_QUESTIONS.md`).

Status: **fixed** unless marked otherwise.

## Foundations

| #   | Finding                                                                                                                                     | Fix                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | "Còn chỗ / Hết chỗ" rendered as a boxed badge: mint wash, green border, cool system green. It read as an admin status chip on a cream page. | New `<Availability>` primitive: no box, an 8px olive dot and two words; "Hết chỗ" is an empty ring in secondary ink. The staff `StatusBadge` is unchanged. |
| F2  | `success` green #2f6a4f was the only cool hue on the public site.                                                                           | Warmed to olive #3c6a3b (5.89:1 on sand, 5.34:1 on its wash). Status meaning unchanged.                                                                    |
| F3  | Demo-data notice was a yellow bar with a left accent border — the loudest thing in the schedule and a template trope.                       | Quiet dashed tag with a small dot, right-aligned beside the data it labels.                                                                                |
| F4  | Eyebrow label at 11px with 0.11em tracking whispered on cream and broke up stacked diacritics.                                              | `label-micro` is 12px / 0.09em everywhere.                                                                                                                 |
| F5  | Public descriptions, lists and terms were set at 13px — staff density on a marketing page.                                                  | Body copy, lists, comparison table and policy terms at 15px; 13px kept for metadata only.                                                                  |
| F6  | Form labels and help text at 12px on forms a visitor fills once, often on a phone.                                                          | `Field size="lg"`: 13px labels and hints, 48px inputs with 15px text. Used on consultation, homepage form and sign-in.                                     |
| F7  | Wordmark set light at 17px, baseline-aligned with a hairline that sat below the x-height; it lost to the nav.                               | 22px regular, centred hairline, nav at 15px from 1280px (13px at 1024 so it still fits).                                                                   |
| F8  | Footer bottom row used 11px with letter-spacing — read as spaced-out legal text.                                                            | 12px, no tracking, wider gaps.                                                                                                                             |
| F9  | Public pages computed "today" during pre-render, so the built HTML carried the build date and hydration disagreed with the client.          | `useStudioToday()` returns `null` on the server snapshot; the schedule renders skeletons until the client knows the date.                                  |

## Schedule (`/lich-tap`)

| #   | Finding                                                                                                     | Fix                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | Read as a data table: equal-weight rows, small times, nothing felt choosable.                               | Rebuilt as option A′: day strip → times grouped by Sáng / Trưa / Chiều tối → selectable session cards with the start time at 30px in the serif.                                                                                                  |
| S2  | Week paging with a "Tuần trước" that could only ever be empty (the endpoint serves upcoming classes only).  | A 14-day strip starting today, matching the endpoint's default horizon. No week buttons. Each day shows a dot per class.                                                                                                                         |
| S3  | Opening on an empty "today" late in the evening was a dead end.                                             | Opens on the first day that has classes; an empty day offers a button to the next day with classes.                                                                                                                                              |
| S4  | No way to say "show me private sessions" — and the services page could not deep-link to one format.         | Tất cả / Lớp nhóm / Lớp riêng switch; `?loai=nhom` / `?loai=rieng` preselects it. The services page links to each.                                                                                                                               |
| S5  | Selecting a class did nothing; signing in silently lost the class (the public timetable has no session id). | "Buổi bạn chọn" panel (desktop) and a sticky bar (phone) with the next step, the package condition, the refund window, and the plain statement that the visitor re-selects the class after signing in. Full classes route to the studio instead. |
| S6  | Dates written "03-10".                                                                                      | "Hôm nay, 3 tháng 10" / "Thứ hai, 5 tháng 10".                                                                                                                                                                                                   |
| S7  | axe: empty-day numerals in `ink-3` (3.80:1) at 22px.                                                        | `ink-2` (7.08:1); emptiness is carried by the missing dots.                                                                                                                                                                                      |

## Pages

| #   | Page            | Finding                                                                                                         | Fix                                                                                                                                                          |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | Home            | Seven-day preview used the boxed badge and a table row.                                                         | Shared `SessionLine`: day, serif time, format with ratio, trainer, availability; link into the full schedule.                                                |
| P2  | Home            | At 1024 the "Hai hình thức" rail was four tracks wide and the heading broke over five lines.                    | Rail spans the row at 1024 with the two formats side by side; 4/4/4 from 1280.                                                                               |
| P3  | Home, Services  | Class size was never stated — the first thing a boutique-studio visitor asks.                                   | Ratio (1:3 / 1:1) as a serif figure and "Tối đa 3 học viên mỗi lớp" under each format (Soul policy, provisional).                                            |
| P4  | Services        | "Một học viên, một huấn luyện viên" appeared twice in a row.                                                    | Body copy no longer repeats the size line.                                                                                                                   |
| P5  | Services        | Comparison lacked size and duration.                                                                            | Rows for Sĩ số and Thời lượng; table at 15px.                                                                                                                |
| P6  | Services, Home  | Private cancellation said 8 hours; the backend enforces 1.                                                      | Copy now states what the system enforces (1 hour). Open question for the owner.                                                                              |
| P7  | Packages        | One undifferentiated list; total price at 13px; no per-session price — the number that justifies a bigger pack. | Grouped by format, sorted by credits; total at 20px, per-session price beneath, "Tiết kiệm x%" computed against the smallest priced pack of the same format. |
| P8  | Studio          | "Lớp nhỏ" principle said nothing concrete.                                                                      | States the cap: at most 3 per group class, private is one-to-one.                                                                                            |
| P9  | Contact, footer | Opening hours empty.                                                                                            | Mon–Sat 07:30–19:30 (Soul, provisional). Address, phone, Zalo and map stay pending — they are location facts.                                                |
| P10 | Sign-in         | 12px labels, 40px inputs, small title on the one screen students open most.                                     | Large fields, display-size title.                                                                                                                            |

## Verification

- `tsc`, ESLint (0 warnings), Vitest 66/66.
- Production build; build contract OK (9 pre-rendered routes).
- Playwright public + SPA-fallback suites: 32/32, including axe (no serious or critical violations) and no horizontal scroll at the QA breakpoints.
- Not green, and not caused by this pass: 9 dev-server specs in
  `staff-schedule.app.spec.ts` and `student-schedule.app.spec.ts`. They expect
  UI that `main` does not have (for example a "Tên lớp" field in the add-class
  dialog); the add-class form here differs from `main` only by the
  `lacquer` → `copper` class rename.
  EOF
  echo done
