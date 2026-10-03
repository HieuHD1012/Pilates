import { Link } from "react-router";

import { CANCELLATION_POLICY } from "~/content/studio";
import { usePublicPackages } from "~/features/public/queries";
import { formatRatio } from "~/features/public/schedule-ui";
import { cn } from "~/lib/cn";
import type { PublicPackage } from "~/lib/api/schema";
import { decimalToNumber, formatNumber, formatVnd } from "~/lib/format";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { PublicPageHeader, SectionRail } from "~/ui/public-page";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/packages";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Gói tập — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Gói tập tại Soul Pilates Nha Trang được tính theo số buổi và thời hạn sử dụng. Liên hệ studio để nhận bảng giá hiện hành.",
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
        lede="Mỗi gói gắn với một hình thức lớp, có số buổi cụ thể và ngày hết hạn. Gói được studio ghi nhận sau khi tư vấn; trang này chưa bán gói trực tuyến."
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
        <div className="grid grid-cols-1 gap-y-10 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <SectionRail title="Các gói đang mở bán">
            <p className="measure text-ink-2 mt-5 text-base">
              Danh sách lấy từ hệ thống của studio. Gói chưa có giá hiện “Đang cập nhật”,
              không bao giờ hiện số 0.
            </p>
          </SectionRail>
          <div className="lg:col-span-8">
            <PriceList />
          </div>
        </div>
      </Section>

      <Section index="02" label="Hủy, hoàn buổi và gia hạn" className="pt-20 md:pt-28">
        <div className="grid grid-cols-1 gap-y-10 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <SectionRail title="Điều nên biết trước khi mua." />
          <dl className="lg:col-span-8">
            {TERMS.map(({ term, def }) => (
              <div
                key={term}
                className="rule-t last:border-rule grid gap-1 py-5 last:border-b sm:grid-cols-[11rem_1fr] sm:gap-6"
              >
                <dt className="text-ink text-base font-medium">{term}</dt>
                <dd className="measure text-ink-2 text-base">{def}</dd>
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
  const baseline = rows.map(perSession).find((value) => value !== null) ?? null;

  return (
    <section aria-label={type === "PRIVATE" ? "Gói lớp riêng" : "Gói lớp nhóm"}>
      <div className="flex items-baseline justify-between gap-4 pb-4">
        <h3 className="font-display text-ink text-2xl font-light">
          {type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
        </h3>
        <span className="figures-display text-copper-bright text-2xl leading-none">
          {formatRatio(type)}
        </span>
      </div>
      <ul className="border-rule-2 border-t">
        {rows.map((pack) => {
          const price = decimalToNumber(pack.price);
          const each = perSession(pack);
          const saving =
            each !== null && baseline !== null && baseline > 0
              ? Math.round((1 - each / baseline) * 100)
              : 0;
          return (
            <li
              key={`${pack.name}-${pack.credits}`}
              className="rule-b grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-5"
            >
              <div className="min-w-0">
                <p className="text-ink text-lg font-medium">{pack.name}</p>
                <p className="text-ink-2 mt-1 text-sm">
                  <Figures>{formatNumber(pack.credits)}</Figures> buổi · dùng trong{" "}
                  <Figures>{formatNumber(pack.duration_days)}</Figures> ngày
                  {saving >= 1 ? (
                    <span className="bg-copper-wash text-copper-2 ml-2 inline-block rounded-xs px-1.5 py-px text-xs font-medium">
                      Tiết kiệm {saving}%
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="text-right">
                {/* A price of 0 is a price; only a missing one is pending. */}
                {price !== null ? (
                  <>
                    <p className="figures text-ink text-xl">{formatVnd(price)}</p>
                    {each !== null ? (
                      <p className="text-ink-2 mt-1 text-sm">
                        <Figures>{formatVnd(Math.round(each))}</Figures> / buổi
                      </p>
                    ) : null}
                  </>
                ) : (
                  <PendingFact label={`Giá gói ${pack.name}`} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
