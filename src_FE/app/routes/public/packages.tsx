import { Link } from "react-router";

import { Button } from "~/ui/button";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";

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
 * Prices for the Nha Trang branch have not been supplied, and the Đà Nẵng
 * branch's prices are not this studio's prices. Rather than print a plausible
 * table, this page explains exactly how a package works — which is confirmed
 * product behaviour — and routes the visitor to a real conversation.
 */
export default function Packages() {
  return (
    <>
      <PublicPageHeader
        label="Gói tập"
        title="Gói tính theo số buổi và thời hạn."
        lede="Mỗi gói có một số buổi cụ thể và một ngày hết hạn. Hệ thống trừ buổi khi bạn đặt lớp và hoàn lại nếu bạn hủy đúng hạn."
      />

      <Section index="01" label="Cách gói tập hoạt động">
        <dl className="pb-20 md:pb-28">
          {[
            {
              term: "Số buổi",
              def: "Mỗi lần đặt lớp thành công sẽ trừ số buổi tương ứng khỏi gói của bạn. Toàn bộ lịch sử cộng/trừ đều được ghi lại và bạn xem được trong tài khoản.",
            },
            {
              term: "Thời hạn",
              def: "Gói có ngày bắt đầu và ngày hết hạn. Buổi chưa dùng đến sau ngày hết hạn được xử lý theo quy định của studio.",
            },
            {
              term: "Hủy và hoàn buổi",
              def: "Hủy trước hạn quy định của từng hình thức lớp thì buổi được hoàn lại vào gói. Hủy muộn hơn thì không.",
            },
            {
              term: "Gia hạn",
              def: "Khi gói sắp hết buổi hoặc sắp hết hạn, nhân viên studio sẽ chủ động liên hệ với bạn.",
            },
          ].map(({ term, def }) => (
            <div key={term} className="rule-t grid gap-x-8 gap-y-2 py-6 md:grid-cols-12">
              <dt className="text-ink text-lg md:col-span-4">{term}</dt>
              <dd className="measure text-ink-2 text-sm md:col-span-7 md:col-start-6">
                {def}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section index="02" label="Bảng giá" tone="deep">
        <div className="grid gap-x-8 gap-y-8 pb-20 md:grid-cols-12 md:pb-28">
          <div className="md:col-span-7">
            <h2 className="font-display text-d3 text-ink font-light">
              Bảng giá hiện hành được studio gửi trực tiếp.
            </h2>
            <p className="measure text-ink-2 mt-5 text-base">
              Số buổi, thời hạn và mức giá thay đổi theo từng đợt. Để lại số điện thoại,
              nhân viên sẽ gửi bảng giá đang áp dụng cùng gợi ý gói phù hợp với lịch của
              bạn.
            </p>
            <div className="mt-8">
              <Button asChild variant="lacquer" size="lg">
                <Link to="/dat-tu-van">Nhận bảng giá</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
