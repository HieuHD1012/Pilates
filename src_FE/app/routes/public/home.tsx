import { Link } from "react-router";

import { CLASS_FORMATS, FIRST_VISIT_STEPS } from "~/content/studio";
import { usePublicSchedule } from "~/features/public/queries";
import { addDays, formatTime, studioDateKey, weekdayShort } from "~/lib/format";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  const title = "Soul Pilates Nha Trang — Lớp nhóm nhỏ và lớp riêng";
  const description =
    "Pilates reformer tại Nha Trang. Khám phá lớp nhóm nhỏ, lớp riêng và cách bắt đầu với Soul Pilates.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:locale", content: "vi_VN" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function Home() {
  return (
    <>
      <Arrival />
      <Invitation />
      <Formats />
      <Practice />
      <ThisWeek />
      <FirstVisit />
      <Closing />
    </>
  );
}

function Arrival() {
  return (
    <section className="os-arrival" aria-labelledby="os-arrival-title">
      <div className="os-container os-arrival-grid">
        <div className="os-arrival-copy">
          <p className="os-eyebrow">Soul Pilates · Nha Trang</p>
          <h1 id="os-arrival-title">
            Chuyển động để <em>cảm nhận</em> rõ hơn.
          </h1>
          <p className="os-arrival-lede">
            Một không gian cho từng nhịp thở, từng chuyển động và cách cơ thể bạn tiến bộ
            theo thời gian.
          </p>
          <div className="os-arrival-actions">
            <Link className="os-pill os-pill-accent" to="/dat-tu-van">
              Bắt đầu với Soul <span aria-hidden="true">↗</span>
            </Link>
            <Link className="os-text-link os-text-link-light" to="/dich-vu">
              Tìm hình thức tập phù hợp <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className="os-arrival-note">Lớp nhóm nhỏ · Lớp riêng · Reformer</p>
        </div>
        <div className="os-arrival-image">
          <ArtDirectedImage photo="hero" priority sizes="(min-width: 900px) 50vw, 100vw" />
        </div>
      </div>
    </section>
  );
}

function Invitation() {
  return (
    <section className="os-invitation">
      <div className="os-container os-invitation-grid">
        <p className="os-section-kicker">Một buổi tập tại Soul</p>
        <h2>Không cần biết hết mọi động tác trước khi bước vào lớp.</h2>
        <p>
          Hãy bắt đầu bằng điều bạn muốn cải thiện. Studio sẽ cùng bạn chọn lớp nhóm hay lớp
          riêng trước khi bạn đặt buổi tập đầu tiên.
        </p>
      </div>
    </section>
  );
}

function Formats() {
  return (
    <section className="os-formats" id="hinh-thuc-tap">
      <div className="os-container">
        <div className="os-section-head">
          <p className="os-section-kicker">Hình thức tập</p>
          <h2>Chọn cách bắt đầu của bạn.</h2>
          <Link className="os-text-link" to="/dich-vu">
            Khám phá hai hình thức <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="os-format-grid">
          {CLASS_FORMATS.map((format, index) => (
            <article className={`os-format-card os-format-${format.id}`} key={format.id}>
              <div className="os-format-top">
                <span>0{index + 1} / 02</span>
                <span>{format.sub}</span>
              </div>
              <div>
                <h3>{format.name}</h3>
                <p>{format.body}</p>
                <Link
                  to={`/dich-vu#${format.id}`}
                  aria-label={`Tìm hiểu ${format.name}`}
                  className="os-round-arrow"
                >
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Practice() {
  return (
    <section className="os-practice" aria-labelledby="os-practice-title">
      <div className="os-practice-image">
        <ArtDirectedImage photo="method" sizes="(min-width: 900px) 58vw, 100vw" />
      </div>
      <div className="os-practice-copy">
        <p className="os-section-kicker">Cách chúng ta tập</p>
        <h2 id="os-practice-title">Nhịp chậm cho một chuyển động chính xác.</h2>
        <p>
          Hơi thở, vị trí cơ thể và lực kéo trên máy đều là một phần của bài tập. Lớp được
          giữ nhỏ để huấn luyện viên có thể theo sát từng người.
        </p>
        <Link className="os-text-link" to="/gioi-thieu">
          Khám phá studio <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}

function ThisWeek() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));

  return (
    <section className="os-schedule" aria-labelledby="os-schedule-title">
      <div className="os-container os-schedule-grid">
        <div className="os-schedule-intro">
          <p className="os-section-kicker">Lịch tập</p>
          <h2 id="os-schedule-title">Một chỗ trong tuần này.</h2>
          <p>Đăng nhập để đặt chỗ, hoặc để lại thông tin nếu bạn chưa có gói tập.</p>
          <Link className="os-text-link" to="/lich-tap">
            Xem toàn bộ lịch <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="os-schedule-list">
          {query.isPending ? <SkeletonRows rows={5} /> : null}
          {query.isError ? (
            <ErrorState
              description="Chưa tải được lịch tập. Bạn vẫn có thể liên hệ studio để hỏi lịch."
              onRetry={() => void query.refetch()}
            />
          ) : null}
          {query.isSuccess && query.data.length === 0 ? (
            <EmptyState
              title="Chưa có lớp nào trong bảy ngày tới"
              description="Studio chưa mở lịch cho khoảng thời gian này. Để lại thông tin và nhân viên sẽ báo bạn khi có lịch mới."
              action={
                <Button asChild variant="secondary">
                  <Link to="/dat-tu-van">Để lại thông tin</Link>
                </Button>
              }
            />
          ) : null}
          {query.isSuccess && query.data.length > 0 ? (
            <>
              <DemoDataNotice className="mb-3" />
              <ul>
                {query.data.slice(0, 6).map((item) => (
                  <li key={`${item.starts_at}-${item.trainer_name}`}>
                    <span className="os-schedule-date">{weekdayShort(item.starts_at)}</span>
                    <span className="os-schedule-time">{formatTime(item.starts_at)}</span>
                    <span className="os-schedule-class">
                      {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                      <small>{item.trainer_name}</small>
                    </span>
                    <span className="os-schedule-state">
                      <StatusBadge tone={item.is_full ? "critical" : "positive"}>
                        {item.is_full ? "Hết chỗ" : "Còn chỗ"}
                      </StatusBadge>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FirstVisit() {
  return (
    <section className="os-first-visit">
      <div className="os-container">
        <div className="os-section-head">
          <p className="os-section-kicker">Buổi đầu tiên</p>
          <h2>Bắt đầu theo cách đơn giản.</h2>
        </div>
        <ol className="os-step-grid">
          {FIRST_VISIT_STEPS.map((step) => (
            <li key={step.index}>
              <span>{step.index}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="os-closing">
      <div className="os-container os-closing-grid">
        <div>
          <p className="os-section-kicker">Bước đầu</p>
          <h2>Mọi hành trình đều bắt đầu bằng một cuộc trò chuyện.</h2>
        </div>
        <Link className="os-pill os-pill-accent" to="/dat-tu-van">
          Đặt lịch tư vấn <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
