import { Link } from "react-router";

import { CLASS_FORMATS, FIRST_VISIT_STEPS } from "~/content/studio";
import { usePublicSchedule } from "~/features/public/queries";
import { addDays, formatTime, studioDateKey, weekdayShort } from "~/lib/format";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  const title = "Soul Pilates Nha Trang — Studio reformer, lớp nhóm nhỏ và lớp riêng";
  const description =
    "Studio Pilates reformer tại Nha Trang. Lớp nhóm nhỏ và lớp riêng, huấn luyện viên theo sát từng người. Đặt lịch tư vấn để bắt đầu.";
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
      <Opening />
      <ClassPaths />
      <Guidance />
      <Place />
      <SchedulePreview />
      <FirstVisit />
      <FinalAsk />
    </>
  );
}

function Opening() {
  return (
    <section className="th-opening">
      <div className="th-stage">
        <ArtDirectedImage photo="hero" priority sizes="100vw" />
      </div>
      <div className="th-intro gutter">
        <div>
          <span className="th-overline">Soul Pilates / Nha Trang</span>
          <h1>
            Tập để <em>cảm nhận</em>
            <br />
            sự khác biệt.
          </h1>
        </div>
        <div className="th-intro-action">
          <p>
            Lớp nhóm nhỏ và lớp riêng trên reformer. Mỗi chuyển động được huấn luyện viên
            quan sát và điều chỉnh.
          </p>
          <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ClassPaths() {
  return (
    <section className="th-section th-paths gutter">
      <div className="th-section-head">
        <span className="th-overline">01 / Hình thức tập</span>
        <h2>Chọn nhịp tập của bạn.</h2>
      </div>
      <div className="th-path-grid">
        {CLASS_FORMATS.map((format, index) => (
          <article key={format.id} className="th-path">
            <span>
              0{index + 1} / {format.sub}
            </span>
            <h3>{format.name}</h3>
            <p>{format.body}</p>
            <Link to="/dich-vu">
              Khám phá hình thức tập <span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function Guidance() {
  return (
    <section className="th-guidance">
      <div className="th-guidance-image">
        <ArtDirectedImage photo="method" sizes="(min-width: 768px) 56vw, 100vw" />
        <span className="th-concept-note">Hình minh họa</span>
      </div>
      <div className="th-guidance-copy">
        <span className="th-overline">02 / Chuyển động có kiểm soát</span>
        <h2>Không chỉ là hoàn thành một động tác.</h2>
        <p>
          Tập trên máy đòi hỏi sự chú ý đến điểm bắt đầu, nhịp thở và cách cơ thể đi qua
          từng phần chuyển động. Đó là lý do người dạy cần quan sát từng người.
        </p>
        <Link to="/huan-luyen-vien">
          Tìm hiểu về người hướng dẫn <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}

function Place() {
  return (
    <section className="th-place th-section gutter">
      <div className="th-place-copy">
        <span className="th-overline">03 / Không gian thật</span>
        <h2>Một nơi để tập trung vào việc tập.</h2>
        <p>
          Các máy reformer được đặt song song, với lối đi giữa các máy để huấn luyện viên
          quan sát từ nhiều phía.
        </p>
        <Link to="/gioi-thieu">
          Xem studio <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="th-place-image">
        <ArtDirectedImage photo="room" sizes="(min-width: 768px) 44vw, 100vw" />
      </div>
    </section>
  );
}

function SchedulePreview() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));
  return (
    <section className="th-schedule th-section gutter">
      <div className="th-section-head">
        <span className="th-overline">04 / Bảy ngày tới</span>
        <h2>Tìm một buổi phù hợp.</h2>
        <Link to="/lich-tap">
          Xem toàn bộ lịch <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="th-schedule-list">
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
            description="Studio chưa mở lịch cho khoảng thời gian này."
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
                  <span>
                    {weekdayShort(item.starts_at)} · {formatTime(item.starts_at)}
                  </span>
                  <strong>
                    {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                  </strong>
                  <StatusBadge tone={item.is_full ? "critical" : "positive"}>
                    {item.is_full ? "Hết chỗ" : "Còn chỗ"}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

function FirstVisit() {
  return (
    <section className="th-first th-section gutter">
      <div className="th-section-head">
        <span className="th-overline">05 / Buổi đầu tiên</span>
        <h2>Đến tập mà không cần biết trước.</h2>
      </div>
      <ol>
        {FIRST_VISIT_STEPS.map((step) => (
          <li key={step.index}>
            <span>{step.index}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FinalAsk() {
  return (
    <section className="th-final">
      <div className="th-section gutter">
        <span className="th-overline">Bắt đầu</span>
        <h2>Để studio nghe bạn trước.</h2>
        <p>
          Để lại tên và số điện thoại. Studio sẽ liên hệ để tìm hiểu nhu cầu rồi gợi ý hình
          thức tập.
        </p>
        <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
          <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
        </Button>
      </div>
    </section>
  );
}
