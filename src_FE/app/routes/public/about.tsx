import {
  ArrowRight,
  Hand,
  MapPin,
  PanelsTopLeft,
  Rows3,
  UserCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import { STUDIO } from "~/content/studio";
import {
  ClosingCard,
  IconChip,
  SectionHead,
  SpecRow,
  SwipeRow,
} from "~/features/public/ella-blocks";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { PendingFact } from "~/ui/pending-fact";

import type { Route } from "./+types/about";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Studio — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Soul Pilates Nha Trang: studio reformer với lớp nhóm nhỏ và lớp riêng, tập trung vào căn chỉnh và kiểm soát chuyển động.",
    },
  ];
}

const PRINCIPLES = [
  {
    icon: Users,
    term: "Lớp nhỏ",
    def: "Số chỗ mỗi buổi do studio đặt cho từng lớp, và không được vượt qua — kể cả khi có người muốn tập thêm.",
  },
  {
    icon: UserCheck,
    term: "Một huấn luyện viên cho mỗi buổi",
    def: "Người dạy buổi của bạn là người chịu trách nhiệm cho buổi đó, từ đầu đến cuối.",
  },
  {
    icon: Hand,
    term: "Chỉnh trước, đi tiếp sau",
    def: "Nếu một động tác chưa đúng, buổi tập dừng lại ở đó và chỉnh, thay vì đi tiếp cho đủ bài.",
  },
] as const;

export default function About() {
  return (
    <>
      <section className="el-section el-page-lead">
        <div className="gutter mx-auto max-w-(--container-page)">
          <SectionHead
            as="h1"
            eyebrow="Studio"
            title="Một phòng tập được giữ nhỏ, có chủ đích."
            intro="Soul Pilates Nha Trang chọn số lượng người trong mỗi buổi tập trước khi chọn bất cứ điều gì khác."
          />
          <div className="el-card el-panel">
            <div className="el-panel-photo">
              <ArtDirectedImage
                photo="room"
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
              />
            </div>
            <div className="el-panel-copy">
              <p className="label-micro el-eyebrow">Không gian</p>
              <h2 className="el-h2">Các máy đặt song song, có lối đi giữa từng máy.</h2>
              <p>
                Phòng tập được bố trí quanh các máy reformer đặt song song, để huấn luyện
                viên đi được giữa các máy và nhìn thấy cả hai bên cơ thể của mỗi người.
              </p>
              <ul className="el-specs">
                <SpecRow icon={Rows3} label="Bố trí">
                  Reformer xếp thành hàng, lối đi giữa các máy
                </SpecRow>
                <SpecRow icon={PanelsTopLeft} label="Ánh sáng">
                  Cửa sổ lớn với rèm trắng
                </SpecRow>
                <SpecRow icon={MapPin} label="Địa chỉ">
                  {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
                </SpecRow>
              </ul>
              <Link to="/dich-vu" className="el-pill-dark">
                Xem hình thức tập <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="el-section">
        <div className="gutter mx-auto max-w-(--container-page)">
          <SectionHead eyebrow="Nguyên tắc" title="Ba điều studio giữ" />
          <SwipeRow className="el-benefits el-benefits-3" label="Nguyên tắc của studio">
            {PRINCIPLES.map(({ icon, term, def }) => (
              <article key={term} className="el-card el-benefit">
                <IconChip icon={icon} />
                <h3 className="el-h3">{term}</h3>
                <p>{def}</p>
              </article>
            ))}
          </SwipeRow>
        </div>
      </section>

      <section className="el-section">
        <div className="gutter mx-auto max-w-(--container-page)">
          <div className="el-card el-panel el-panel-pair">
            <div className="el-pair">
              <div>
                <ArtDirectedImage photo="method" sizes="(min-width: 768px) 22vw, 50vw" />
              </div>
              <div>
                <ArtDirectedImage photo="practice" sizes="(min-width: 768px) 22vw, 50vw" />
              </div>
            </div>
            <div className="el-panel-copy">
              <p className="label-micro el-eyebrow">Trong một động tác</p>
              <h2 className="el-h2">Từ thu lại đến vươn ra.</h2>
              <p>
                Hai khoảnh khắc của cùng một động tác trên ghế Pilates. Phương pháp không
                nằm ở tư thế cuối cùng, mà ở cách bạn kiểm soát đoạn đường giữa chúng.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="el-section el-section-last">
        <div className="gutter mx-auto max-w-(--container-page)">
          <ClosingCard
            title="Bắt đầu bằng một cuộc gọi, không phải một gói tập."
            body="Để lại tên và số điện thoại. Studio sẽ liên hệ để nghe tình trạng của bạn trước khi đề xuất bất cứ điều gì."
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
