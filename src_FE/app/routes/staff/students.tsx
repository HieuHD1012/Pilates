import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { useCreateStudent, useStudents } from "~/features/people/queries";
import { StudentForm } from "~/features/people/student-form";
import type { StudentResponse, StudentStatus } from "~/lib/api/schema";
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

/**
 * Two states, not four. A student record is `ACTIVE` or `INACTIVE`; "sắp hết
 * hạn" and "hết hạn" are properties of a **package**, not of a person, and the
 * studio reads them on the renewals screen, which is the query that knows them.
 */
const STATUS: Record<StudentStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "Đang học", tone: "positive" },
  INACTIVE: { label: "Tạm nghỉ", tone: "neutral" },
};

const STATUS_ORDER: StudentStatus[] = ["ACTIVE", "INACTIVE"];

/**
 * The student list.
 *
 * The winning subject is the person, and the columns are what
 * `GET /students` actually knows about them: name, phone, email, when they
 * joined and whether they are still attending.
 *
 * Package and credit columns are **not** here. That data comes from
 * `/students/{id}/overview`, one request per student, and a list that fires one
 * request per row to fill three columns is a slow list telling you what the
 * profile page already says. Who needs renewing is its own screen, computed by
 * its own query.
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

  const query = useStudents({
    q: search.trim() === "" ? undefined : search.trim(),
    status: status === "all" ? undefined : status,
    limit: 200,
  });
  const items = query.data;
  const activeCount = (items ?? []).filter((s) => s.status === "ACTIVE").length;
  const filtered = search.trim() !== "" || status !== "all";

  function clearFilters() {
    setSearch("");
    setStatus("all");
  }

  /** The row navigates; the name link inside it handles its own click. */
  function openStudent(event: React.MouseEvent<HTMLTableRowElement>, id: number) {
    if ((event.target as HTMLElement).closest("a")) return;
    void navigate(`/studio/hoc-vien/${id}`);
  }

  return (
    <div className="gutter py-6">
      <LiveRegion message={createdName ? `Đã tạo hồ sơ cho ${createdName}.` : null} />

      <PageHeader
        title="Học viên"
        description="Danh sách học viên của studio. Gói tập và số buổi còn lại nằm trong hồ sơ từng người."
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
              <dt>Đang học</dt>
              <dd>
                {items ? (
                  <Figures className="text-ink">{activeCount}</Figures>
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
            {/* 1440 / 1024: the columns staff scan down. */}
            <div className="hidden lg:block">
              <DataTable caption="Danh sách học viên" minWidth="52rem">
                <thead>
                  <tr>
                    <Th>Tên</Th>
                    <Th>Điện thoại</Th>
                    <Th>Email</Th>
                    <Th numeric>Vào studio</Th>
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
                          {student.full_name}
                        </Link>
                      </Td>
                      <Td>
                        <Figures className="text-ink-2 whitespace-nowrap">
                          {formatPhone(student.phone)}
                        </Figures>
                      </Td>
                      <Td>{student.email ?? <Absent>Chưa ghi</Absent>}</Td>
                      <Td numeric>
                        <Figures className="whitespace-nowrap">
                          {formatDate(student.created_at)}
                        </Figures>
                      </Td>
                      <Td>
                        <StatusBadge tone={STATUS[student.status].tone}>
                          {STATUS[student.status].label}
                        </StatusBadge>
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
          setCreatedName(student.full_name);
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
  onCreated: (student: StudentResponse) => void;
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

function StudentRow({ student }: { student: StudentResponse }) {
  return (
    <Link
      to={`/studio/hoc-vien/${student.id}`}
      className="hover:bg-sand-deep/50 active:bg-sand-deep flex items-start justify-between gap-4 py-3.5 transition-colors duration-200"
    >
      <span className="min-w-0">
        <span className="text-ink block text-sm">{student.full_name}</span>
        <Figures className="text-ink-2 mt-1 block text-xs">
          {formatPhone(student.phone)}
        </Figures>
        <span className="text-ink-2 mt-1 block text-xs">
          {student.email ?? <Absent>Chưa ghi email</Absent>}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge tone={STATUS[student.status].tone}>
          {STATUS[student.status].label}
        </StatusBadge>
        <span className="text-ink-2 text-xs">
          Vào studio{" "}
          <Figures className="text-ink">{formatDate(student.created_at)}</Figures>
        </span>
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
