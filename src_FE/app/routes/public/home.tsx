import {
  ArrowRight,
  CalendarCheck,
  Check,
  CircleHelp,
  Clock,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Package,
  Repeat,
  Rows3,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import {
  CANCELLATION_POLICY,
  CLASS_FORMATS,
  FIRST_VISIT_STEPS,
  STUDIO,
} from "~/content/studio";
import {
  FaqItem,
  IconChip,
  SectionHead,
  SpecRow,
  SwipeRow,
} from "~/features/public/ella-blocks";
import { usePublicSchedule } from "~/features/public/queries";
import { addDays, formatTime, studioDateKey, weekdayShort } from "~/lib/format";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PendingFact } from "~/ui/pending-fact";
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

/**
 * ELLA reference variant. The page grammar is ELLA Studio's — veiled hero,
 * benefit cards, format cards, a start-here trio, a photo panel, FAQ — and
 * every fact on it is Soul's own (app/content/studio.ts, the public API).
 * See docs/reference-variant.md for what was translated and what was refused.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Benefits />
      <Formats />
      <StartHere />
      <RoomPanel />
      <Faq />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Hero — the photograph's own bright wall dissolves into a solid cream field.
   Type only ever sits on that field: no scrim, no dimmed pixels.
   ──────────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="el-hero">
      <div className="el-hero-inner gutter mx-auto max-w-(--container-page)">
        <div className="el-hero-copy">
          <p className="label-micro el-eyebrow">Soul Pilates · Nha Trang</p>
          <h1 className="el-display">
            Studio
            <br />
            Pilates reformer
            <br />
            tại Nha Trang
          </h1>
          <p className="el-hero-lede">
            Lớp nhóm nhỏ và lớp riêng trên máy reformer. Một nơi để tập chậm lại, chính xác
            hơn và đều đặn theo nhịp của bạn.
          </p>
          <div className="el-hero-actions">
            <Button asChild variant="primary" size="lg" className="el-btn">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="el-btn el-btn-outline">
              <Link to="/dich-vu">Xem hình thức tập</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="el-hero-photo">
        <ArtDirectedImage photo="hero" priority sizes="(min-width: 768px) 62vw, 100vw" />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Benefits — only what the product already states: small groups without a
   number, one trainer per class (Q4), a private format, self-service booking (Q5).
   ──────────────────────────────────────────────────────────────────────────── */
const BENEFITS = [
  {
    icon: Users,
    title: "Lớp nhóm nhỏ",
    body: "Số chỗ mỗi buổi do studio đặt cho từng lớp và không bị vượt qua.",
  },
  {
    icon: UserCheck,
    title: "Một huấn luyện viên mỗi buổi",
    body: "Người dạy buổi của bạn chịu trách nhiệm cho buổi đó, từ đầu đến cuối.",
  },
  {
    icon: HeartHandshake,
    title: "Lớp riêng khi cần",
    body: "Một kèm một, bài tập dựng theo cơ thể bạn và mục tiêu cụ thể.",
  },
  {
    icon: CalendarCheck,
    title: "Tự đặt lịch trực tuyến",
    body: "Đặt, đổi hoặc hủy lớp trong tài khoản, theo hạn hủy của từng hình thức.",
  },
] as const;

