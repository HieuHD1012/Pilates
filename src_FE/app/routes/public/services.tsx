import type { ReactNode } from "react";
import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { ArrowLink } from "~/ui/arrow-link";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";
import { SectionRail } from "~/ui/public-page";

import type { Route } from "./+types/services";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Hình thức tập — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Lớp nhóm nhỏ (Group) và lớp riêng (Private) trên máy reformer tại Soul Pilates Nha Trang.",
    },
  ];
}

type ClassFormat = (typeof CLASS_FORMATS)[number];

function formatById(id: ClassFormat["id"]): ClassFormat {
  const format = CLASS_FORMATS.find((candidate) => candidate.id === id);
  if (!format) throw new Error(`Missing class format: ${id}`);
  return format;
}

const GROUP = formatById("group");
const PRIVATE = formatById("private");

export default function Services() {
  return (
    <>
      <section className="bg-sand">
        <div className="gutter mx-auto max-w-(--container-page)">
          <div className="pt-12 pb-20 md:pt-20 md:pb-28">
            <div className="max-w-[52rem]">
              <p className="label-micro text-copper">Hình thức tập</p>
              <h1 className="font-display text-d1 text-ink mt-5 font-light">
                Tập cùng nhau. <em className="text-copper font-light">Hay dành riêng cho bạn.</em>
              </h1>
              <p className="measure text-lede text-ink-2 mt-6">
                Chọn nhịp chung của một lớp nhóm hoặc dành trọn buổi cho mục tiêu của mình.
                Studio sẽ giúp bạn chọn nếu đây là lần đầu.
              </p>
            </div>
            <div className="mt-12 grid gap-12 md:mt-16 md:grid-cols-2 md:gap-6">
              <div>
                <div className="aspect-4/3 overflow-hidden md:aspect-3/2">
                  <ArtDirectedImage photo="group" priority sizes="(min-width: 768px) 50vw, 100vw" />
                </div>
                <FormatCopy format={GROUP} />
              </div>
              <div>
                <div className="aspect-4/3 overflow-hidden md:aspect-3/2">
                  <ArtDirectedImage photo="private" sizes="(min-width: 768px) 50vw, 100vw" />
                </div>
                <FormatCopy format={PRIVATE} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section index="01" label="So sánh" tone="deep">
        <div className="grid grid-cols-1 gap-y-10 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <SectionRail title="Đặt cạnh nhau.">
            <p className="measure text-ink-2 mt-5 text-base">
              Mỗi gói tập gắn với một hình thức. Chưa chắc nên chọn gì, studio sẽ tư vấn khi
              gọi lại.
            </p>
          </SectionRail>
          <div className="lg:col-span-8">
            <ComparisonTable />
            <p className="text-ink-2 mt-5 text-sm">
              Hủy sau mốc trên thì buổi không được hoàn và không đổi được giờ.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="ink" className="pb-16 md:pb-24">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h2 className="font-display text-d2 text-sand max-w-[16em] font-light">
            Chưa chắc nên bắt đầu bằng hình thức nào?
          </h2>
          <div>
            <Button asChild size="lg" className="bg-sand text-ink hover:bg-paper">
              <Link to="/dat-tu-van">Nhận tư vấn</Link>
            </Button>
            <p className="text-sand/75 mt-3 text-sm">
              Studio gọi lại để hỏi tình trạng của bạn.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function FormatCopy({ format }: { format: ClassFormat }) {
  return (
    <div className="mt-8">
      <div className="border-rule flex items-baseline justify-between gap-4 border-t pt-5">
        <p className="label-micro text-copper">{format.sub}</p>
      </div>
      <h2 className="font-display text-d2 text-ink mt-2 font-light">{format.name}</h2>
      <p className="text-ink mt-2 text-sm font-medium">{format.size}</p>
      <p className="measure text-ink-2 mt-4 text-base">{format.body}</p>
      <ul className="mt-6 max-w-[36em]">
        {format.forWho.map((item) => (
          <li
            key={item}
            className="rule-b text-ink first:border-rule py-3 text-base first:border-t"
          >
            {item}
          </li>
        ))}
      </ul>
      {/* Soul's best shortcut: each format opens the timetable already
          filtered to it, instead of making the visitor filter again. */}
      <div className="mt-4">
        <ArrowLink to={`/lich-tap?loai=${format.id === "private" ? "rieng" : "nhom"}`}>
          Xem lịch {format.name.toLowerCase()}
        </ArrowLink>
      </div>
    </div>
  );
}

const ROWS: { label: string; group: ReactNode; private: ReactNode }[] = [
  {
    label: "Sĩ số",
    group: GROUP.size,
    private: PRIVATE.size,
  },
  {
    label: "Bài tập",
    group: "Cùng một bài, chỉnh riêng từng người",
    private: "Dựng theo tình trạng và mục tiêu của bạn",
  },
  {
    label: "Hủy để được hoàn buổi",
    group: (
      <>
        Trước giờ học ít nhất <Figures>{CANCELLATION_POLICY.group}</Figures> giờ
      </>
    ),
    private: (
      <>
        Trước giờ học ít nhất <Figures>{CANCELLATION_POLICY.private}</Figures> giờ
      </>
    ),
  },
];

/**
 * A real table from `sm` up. On a phone each row becomes a labelled block; the
 * column names travel with each value instead of a header row that scrolls away.
 */
function ComparisonTable() {
  return (
    <table className="w-full border-collapse text-base">
      <thead className="hidden sm:table-header-group">
        <tr>
          <th className="w-1/4 pb-4" />
          <th className="font-display text-ink w-3/8 pb-4 text-left text-2xl font-normal">
            {GROUP.name}
          </th>
          <th className="font-display text-ink w-3/8 pb-4 text-left text-2xl font-normal">
            {PRIVATE.name}
          </th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr
            key={row.label}
            className="border-rule-2 block border-t py-4 last:border-b sm:table-row sm:py-0"
          >
            <th
              scope="row"
              className="text-ink block text-left font-medium sm:table-cell sm:py-4 sm:pr-6 sm:align-top"
            >
              {row.label}
            </th>
            <td className="text-ink-2 block pt-2 sm:table-cell sm:py-4 sm:pr-6 sm:align-top">
              <span className="label-micro text-copper block sm:hidden">{GROUP.name}</span>
              {row.group}
            </td>
            <td className="text-ink-2 block pt-2 sm:table-cell sm:py-4 sm:align-top">
              <span className="label-micro text-copper block sm:hidden">
                {PRIVATE.name}
              </span>
              {row.private}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
