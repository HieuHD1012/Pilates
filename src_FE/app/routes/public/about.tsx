import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Link } from "react-router";

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

export default function About() {
  return (
    <>
      <header className="rem-interior-head"><p className="rem-kicker">Studio</p><h1>Một nơi để trở về với chuyển động.</h1><p>Không gian và cách bắt đầu đều cần đủ rõ để bạn thấy thoải mái trước khi đặt buổi tập đầu tiên.</p></header>
      <section className="rem-room-stage"><div><ArtDirectedImage photo="room" priority sizes="(min-width: 800px) 60vw, 100vw" /></div><div className="rem-room-copy"><p className="rem-kicker">Không gian tập</p><h2>Máy tập, ánh sáng, khoảng để tập trung.</h2><p>Nhìn nơi bạn sẽ tập, rồi chọn cách bắt đầu phù hợp với mình.</p><Link className="rem-link" to="/dich-vu">Xem hai hình thức tập ↗</Link></div></section>
      <section className="rem-service-row"><div><p className="rem-kicker">Buổi đầu</p><h2>Bắt đầu bằng một cuộc trò chuyện.</h2></div><div><p>Bạn để lại thông tin, studio liên hệ để nghe nhu cầu và gợi ý hình thức tập phù hợp. Bạn có thể xem lịch trước khi quyết định.</p><Link to="/dat-tu-van">Đặt lịch tư vấn ↗</Link></div></section>
    </>
  );
}