function Benefits() {
  return (
    <section className="el-section">
      <div className="gutter mx-auto max-w-(--container-page)">
        <SectionHead
          eyebrow="Vì sao chọn Soul"
          title={
            <>
              Không tập nhiều hơn.
              <br />
              Tập đúng hơn.
            </>
          }
        />
        <SwipeRow className="el-benefits" label="Lý do chọn studio">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="el-card el-benefit">
              <IconChip icon={benefit.icon} />
              <h3 className="el-h3">{benefit.title}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </SwipeRow>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Formats — ELLA's level cards, mapped to the two confirmed formats (Q3). The
   clock footer states the confirmed cancellation window, because the class
   duration is not confirmed and must not be guessed.
   ──────────────────────────────────────────────────────────────────────────── */
const FORMAT_NOTE = { group: "Nhóm nhỏ", private: "Một kèm một" } as const;

/** Who the private format suits, as the studio wrote it (CLASS_FORMATS). */
const PRIVATE_FIT = CLASS_FORMATS.find((format) => format.id === "private")?.forWho ?? [];

function Formats() {
  return (
    <section className="el-section">
      <div className="gutter mx-auto max-w-(--container-page)">
        <SectionHead
          eyebrow="Hình thức tập"
          title="Chọn cách bạn tập"
          intro="Hai hình thức trên reformer, cùng một phương pháp. Khác nhau ở mức độ điều chỉnh riêng cho cơ thể bạn."
        />
        <div className="el-formats">
          {CLASS_FORMATS.map((format) => (
            <article key={format.id} className="el-card el-format" data-format={format.id}>
              <div className="el-format-top">
                <span className="el-tag" data-format={format.id}>
                  {format.sub}
                </span>
                <span className="el-format-note">{FORMAT_NOTE[format.id]}</span>
              </div>
              <h3 className="el-h3">{format.name}</h3>
              <p>{format.body}</p>
              <p className="el-format-foot">
                <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                <span>
                  Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ để được
                  hoàn buổi
                </span>
              </p>
            </article>
          ))}
        </div>
        <ThisWeek />
        <div className="el-center">
          <Button asChild variant="primary" size="lg" className="el-btn">
            <Link to="/lich-tap">Xem toàn bộ lịch tập</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * The pre-rendered document, hydrated with live studio data. All four remote
 * states are designed: loading, error, empty and loaded.
 */
function ThisWeek() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));

  return (
    <div className="el-card el-week">
      <div className="el-week-head">
        <h3 className="el-h3">Bảy ngày tới</h3>
        <p>Đăng nhập để đặt chỗ, hoặc để lại thông tin nếu bạn chưa có gói tập.</p>
      </div>

      <div className="el-week-body">
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
                <li key={`${item.starts_at}-${item.trainer_name}`} className="el-week-row">
                  <span className="el-week-when">
                    <span className="figures text-ink-2 text-xs">
                      {weekdayShort(item.starts_at)}
                    </span>
                    <span className="figures text-ink text-sm">
                      {formatTime(item.starts_at)}
                    </span>
                  </span>
                  <span className="el-week-what">
                    {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                    <span className="text-ink-2 ml-2">{item.trainer_name}</span>
                  </span>
                  <span className="el-week-badge">
                    {item.is_full ? (
                      <StatusBadge tone="critical">Hết chỗ</StatusBadge>
                    ) : (
                      <StatusBadge tone="positive">Còn chỗ</StatusBadge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Start here — ELLA's offer trio without prices. The big serif slot carries a
   confirmed figure (cancellation window, first-visit steps); package prices are
   pending and live on /goi-tap, which renders the backend's catalogue.
   ──────────────────────────────────────────────────────────────────────────── */
function StartHere() {
  return (
    <section className="el-section">
      <div className="gutter mx-auto max-w-(--container-page)">
        <SectionHead
          eyebrow="Bắt đầu"
          title="Bước đầu tiên của bạn"
          aside={
            <Link to="/goi-tap" className="el-chip-link">
              Xem gói tập <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        />
        <SwipeRow className="el-offers" label="Các cách bắt đầu" until="lg">
          <article className="el-card el-offer">
            <h3 className="el-h3">Lớp nhóm</h3>
            <p className="el-offer-desc">
              Tập đều đặn trên reformer cùng một nhóm nhỏ, mỗi người được chỉnh riêng.
            </p>
            <p className="el-offer-figure">
              <Figures display>{CANCELLATION_POLICY.group} giờ</Figures>
              <span>hạn hủy để được hoàn buổi</span>
            </p>
            <ul className="el-checks">
              <li>
                <Check aria-hidden="true" /> Gói tính theo số buổi và thời hạn
              </li>
              <li>
                <Check aria-hidden="true" /> Tự đặt, đổi, hủy lớp trong tài khoản
              </li>
              <li>
                <Check aria-hidden="true" /> Giá gói:{" "}
                <PendingFact label="Giá gói lớp nhóm" />
              </li>
            </ul>
            <Button asChild variant="primary" size="lg" fullWidth className="el-btn">
              <Link to="/lich-tap">Xem lịch lớp nhóm</Link>
            </Button>
          </article>

          <article className="el-card el-offer el-offer-featured" data-field="dark">
            <h3 className="el-h3">Buổi tư vấn</h3>
            <p className="el-offer-desc">
              Bắt đầu bằng một cuộc trò chuyện, không phải một gói tập. Studio nghe tình
              trạng của bạn trước khi đề xuất.
            </p>
            <p className="el-offer-figure">
              <Figures display>{FIRST_VISIT_STEPS.length} bước</Figures>
              <span>từ lúc để lại thông tin đến khi tự đặt lớp</span>
            </p>
            <ul className="el-checks">
              <li>
                <Check aria-hidden="true" /> Không cần tài khoản
              </li>
              <li>
                <Check aria-hidden="true" /> Nhân viên gọi lại để tư vấn
              </li>
              <li>
                <Check aria-hidden="true" /> Gợi ý hình thức lớp phù hợp
              </li>
            </ul>
            <Button asChild size="lg" fullWidth className="el-btn el-btn-light">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          </article>

          <article className="el-card el-offer el-offer-outlined">
            <span className="el-badge">Gợi ý cho buổi đầu với reformer</span>
            <h3 className="el-h3">Lớp riêng</h3>
            <p className="el-offer-desc">
              Một học viên, một huấn luyện viên. Bài tập dựng theo cơ thể bạn.
            </p>
            <p className="el-offer-figure">
              <Figures display>{CANCELLATION_POLICY.private} giờ</Figures>
              <span>hạn hủy để được hoàn buổi</span>
            </p>
            <ul className="el-checks">
              {PRIVATE_FIT.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="primary" size="lg" fullWidth className="el-btn">
              <Link to="/dich-vu">Tìm hiểu lớp riêng</Link>
            </Button>
          </article>
        </SwipeRow>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Room panel — ELLA's photo-and-spec panel, holding the actual room. The
   photograph shows reformers in rows; the copy says exactly that.
   ──────────────────────────────────────────────────────────────────────────── */
function RoomPanel() {
  return (
    <section className="el-section">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="el-card el-panel">
          <div className="el-panel-photo">
            <ArtDirectedImage photo="room" sizes="(min-width: 768px) 40vw, 100vw" />
          </div>
          <div className="el-panel-copy">
            <p className="label-micro el-eyebrow">Phòng tập</p>
            <h2 className="el-h2">Các máy đặt song song, có lối đi giữa từng máy.</h2>
            <p>
              Phòng tập được bố trí quanh các máy reformer đặt song song, để huấn luyện viên
              đi được giữa các máy và nhìn thấy cả hai bên cơ thể của mỗi người.
            </p>
            <ul className="el-specs">
              <SpecRow icon={Rows3} label="Bố trí">
                Reformer xếp thành hàng, lối đi giữa các máy
              </SpecRow>
              <SpecRow icon={Users} label="Hình thức">
                Lớp nhóm nhỏ và lớp riêng, một huấn luyện viên mỗi buổi
              </SpecRow>
              <SpecRow icon={MapPin} label="Địa chỉ">
                {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
              </SpecRow>
            </ul>
            <Link to="/gioi-thieu" className="el-pill-dark">
              Xem studio <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   FAQ — only questions the product can answer today. What-to-bring, trial
   lessons and waitlist behaviour (Q7) are deliberately absent.
   ──────────────────────────────────────────────────────────────────────────── */
function Faq() {
  return (
    <section className="el-section el-section-last">
      <div className="gutter mx-auto max-w-(--container-page)">
        <SectionHead
          eyebrow="Câu hỏi thường gặp"
          title="Hỏi & đáp"
          intro="Những điều người mới thường muốn biết trước khi đến studio."
        />
        <div className="el-faqs">
          <FaqItem
            icon={CircleHelp}
            question="Tôi chưa từng tập reformer, có bắt đầu được không?"
          >
            <p>
              Được. Bạn không cần biết gì trước khi đến. Lớp riêng phù hợp với buổi tập đầu
              tiên trên reformer, và studio sẽ tư vấn hình thức sau khi nghe tình trạng của
              bạn.
            </p>
          </FaqItem>
          <FaqItem icon={MessageCircle} question="Bắt đầu như thế nào?">
            <ol>
              {FIRST_VISIT_STEPS.map((step) => (
                <li key={step.index}>
                  <strong>{step.title}.</strong> {step.body}
                </li>
              ))}
            </ol>
          </FaqItem>
          <FaqItem icon={Package} question="Gói tập hoạt động thế nào?">
            <p>
              Mỗi gói có một số buổi cụ thể và một ngày hết hạn. Hệ thống trừ buổi khi bạn
              đặt lớp và hoàn lại nếu bạn hủy đúng hạn. Bảng giá hiện hành nằm ở trang{" "}
              <Link to="/goi-tap">Gói tập</Link>.
            </p>
          </FaqItem>
          <FaqItem icon={CalendarCheck} question="Tôi đặt lớp như thế nào?">
            <p>
              Từ buổi thứ hai trở đi, bạn tự đặt, đổi hoặc hủy lớp trong tài khoản của mình.{" "}
              <Link to="/lich-tap">Lịch tập</Link> cho biết lớp nào còn chỗ.
            </p>
          </FaqItem>
          <FaqItem icon={Repeat} question="Tôi có thể hủy buổi đã đặt không?">
            <p>
              Có. Hủy trước <Figures>{CANCELLATION_POLICY.group}</Figures> giờ với lớp nhóm
              và <Figures>{CANCELLATION_POLICY.private}</Figures> giờ với lớp riêng, tính
              đến giờ bắt đầu, để được hoàn lại buổi tập. Hủy muộn hơn thì buổi không được
              hoàn.
            </p>
          </FaqItem>
          <FaqItem icon={MapPin} question="Studio ở đâu và mở cửa lúc nào?">
            <p>
              Địa chỉ: {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}. Giờ mở
              cửa: {STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}. Bạn có thể{" "}
              <Link to="/dat-tu-van">để lại số điện thoại</Link> để studio liên hệ.
            </p>
          </FaqItem>
        </div>
      </div>
    </section>
  );
}
