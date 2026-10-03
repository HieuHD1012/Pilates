import { Link } from "react-router";

import { Button } from "~/ui/button";

/**
 * The closing ask of a public page (Pearl reference variant): a dark full-width
 * band, one statement, one outlined light button. Marked `data-page-ask` so the
 * header's identical button stands down while this one is on screen (P2).
 */
export function BookingBand({
  title = "Bắt đầu bằng một cuộc gọi, không phải một gói tập.",
  body = "Để lại tên và số điện thoại. Studio sẽ liên hệ để nghe tình trạng của bạn trước khi đề xuất bất cứ điều gì.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section data-field="dark" className="pl-dark">
      <div className="gutter mx-auto max-w-(--container-page) py-20 text-center md:py-28">
        <p className="pl-ruled pl-ruled--light justify-center">Đặt lịch tư vấn</p>
        <h2 className="pl-h2 text-sand mx-auto mt-6 max-w-[18em]">{title}</h2>
        <p className="measure text-sand/75 mx-auto mt-5 text-base">{body}</p>
        <div data-page-ask className="mt-9 flex justify-center">
          <Button asChild size="lg" className="pl-btn pl-btn-light">
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
