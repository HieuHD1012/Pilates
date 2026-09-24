import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { STUDENT_SECONDARY_NAV } from "~/content/nav";
import { ChangePasswordForm, MyProfileForm } from "~/features/auth/profile-forms";
import { useLogout } from "~/features/auth/use-logout";
import { useSession } from "~/features/auth/use-session";
import { useStudentPackages } from "~/features/commerce/queries";
import { useStudent } from "~/features/people/queries";
import { formatDate } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { Dialog, DialogContent } from "~/ui/dialog";
import { LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { Absent } from "~/ui/absent";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/account";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tài khoản — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/** One line of orientation per secondary destination, keyed by route. */
const SECONDARY_HINT: Record<string, string> = {
  "/hv/lich-su": "Buổi đã kết thúc, đã hủy hoặc bạn không đến",
};

/** An IsoDate carries no time; give it the studio offset before formatting. */
function studioDate(date: string): string {
  return formatDate(`${date}T00:00:00+07:00`);
}

export default function StudentAccount() {
  const session = useSession();
  // `GET /auth/me` is the only source of `student_id`; the studio's own record
  // for that person is a second request against it.
  const profile = useStudent(session.data?.student_id ?? null);
  const packages = useStudentPackages();
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <LiveRegion
        message={
          logout.isPending
            ? "Đang đăng xuất."
            : logout.isError
              ? "Đăng xuất không thành công. Vui lòng thử lại."
              : null
        }
      />

      <h1 className="text-ink text-xl font-medium">Tài khoản</h1>
      <p className="measure text-ink-2 mt-1 text-sm">
        Thông tin học viên của bạn tại studio, gói đang dùng và lối vào lịch sử đặt lớp.
      </p>

      <DemoDataNotice className="mt-5" />

      <section className="mt-7">
        <h2 className="text-ink text-sm font-medium">Thông tin học viên</h2>
        <div className="mt-3">
          <QueryBoundary
            query={profile}
            skeletonRows={4}
            errorDescription="Không tải được thông tin tài khoản của bạn."
          >
            {(student) => (
              <DetailList>
                <DetailRow label="Họ và tên">{student.full_name}</DetailRow>
                <DetailRow label="Số điện thoại">
                  {student.phone || <Absent>Chưa ghi</Absent>}
                </DetailRow>
                <DetailRow label="Email">
                  {student.email ?? <Absent>Chưa ghi</Absent>}
                </DetailRow>
                <DetailRow label="Học viên từ">
                  <Figures>{formatDate(student.created_at)}</Figures>
                </DetailRow>
              </DetailList>
            )}
          </QueryBoundary>
        </div>
        {/* Email is the login and only an admin may change it; the name and the
            phone are the account holder's own, and `PATCH /auth/me` writes them
            through to this studio record in the same transaction. */}
        <p className="measure text-ink-2 mt-3 text-xs">
          Email đăng nhập do studio quản lý. Cần đổi email, bạn nhắn cho lễ tân.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-medium">Sửa thông tin của bạn</h2>
        <div className="mt-3">
          {session.data ? (
            <MyProfileForm me={session.data} />
          ) : (
            <p className="text-ink-2 text-sm">Đang tải thông tin tài khoản.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-medium">Đổi mật khẩu</h2>
        <div className="mt-3">
          <ChangePasswordForm />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-ink text-sm font-medium">Gói đang dùng</h2>
        <div className="mt-3">
          <QueryBoundary
            query={packages}
            skeletonRows={3}
            emptyTitle="Bạn chưa có gói tập nào"
            emptyDescription="Liên hệ studio để được tư vấn gói phù hợp với lịch của bạn."
            errorDescription="Không tải được gói tập của bạn."
          >
            {(items) => {
              const active = items.find((item) => item.status === "ACTIVE") ?? null;

              if (!active) {
                return (
                  <p className="rule-t measure text-ink-2 pt-3 text-sm">
                    Hiện bạn không có gói nào đang dùng. Các gói đã kết thúc vẫn xem được ở
                    trang Gói tập.
                  </p>
                );
              }

              return (
                <DetailList>
                  <DetailRow label="Tên gói">{active.name_snapshot}</DetailRow>
                  <DetailRow label="Số buổi còn lại">
                    <span className="flex items-baseline gap-1.5">
                      <Figures className="text-ink">{active.balance_cached}</Figures>
                      <span className="text-ink-2 text-xs">
                        / <Figures>{active.credits_snapshot}</Figures> buổi
                      </span>
                    </span>
                  </DetailRow>
                  <DetailRow label="Hạn dùng">
                    <Figures>{studioDate(active.end_date)}</Figures>
                  </DetailRow>
                </DetailList>
              );
            }}
          </QueryBoundary>
        </div>
      </section>

      <nav aria-label="Trang liên quan" className="rule-t mt-8">
        <ul>
          {STUDENT_SECONDARY_NAV.map((item) => {
            const hint = SECONDARY_HINT[item.to];

            return (
              <li key={item.to} className="rule-b">
                <Link
                  to={item.to}
                  className="hover:bg-sand-deep/50 flex items-center justify-between gap-4 py-4 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="text-ink block text-sm">{item.label}</span>
                    {hint ? (
                      <span className="text-ink-2 mt-0.5 block text-xs">{hint}</span>
                    ) : null}
                  </span>
                  <ChevronRight aria-hidden="true" className="text-ink-3 size-4 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="rule-t mt-10 pt-5">
        <h2 className="text-ink text-sm font-medium">Đăng xuất</h2>
        <p className="measure text-ink-2 mt-1 text-sm">
          Thiết bị này sẽ cần đăng nhập lại để xem lịch và đặt lớp. Buổi đã đặt và gói tập
          của bạn không thay đổi.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => setConfirming(true)}>
          Đăng xuất
        </Button>
      </section>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title="Đăng xuất khỏi thiết bị này?"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={logout.isPending}
              >
                Quay lại
              </Button>
              {/* The label stays put while pending; the mutation navigates on
                  settle, so there is no state left on this screen to update. */}
              <Button
                variant="secondary"
                size="sm"
                pending={logout.isPending}
                onClick={() => logout.mutate()}
              >
                Xác nhận đăng xuất
              </Button>
            </>
          }
        >
          <p className="text-ink-2 text-sm">
            Bạn sẽ trở về trang đăng nhập. Nhập lại email cùng mật khẩu là vào được tài
            khoản này.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
