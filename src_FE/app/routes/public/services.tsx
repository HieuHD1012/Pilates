import { ArrowRight, CalendarCheck, Check, Clock, Repeat, UserCheck } from "lucide-react";
import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { ClosingCard, SectionHead, SpecRow } from "~/features/public/ella-blocks";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";

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

const FORMAT_NOTE = { group: "Nhóm nhỏ", private: "Một kèm một" } as const;

export default function Services() {
  return (
    <>
      <section className="el-section el-page-lead">
        <div className="gutter mx-auto max-w-(--container-page)">
          <SectionHead
            as="h1"
            eyebrow="Hình thức tập"
            title="Nhóm nhỏ, hoặc một kèm một."
            intro="Hai hình thức, cùng một phương pháp. Khác nhau ở mức độ điều chỉnh riêng cho cơ thể bạn."
          />
          <div className="el-formats el-formats-lg">
            {CLASS_FORMATS.map((format) => (
              <article
                key={format.id}
                className="el-card el-format"
                data-format={format.id}
              >
                <div className="el-format-top">
                  <span className="el-tag" data-format={format.id}>
                    {format.sub}
                  </span>
                  <span className="el-format-note">{FORMAT_NOTE[format.id]}</span>
                </div>
                <h2 className="el-h3 el-h3-lg">{format.name}</h2>
                <p>{format.body}</p>
                <p className="el-format-fit-label">Phù hợp khi bạn</p>
                <ul className="el-checks">
                  {format.forWho.map((item) => (
                    <li key={item}>
                      <Check aria-hidden="true" /> {item}
                    </li>
                  ))}
                </ul>
                <p className="el-format-foot">
                  <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>
                    Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với
                    giờ bắt đầu để được hoàn lại buổi tập
                  </span>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="el-section">
        <div className="gutter mx-auto max-w-(--container-page)">
          <div className="el-card el-panel el-panel-wide">
            <div className="el-panel-photo">
              <ArtDirectedImage photo="hero" sizes="(min-width: 768px) 45vw, 100vw" />
            </div>
            <div className="el-panel-copy">
              <p className="label-micro el-eyebrow">Trên reformer</p>
              <h2 className="el-h2">Cùng một máy, hai mức điều chỉnh.</h2>
              <p>
                Cả hai hình thức đều diễn ra trên máy reformer trong cùng một phòng tập.
                Điều khác nhau là bài tập được dựng cho cả nhóm hay cho riêng bạn.
              </p>
              <ul className="el-specs">
                <SpecRow icon={UserCheck} label="Huấn luyện viên">
                  Đúng một người phụ trách mỗi buổi
                </SpecRow>
                <SpecRow icon={Repeat} label="Hủy và hoàn buổi">
                  Lớp nhóm trước <Figures>{CANCELLATION_POLICY.group}</Figures> giờ, lớp
                  riêng trước <Figures>{CANCELLATION_POLICY.private}</Figures> giờ
                </SpecRow>
                <SpecRow icon={CalendarCheck} label="Đặt lịch">
                  Tự đặt, đổi hoặc hủy lớp trong tài khoản
                </SpecRow>
              </ul>
              <Link to="/lich-tap" className="el-pill-dark">
                Xem lịch tập <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="el-section el-section-last">
        <div className="gutter mx-auto max-w-(--container-page)">
          <ClosingCard
            title="Chưa chắc nên bắt đầu bằng hình thức nào?"
            body="Để lại tên và số điện thoại. Studio sẽ nghe nhu cầu của bạn trước khi gợi ý hình thức tập."
          >
            <Button asChild size="lg" className="el-btn el-btn-light">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          </ClosingCard>
        </div>
      </section>
    </>
  );
}
