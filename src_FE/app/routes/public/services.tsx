import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { BookingBand } from "~/features/public/booking-band";
import { FORMAT_ANCHOR, FormatGuide } from "~/features/public/format-guide";
import { cn } from "~/lib/cn";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Figures } from "~/ui/figure";
import { PublicPageHeader } from "~/ui/public-page";

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

/**
 * Each format is one frosted chapter beside one real photograph. The room
 * (machines side by side) sits beside the group format; one person on one
 * reformer sits beside the private format. Neither frame is captioned as a
 * class in progress, because neither shows one.
 */
const FORMAT_MEDIA = {
  group: {
    photo: "room",
    note: "Phòng tập: các máy reformer đặt song song.",
    tag: "Nhóm nhỏ",
  },
  private: {
    photo: "practice",
    note: "Một người, một máy reformer, ánh sáng cửa sổ của phòng tập.",
    tag: "Một kèm một",
  },
} as const;

export default function Services() {
  return (
    <>
      <PublicPageHeader
        label="Hình thức tập"
        title="Nhóm nhỏ, hoặc một kèm một."
        lede="Hai hình thức, cùng một phương pháp. Khác nhau ở mức độ điều chỉnh riêng cho cơ thể bạn."
      />

      <div className="pl-section pl-section--tight space-y-8 md:space-y-12">
        {CLASS_FORMATS.map((format, index) => {
          const media = FORMAT_MEDIA[format.id];
          return (
            <section
              key={format.id}
              id={FORMAT_ANCHOR[format.id]}
              aria-labelledby={`${format.id}-tieu-de`}
              className="gutter mx-auto max-w-(--container-page) scroll-mt-28"
            >
              <div className="pl-card grid overflow-hidden md:grid-cols-12">
                <div
                  className={cn(
                    "pl-format-media-col md:col-span-5",
                    index % 2 === 1 && "md:order-2 md:col-start-8",
                  )}
                >
                  <div className="pl-format-media">
                    <ArtDirectedImage
                      photo={media.photo}
                      sizes="(min-width: 768px) 40vw, 100vw"
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "pl-card-pad md:col-span-7 md:py-14",
                    index % 2 === 1
                      ? "md:order-1 md:col-span-7 md:col-start-1 md:pl-14"
                      : "md:pr-14 md:pl-12",
                  )}
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="pl-tag">{format.sub}</span>
                    <span className="pl-tag">Reformer</span>
                    <span className="pl-tag">{media.tag}</span>
                  </div>
                  <h2 id={`${format.id}-tieu-de`} className="pl-h2 text-ink mt-6">
                    {format.name}
                  </h2>
                  <p className="measure text-ink-2 mt-5 text-base">{format.body}</p>

                  <p className="label-micro mt-9">Phù hợp với</p>
                  <ul className="pl-list mt-2">
                    {format.forWho.map((item) => (
                      <li key={item} className="text-ink text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-ink-2 mt-6 text-xs">
                    Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với
                    giờ bắt đầu để được hoàn lại buổi tập.
                  </p>
                  <p className="text-ink-2 mt-2 text-xs italic">Ảnh: {media.note}</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <FormatGuide />

      <div className="pl-section">
        <BookingBandSpacer />
      </div>
      <BookingBand title="Chưa chắc nên bắt đầu bằng hình thức nào? Studio sẽ cùng bạn chọn." />
    </>
  );
}

/** A quiet cream pause between the two dark fields (guide, booking band). */
function BookingBandSpacer() {
  return (
    <div className="gutter mx-auto flex max-w-(--container-page) flex-col items-center gap-5 text-center">
      <p className="measure text-ink-2 text-base">
        Gói tập được ghi nhận vào hồ sơ của bạn cùng số buổi và thời hạn cụ thể.
      </p>
      <Link to="/goi-tap" className="pl-link">
        Xem các gói tập <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
