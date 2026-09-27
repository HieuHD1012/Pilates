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
    "Studio Pilates reformer tại Nha Trang. Tìm hiểu cách tập, chọn lớp nhóm hoặc lớp riêng và đặt lịch tư vấn.";
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

const PRINCIPLES = [
  {
    number: "01",
    name: "Hơi thở",
    body: "Dùng nhịp thở để nhận biết và dẫn chuyển động, trước khi tăng độ khó của bài tập.",
  },
  {
    number: "02",
    name: "Căn chỉnh",
    body: "Quan sát vị trí vai, khung sườn và khung chậu để tìm cách thực hiện phù hợp với cơ thể mình.",
  },
  {
    number: "03",
    name: "Kiểm soát",
    body: "Chuyển động có chủ đích, trong biên độ mà người tập còn làm chủ được.",
  },
];

export default function Home() {
  return (
    <>
      <section className="pvolve-hero">
        <div className="pvolve-hero__copy">
          <p className="pvolve-kicker">Soul Pilates / Phương pháp tập</p>
          <h1>
            Tập đúng hơn.<br />
            <span>Từ từng chuyển động.</span>
          </h1>
          <div className="pvolve-hero__bottom">
            <p>
              Một buổi tập bắt đầu bằng sự chú ý đến cơ thể. Hơi thở, căn chỉnh và kiểm soát
              dẫn đường trước khi chọn bài tập tiếp theo.
            </p>
            <Button asChild variant="lacquer" size="lg">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          </div>
        </div>
        <div className="pvolve-hero__visual">
          <ArtDirectedImage photo="hero" priority sizes="(min-width: 900px) 40vw, 100vw" />
          <span className="pvolve-hero__image-index" aria-hidden="true">01 / 03</span>
        </div>
      </section>

      <section className="pvolve-principles" aria-labelledby="principles-title">
        <div className="pvolve-container">
          <div className="pvolve-section-head">
            <p className="pvolve-kicker">Cách chúng tôi tiếp cận buổi tập</p>
            <h2 id="principles-title">Một phương pháp, ba điểm cần chú ý.</h2>
          </div>
          <div className="pvolve-principles__grid">
            {PRINCIPLES.map((principle) => (
              <article key={principle.number}>
                <span className="pvolve-ordinal">{principle.number}</span>
                <h3>{principle.name}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pvolve-method-story" aria-labelledby="method-title">
        <div className="pvolve-method-story__visual">
          <ArtDirectedImage
            photo="method"
            sizes="(min-width: 900px) 45vw, 100vw"
            imgClassName="pvolve-method-story__image"
          />
        </div>
        <div className="pvolve-method-story__copy">
          <p className="pvolve-kicker">Tập có chủ đích</p>
          <h2 id="method-title">Chậm lại để cảm nhận rõ hơn.</h2>
          <p>
            Pilates có nhiều dạng thiết bị và nhiều cách thực hiện một động tác. Điều quan
            trọng là bạn hiểu mình đang làm gì, có thể điều chỉnh và tiếp tục một cách ổn
            định. Buổi đầu tiên là lúc studio tìm hiểu nhu cầu của bạn.
          </p>
          <Link className="pvolve-text-link" to="/dich-vu">Khám phá hình thức tập <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="pvolve-formats" aria-labelledby="formats-title">
        <div className="pvolve-container">
          <div className="pvolve-section-head pvolve-section-head--formats">
            <p className="pvolve-kicker">Chọn cách tập</p>
            <h2 id="formats-title">Cùng phương pháp. Khác nhịp tập.</h2>
            <p>Hai hình thức đã được xác nhận cho studio: nhóm nhỏ và lớp riêng.</p>
          </div>
          <div className="pvolve-formats__grid">
            {CLASS_FORMATS.map((format, index) => (
              <Link className="pvolve-format" key={format.id} to="/dich-vu">
                <span className="pvolve-ordinal">0{index + 1} / {format.sub}</span>
                <h3>{format.name}</h3>
                <p>{format.body}</p>
                <span className="pvolve-format__arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pvolve-practice" aria-labelledby="practice-title">
        <div className="pvolve-practice__copy">
          <p className="pvolve-kicker">Trong buổi tập</p>
          <h2 id="practice-title">Từng chuyển động đều có thể được điều chỉnh.</h2>
          <p>
            Với reformer, cùng một bài có thể thay đổi lực cản và biên độ. Đó là lý do
            chọn lớp nên dựa vào điều bạn cần ở thời điểm này, thay vì chạy theo một mức độ
            được gắn sẵn.
          </p>
          <Link className="pvolve-text-link" to="/dich-vu">So sánh hai hình thức <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="pvolve-practice__visual">
          <ArtDirectedImage photo="practice" sizes="(min-width: 900px) 53vw, 100vw" imgClassName="pvolve-practice__image" />
        </div>
      </section>

      <ThisWeek />

      <section className="pvolve-first" aria-labelledby="first-title">
        <div className="pvolve-container">
          <div className="pvolve-section-head">
            <p className="pvolve-kicker">Buổi đầu tiên</p>
            <h2 id="first-title">Bắt đầu đơn giản.</h2>
          </div>
          <ol>
            {FIRST_VISIT_STEPS.map((step) => (
              <li key={step.index}>
                <span className="pvolve-ordinal">{step.index}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pvolve-close">
        <div className="pvolve-container">
          <p className="pvolve-kicker">Bắt đầu từ điều bạn cần</p>
          <h2>Chưa biết nên chọn lớp nào? Hãy kể cho studio nghe.</h2>
          <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function ThisWeek() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));

  return (
    <section className="pvolve-schedule" aria-labelledby="week-title">
      <div className="pvolve-container pvolve-schedule__grid">
        <div>
          <p className="pvolve-kicker">Lịch tập</p>
          <h2 id="week-title">Bảy ngày tới.</h2>
          <p>Đăng nhập để đặt chỗ, hoặc để lại thông tin nếu bạn chưa có gói tập.</p>
          <Link className="pvolve-text-link" to="/lich-tap">Xem toàn bộ lịch <span aria-hidden="true">↗</span></Link>
        </div>
        <div>
          {query.isPending ? <SkeletonRows rows={5} /> : null}
          {query.isError ? (
            <ErrorState description="Chưa tải được lịch tập. Bạn vẫn có thể liên hệ studio để hỏi lịch." onRetry={() => void query.refetch()} />
          ) : null}
          {query.isSuccess && query.data.length === 0 ? (
            <EmptyState title="Chưa có lớp nào trong bảy ngày tới" description="Studio chưa mở lịch cho khoảng thời gian này. Để lại thông tin và nhân viên sẽ báo bạn khi có lịch mới." action={<Button asChild variant="secondary"><Link to="/dat-tu-van">Để lại thông tin</Link></Button>} />
          ) : null}
          {query.isSuccess && query.data.length > 0 ? (
            <>
              <DemoDataNotice className="mb-3" />
              <ul className="pvolve-schedule__list">
                {query.data.slice(0, 6).map((item) => (
                  <li key={`${item.starts_at}-${item.trainer_name}`}>
                    <span>{weekdayShort(item.starts_at)} <strong>{formatTime(item.starts_at)}</strong></span>
                    <span>{item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}<small>{item.trainer_name}</small></span>
                    <StatusBadge tone={item.is_full ? "critical" : "positive"}>{item.is_full ? "Hết chỗ" : "Còn chỗ"}</StatusBadge>
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
