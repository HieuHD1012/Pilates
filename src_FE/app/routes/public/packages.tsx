import { Link } from "react-router";

import { CANCELLATION_POLICY } from "~/content/studio";
import { usePublicPackages } from "~/features/public/queries";
import { formatRatio } from "~/features/public/schedule-ui";
import { cn } from "~/lib/cn";
import type { PublicPackage } from "~/lib/api/schema";
import { decimalToNumber, formatNumber, formatVnd } from "~/lib/format";
import { ArrowLink } from "~/ui/arrow-link";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { PublicPageHeader, SectionRail } from "~/ui/public-page";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/packages";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Gói tập — J Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Gói tập tại J Pilates Nha Trang được tính theo số buổi và thời hạn sử dụng. Liên hệ studio để nhận bảng giá hiện hành.",
    },
  ];
}

/**
 * The catalogue is the studio's, not ours.
 *
 * `GET /public/packages` returns what is actually on sale. A package whose
 * price the studio has not entered comes back with `price: null`, and that
 * renders as a waiting slot — never as 0, and never as a number invented to
 * finish the table. The explanation of how a package works stays above it:
 * that part is confirmed product behaviour and does not depend on the data.
 */
export default function Packages() {
  return (
    <>
      <PublicPageHeader
        label="Gói tập"
        title={
          <>
            Gói tính theo <em>số buổi</em> và <em>thời hạn</em>.
          </>
        }
        lede="Chọn gói theo hình thức tập, số buổi và thời hạn phù hợp với lịch của bạn. J Pilates sẽ tư vấn và hỗ trợ mua gói trực tiếp tại studio."
        aside={
          <>
            <Button asChild variant="copper" size="lg" fullWidth>
              <Link to="/dat-tu-van?tu=goi-tap">Nhận bảng giá và tư vấn gói</Link>
            </Button>
            <p className="text-ink-2 mt-3 text-sm">
              Studio gọi lại và gửi bảng giá đang áp dụng.
            </p>
          </>
        }
      />

      {/* The three parts of every package, before any price: this is confirmed
          product behaviour and holds whether or not the catalogue has loaded. */}
      <section className="bg-sand">
        <div className="gutter mx-auto max-w-(--container-page) pb-20 md:pb-28">
          <dl className="border-rule-2 grid border-y sm:grid-cols-3">
            {ANATOMY.map(({ term, rule, detail }, index) => (
              <div
                key={term}
                className={cn(
                  "py-7 sm:pr-6",
                  index > 0 && "border-rule border-t sm:border-t-0 sm:border-l sm:pl-6",
                )}
              >
                <dt className="font-display text-copper-bright text-[2.75rem] leading-[1.1] font-light">
                  {term}
                </dt>
                <dd className="mt-3">
                  <span className="text-ink block text-base font-medium">{rule}</span>
                  <span className="measure text-ink-2 mt-1 block text-base">{detail}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Section index="01" label="Bảng giá" tone="deep">
        {/* Pricing is the subject of this page, so it gets the full width: plans
            sit side by side as cards, read top to bottom inside each card and
            compared across cards at the same height. */}
        <div className="pb-20 md:pb-28">
          <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:gap-x-6">
            <h2 className="font-display text-d2 text-ink font-light lg:col-span-6">
              Các gói đang mở bán
            </h2>
            <p className="measure text-ink-2 text-base lg:col-span-5 lg:col-start-8 lg:self-end">
              So sánh số buổi, tổng giá và thời hạn trong từng hình thức tập. Giá mỗi buổi
              giúp bạn cân nhắc các gói; gói chưa có giá cần hỏi studio.
            </p>
          </div>
          <div className="mt-12">
            <PriceList />
          </div>
        </div>
      </Section>

      <Section index="02" label="Hủy, hoàn buổi và gia hạn" className="pt-20 md:pt-28">
        <div className="grid grid-cols-1 gap-y-10 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <SectionRail title="Điều nên biết trước khi mua." />
          {/* Four independent rules, each a heading and its sentence read
              together — not a two-column table that makes the eye travel from
              a label on the left to its meaning on the right. */}
          <dl className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8">
            {TERMS.map(({ term, def }) => (
              <div key={term} className="border-rule-2 border-t pt-4">
                <dt className="text-ink text-lg font-medium">{term}</dt>
                <dd className="measure text-ink-2 mt-1.5 text-base">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
    </>
  );
}

const ANATOMY = [
  {
    term: "Số buổi",
    rule: "Trừ 1 buổi mỗi lần đặt lớp",
    detail: "Mọi lần trừ và hoàn đều được ghi lại, bạn xem được trong tài khoản.",
  },
  {
    term: "Thời hạn",
    rule: "Có ngày bắt đầu và ngày hết hạn",
    detail: "Gói phải còn hiệu lực cả hôm nay và vào ngày của buổi học.",
  },
  {
    term: "Hình thức",
    rule: "Lớp nhóm hoặc lớp riêng",
    detail: "Gói lớp nhóm dùng cho lớp nhóm; gói lớp riêng dùng cho lớp riêng.",
  },
];

const TERMS = [
  {
    term: "Hủy đúng hạn",
    def: `Lớp nhóm: hủy trước ít nhất ${CANCELLATION_POLICY.group} giờ thì buổi được hoàn vào gói. Lớp riêng: trước ít nhất ${CANCELLATION_POLICY.private} giờ.`,
  },
  { term: "Hủy muộn", def: "Sau mốc trên, buổi không được hoàn và không đổi được giờ." },
  { term: "Studio hủy lớp", def: "Buổi đã đặt được hoàn vào gói; bạn chọn một buổi khác." },
  {
    term: "Gia hạn",
    def: "Khi gói còn ít buổi hoặc sắp hết hạn, nhân viên studio sẽ liên hệ với bạn.",
  },
];

function PriceList() {
  const query = usePublicPackages();

  return (
    <QueryBoundary
      query={query}
      skeletonRows={4}
      emptyTitle="Bảng giá đang được cập nhật"
      emptyDescription="Studio chưa mở bán gói nào trên trang này. Để lại số điện thoại, nhân viên sẽ gửi bảng giá đang áp dụng."
      emptyAction={
        <Button asChild variant="secondary">
          <Link to="/dat-tu-van?tu=goi-tap">Nhận bảng giá</Link>
        </Button>
      }
      errorDescription="Chưa tải được bảng giá. Bạn có thể thử lại, hoặc để lại thông tin để nhân viên gửi trực tiếp."
    >
      {(packages) => (
        <div className="flex flex-col gap-12">
          {(["GROUP", "PRIVATE"] as const).map((type) => {
            const rows = packages
              .filter((pack) => pack.class_type === type)
              .sort((left, right) => left.credits - right.credits);
            if (rows.length === 0) return null;
            return <PriceGroup key={type} type={type} rows={rows} />;
          })}
        </div>
      )}
    </QueryBoundary>
  );
}

/**
 * Per-session price is the number that makes a larger package make sense, so
 * it is set as large as the total rather than greyed out beneath it. The
 * saving is computed from the studio's own catalogue — against the smallest
 * package of the same format that has a price — never against a list price
 * nobody published.
 */
function PriceGroup({ type, rows }: { type: "GROUP" | "PRIVATE"; rows: PublicPackage[] }) {
  const perSession = (pack: PublicPackage) => {
    const price = decimalToNumber(pack.price);
    return price === null || pack.credits <= 0 ? null : price / pack.credits;
  };
  const priced = rows.map(perSession).filter((value): value is number => value !== null);
  const baseline = priced[0] ?? null;
  const best =
    priced.length > 1 && priced.length === rows.length ? Math.min(...priced) : null;
  const formatLabel = type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm";

  return (
    <section aria-label={`Gói ${formatLabel.toLowerCase()}`}>
      <h3 className="flex items-baseline gap-3">
        <span className="font-display text-ink text-[1.75rem] font-light">
          {formatLabel}
        </span>
        <span className="figures-display text-copper text-[1.75rem] leading-none">
          {formatRatio(type)}
        </span>
      </h3>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((pack) => {
          const price = decimalToNumber(pack.price);
          const each = perSession(pack);
          const saving =
            each !== null && baseline !== null && baseline > 0
              ? Math.round((1 - each / baseline) * 100)
              : 0;
          const isBest = best !== null && each === best;
          return (
            <li
              key={`${pack.name}-${pack.credits}`}
              className={cn(
                "bg-paper flex min-w-0 flex-col rounded-sm border p-5 sm:p-6",
                isBest ? "border-copper ring-copper ring-1" : "border-rule",
              )}
            >
              <p className="text-copper-2 min-h-6 text-sm font-medium">
                {isBest ? "Giá mỗi buổi thấp nhất" : <span aria-hidden="true">&nbsp;</span>}
              </p>

              {/* What you get: the number of sessions is the plan's identity. */}
              <h4 className="mt-2 flex items-baseline gap-2">
                <span className="figures-display text-ink text-[2.5rem] leading-none sm:text-[3rem]">
                  {formatNumber(pack.credits)}
                </span>
                <span className="text-ink text-lg">buổi</span>
              </h4>
              <p className="text-ink-2 mt-2 text-sm sm:min-h-12">{pack.name}</p>

              {/* What it costs, total first and the per-session price right
                  beneath it, so the comparison happens in one glance. */}
              <div className="border-rule mt-4 border-t pt-4 sm:mt-5 sm:min-h-32 sm:pt-5">
                <p className="text-ink-2 mb-1 text-sm">Tổng giá gói</p>
                {price !== null ? (
                  <>
                    <p className="figures text-ink text-xl sm:text-2xl">
                      {formatVnd(price)}
                    </p>
                    {each !== null ? (
                      <p className="text-ink mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base">
                        <span>
                          <Figures>{formatVnd(Math.round(each))}</Figures>
                          <span className="text-ink-2"> / buổi</span>
                        </span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-ink-2 text-base">
                    <PendingFact label={`Giá gói ${pack.name}`} />
                  </p>
                )}
              </div>

              {/* The terms that come with it. */}
              <ul className="text-ink-2 mt-4 flex flex-col gap-1.5 text-sm sm:mt-5">
                <li>
                  Dùng trong <Figures>{formatNumber(pack.duration_days)}</Figures> ngày
                </li>
                <li>Chỉ dùng cho {formatLabel.toLowerCase()}</li>
                {saving >= 1 ? (
                  <li>
                    Giá mỗi buổi thấp hơn {saving}% so với gói{" "}
                    {rows.find((p) => perSession(p) !== null)?.credits} buổi.
                  </li>
                ) : null}
              </ul>

              <div className="mt-auto pt-4 sm:pt-6">
                <ArrowLink
                  to={`/dat-tu-van?tu=goi-tap&goi=${encodeURIComponent(pack.name)}`}
                >
                  Tư vấn gói này<span className="sr-only">: {pack.name}</span>
                </ArrowLink>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
