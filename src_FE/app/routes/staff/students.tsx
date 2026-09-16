import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { useCreateStudent, useStudents } from "~/features/people/queries";
import { StudentForm } from "~/features/people/student-form";
import type { StudentStatus, StudentSummary } from "~/lib/api/types";
import { formatDate, formatPhone } from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Field, Input, Select } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { FilterBar, PageHeader } from "~/ui/layout";
import { Absent } from "~/ui/absent";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/students";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Học viên — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

const STATUS: Record<StudentStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Đang học", tone: "positive" },
  expiring: { label: "Sắp hết hạn", tone: "attention" },
  expired: { label: "Hết hạn", tone: "critical" },
  inactive: { label: "Tạm nghỉ", tone: "neutral" },
};

const STATUS_ORDER: StudentStatus[] = ["active", "expiring", "expired", "inactive"];

/**
 * The student list.
 *
 * The winning subject is the person: the name column carries the only link, and
 * every other column is an attribute of that person's current package. The
 * renewal flag is a written marker rather than a coloured row — a list where
 * colour means "act on this" stops working the moment two things need acting on.
 *
 * Search is typed straight into the query key; `useStudents` keeps the previous
 * page of rows as placeholder data, so the table does not blank per keystroke.
 */
export default function StaffStudents() {
  const [creating, setCreating] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "all">("all");
  const navigate = useNavigate();

  const query = useStudents(search, status);
  const items = query.data;
  const renewalCount = (items ?? []).filter((student) => student.renewalDue).length;
  const filtered = search.trim() !== "" || status !== "all";

  function clearFilters() {
    setSearch("");
    setStatus("all");
  }

  /** The row navigates; the name link inside it handles its own click. */
  function openStudent(event: React.MouseEvent<HTMLTableRowElement>, id: string) {
    if ((event.target as HTMLElement).closest("a")) return;
    void navigate(`/studio/hoc-vien/${id}`);
  }

  return (
    <div className="gutter py-6">
      <LiveRegion message={createdName ? `Đã tạo hồ sơ cho ${createdName}.` : null} />

      <PageHeader
        title="Học viên"
        description="Danh sách học viên của studio, gói đang dùng và số buổi còn lại."
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link to="/studio/gia-han">Danh sách cần gia hạn</Link>
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              Tạo học viên
            </Button>
          </>
        }
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Đang hiển thị</dt>
              <dd>
                {items ? (
                  <Figures className="text-ink">{items.length}</Figures>
                ) : (
                  <Placeholder />
                )}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Cần gia hạn</dt>
              <dd>
                {items ? (
                  <Figures className="text-ink">{renewalCount}</Figures>
                ) : (
                  <Placeholder />
                )}
              </dd>
            </div>
          </dl>
        }
      />

      <FilterBar
        trailing={
          <span className="text-ink-2 text-xs">
            {query.isFetching && !query.isPending ? "Đang cập nhật" : null}
          </span>
        }
      >
        <Field label="Tìm học viên" className="w-full sm:w-72">
          {({ id }) => (
            <Input
              id={id}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên hoặc số điện thoại"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Trạng thái" className="w-full sm:w-48">
          {({ id }) => (
            <Select
              id={id}
              value={status}
              onChange={(event) => setStatus(event.target.value as StudentStatus | "all")}
            >
              <option value="all">Tất cả</option>
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS[value].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FilterBar>

      <DemoDataNotice className="mb-3" />

      <QueryBoundary
        query={query}
        skeletonRows={8}
        emptyTitle={filtered ? "Không có học viên nào khớp bộ lọc" : "Chưa có học viên nào"}
        emptyDescription={
          filtered
            ? "Thử bỏ bớt từ khoá tìm kiếm hoặc chọn lại trạng thái."
            : "Học viên sẽ xuất hiện ở đây sau khi được ghi nhận trong hệ thống của studio."
        }
        emptyAction={
          filtered ? (
            <Button variant="secondary" onClick={clearFilters}>
              Bỏ bộ lọc
            </Button>
          ) : null
        }
        errorDescription="Không tải được danh sách học viên."
        showErrorDetail
      >
        {(students) => (
          <>
            {/* 1440 / 1024: the six comparable columns staff scan down. */}
            <div className="hidden lg:block">
              <DataTable caption="Danh sách học viên" minWidth="58rem">
                <thead>
                  <tr>
                    <Th>Tên</Th>
                    <Th>Điện thoại</Th>
                    <Th>Gói hiện tại</Th>
                    <Th numeric>Số buổi còn lại</Th>
                    <Th numeric>Hạn dùng</Th>
                    <Th>Trạng thái</Th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <Tr
                      key={student.id}
                      onClick={(event) => openStudent(event, student.id)}
                    >
                      <Td>
                        {/* A real link: the row click is a convenience, not the
                            only way in. Names wrap — they are never truncated. */}
                        <Link
                          to={`/studio/hoc-vien/${student.id}`}
                          className="text-ink decoration-rule-2 underline-offset-[6px] hover:underline"
                        >
                          {student.fullName}
                        </Link>
                      </Td>
                      <Td>
                        <Figures className="text-ink-2 whitespace-nowrap">
                          {formatPhone(student.phone)}
                        </Figures>
                      </Td>
                      <Td>{student.currentPackageName ?? <Absent>Chưa có gói</Absent>}</Td>
                      <Td numeric>
                        {student.sessionsRemaining === null ? (
                          <Placeholder />
                        ) : (
                          <Figures>{student.sessionsRemaining}</Figures>
                        )}
                      </Td>
                      <Td numeric>
                        {student.expiryDate === null ? (
                          <Placeholder />
                        ) : (
                          <Figures className="whitespace-nowrap">
                            {formatDate(`${student.expiryDate}T00:00:00+07:00`)}
                          </Figures>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge tone={STATUS[student.status].tone}>
                          {STATUS[student.status].label}
                        </StatusBadge>
                        {student.renewalDue ? (
                          <span className="text-ink-2 text-2xs mt-1 block">
                            Cần gia hạn
                          </span>
                        ) : null}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            {/* Below lg the table becomes ruled rows — a studio phone is not
                asked to render a six-column grid (docs/RESPONSIVE.md). */}
            <ul className="rule-t lg:hidden">
              {students.map((student) => (
                <li key={student.id} className="rule-b">
                  <StudentRow student={student} />
                </li>
              ))}
            </ul>
          </>
        )}
      </QueryBoundary>

      <CreateStudentDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(student) => {
          setCreating(false);
          setCreatedName(student.fullName);
          // Straight to the new record: the reason staff created it is to attach
          // a package, a payment or a booking to it next.
          void navigate(`/studio/hoc-vien/${student.id}`);
        }}
      />
    </div>
  );
}

/**
 * Creating a student states its one consequence before the action: the phone
 * number becomes that person's identifier, so the studio gets one profile per
 * number. The form is in a dialog because this is a focused four-field task,
 * not a screen of its own.
 */
function CreateStudentDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (student: StudentSummary) => void;
}) {
  const create = useCreateStudent();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          create.reset();
          onClose();
        }
      }}
    >
      <DialogContent
        title="Tạo học viên"
        description="Hồ sơ mới chưa có gói tập. Gán gói và ghi nhận thanh toán ở bước sau."
      >
        <StudentForm
          submitLabel="Tạo hồ sơ"
          pending={create.isPending}
          error={create.error}
          onCancel={onClose}
          onSubmit={async (input) => {
            const student = await create.mutateAsync(input);
            onCreated(student);
            return student;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function StudentRow({ student }: { student: StudentSummary }) {
  return (
    <Link
      to={`/studio/hoc-vien/${student.id}`}
      className="hover:bg-sand-deep/50 active:bg-sand-deep flex items-start justify-between gap-4 py-3.5 transition-colors duration-200"
    >
      <span className="min-w-0">
        <span className="text-ink block text-sm">{student.fullName}</span>
        <Figures className="text-ink-2 mt-1 block text-xs">
          {formatPhone(student.phone)}
        </Figures>
        <span className="text-ink-2 mt-1 block text-xs">
          {student.currentPackageName ?? <Absent>Chưa có gói</Absent>}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge tone={STATUS[student.status].tone}>
          {STATUS[student.status].label}
        </StatusBadge>
        <span className="text-ink-2 text-xs">
          {student.sessionsRemaining === null ? (
            <>
              Số buổi <Placeholder />
            </>
          ) : (
            <>
              Còn <Figures className="text-ink">{student.sessionsRemaining}</Figures> buổi
            </>
          )}
        </span>
        <span className="text-ink-2 text-xs">
          {student.expiryDate === null ? (
            <>
              Hạn dùng <Placeholder />
            </>
          ) : (
            <>
              Hạn{" "}
              <Figures className="text-ink">
                {formatDate(`${student.expiryDate}T00:00:00+07:00`)}
              </Figures>
            </>
          )}
        </span>
        {student.renewalDue ? (
          <span className="text-ink-2 text-2xs">Cần gia hạn</span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * An absent value. The dash is decoration, so it is hidden from assistive
 * technology and the meaning is written out instead — never the string "null".
 */
function Placeholder() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-2">
        —
      </span>
      <span className="sr-only">chưa có</span>
    </>
  );
}
