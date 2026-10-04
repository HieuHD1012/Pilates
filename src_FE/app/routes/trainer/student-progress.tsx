import { Link, useParams } from "react-router";
import { ProgressGallery } from "~/features/people/photo-gallery";

export function meta() {
  return [
    { title: "Tiến trình học viên — J Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

export default function StudentProgress() {
  const { studentId = "" } = useParams();
  const id = Number(studentId);
  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <Link to="/hlv/lich-day" className="text-ink-2 text-sm underline underline-offset-4">
        Lịch dạy
      </Link>
      <h1 className="text-ink mt-5 text-xl font-medium">Tiến trình học viên</h1>
      {Number.isSafeInteger(id) && id > 0 ? (
        <div className="mt-6">
          <ProgressGallery studentId={id} />
        </div>
      ) : (
        <p role="alert">Đường dẫn học viên không hợp lệ.</p>
      )}
    </div>
  );
}
