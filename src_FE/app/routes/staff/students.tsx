import { Phone, RefreshCw, Search, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { useCreateStudent, useStudents } from "~/features/people/queries";
import { StudentForm } from "~/features/people/student-form";
import type { StudentResponse, StudentStatus } from "~/lib/api/schema";
import { formatDate, formatPhone, telHref } from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Dialog, DialogContent } from "~/ui/dialog";
import { LiveRegion } from "~/ui/feedback";
import { Input } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import {
  Avatar,
  Panel,
  PanelFooter,
  PersonCell,
  RowMenu,
  RowMenuItem,
  SegmentFilter,
  Toolbar,
  WorkspacePage,
  type SegmentOption,
} from "~/ui/workspace";

import type { Route } from "./+types/students";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Học viên — J Pilates" }, { name: "robots", content: "noindex" }];
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

/** The list asks for at most this many rows; see `segmentOptions`. */
const LIMIT = 200;

/**
 * Counts on the status filter, only where the loaded rows prove them.
 *
 * The list is fetched per status, so an unfiltered response can count both
 * states while a filtered one only knows its own. A response that hit the row
 * limit, or that is still the previous filter's rows shown as placeholder, is
 * not a count of anything — so it shows none rather than a wrong one. With a
 * search typed in, every count is a count of the matching students.
 */
function segmentOptions(
  status: StudentStatus | "all",
  items: StudentResponse[] | undefined,
  trustworthy: boolean,
): SegmentOption<StudentStatus | "all">[] {
  const known = trustworthy && items !== undefined && items.length < LIMIT;
  const countFor = (value: StudentStatus | "all"): number | undefined => {
    if (!known) return undefined;
    if (status === "all") {
      return value === "all"
        ? items.length
        : items.filter((item) => item.status === value).length;
    }
    return value === status ? items.length : undefined;
  };

  return [
    { value: "all", label: "Tất cả", count: countFor("all") },
    ...STATUS_ORDER.map((value) => ({
      value,
      label: STATUS[value].label,
      count: countFor(value),
    })),
  ];
}

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
    limit: LIMIT,
  });
  const items = query.data;
  const filtered = search.trim() !== "" || status !== "all";
  const options = segmentOptions(status, items, !query.isPlaceholderData);

  function clearFilters() {
    setSearch("");
    setStatus("all");
  }

  /**
   * The row navigates; the link and the menu inside it handle their own clicks.
   * React bubbles events out of portals, so a click inside the row menu's
   * popover reaches this handler too — `contains` keeps it from navigating.
   */
  function openStudent(event: React.MouseEvent<HTMLTableRowElement>, id: number) {
    const target = event.target as HTMLElement;
    if (!event.currentTarget.contains(target) || target.closest("a, button")) return;
    void navigate(`/studio/hoc-vien/${id}`);
  }

  return (
    <WorkspacePage>
      <LiveRegion message={createdName ? `Đã tạo hồ sơ cho ${createdName}.` : null} />

      <PageHeader
        title="Học viên"
        description="Danh sách học viên của studio. Gói tập và số buổi còn lại nằm trong hồ sơ từng người."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/studio/gia-han">
                <RefreshCw className="size-4" aria-hidden="true" />
                <span>Danh sách cần gia hạn</span>
              </Link>
            </Button>
            <Button
              icon={<UserPlus className="size-4" aria-hidden="true" />}
              onClick={() => setCreating(true)}
            >
              Tạo học viên
            </Button>
          </>
        }
      />

      <Panel aria-label="Danh sách học viên">
        <Toolbar
          trailing={
            <>
              {query.isFetching && !query.isPending ? (
                <span className="text-ink-2 text-xs">Đang cập nhật</span>
              ) : null}
              <DemoDataNotice />
            </>
          }
        >
          <SegmentFilter
            label="Lọc theo trạng thái"
            options={options}
            value={status}
            onChange={setStatus}
          />
          <div className="relative w-full sm:w-72">
            <Search
              className="text-ink-2 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Tìm học viên"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên hoặc số điện thoại"
              autoComplete="off"
              className="pl-9"
            />
          </div>
        </Toolbar>

        <div className="px-4 md:px-5">
          <QueryBoundary
            query={query}
            skeletonRows={8}
            emptyTitle={
              filtered ? "Không có học viên nào khớp bộ lọc" : "Chưa có học viên nào"
            }
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
              <div className="-mx-4 md:-mx-5">
                {/* 1440 / 1024: the columns staff scan down. */}
                <div className="hidden lg:block">
                  <DataTable caption="Danh sách học viên" minWidth="52rem">
                    <thead>
                      <tr>
                        <Th>Học viên</Th>
                        <Th>Email</Th>
                        <Th numeric>Vào studio</Th>
                        <Th>Trạng thái</Th>
                        <Th>
                          <span className="sr-only">Thao tác</span>
                        </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <Tr
                          key={student.id}
                          onClick={(event) => openStudent(event, student.id)}
                        >
                          <Td>
                            {/* A real link: the row click is a convenience, not
                                the only way in. */}
                            <PersonCell
                              avatarName={student.full_name}
                              name={
                                <Link
                                  to={`/studio/hoc-vien/${student.id}`}
                                  className="hover:text-copper"
                                >
                                  {student.full_name}
                                </Link>
                              }
                              detail={
                                <Figures className="whitespace-nowrap">
                                  {formatPhone(student.phone)}
                                </Figures>
                              }
                            />
                          </Td>
                          <Td className="text-ink-2">
                            {student.email ?? <Absent>Chưa ghi</Absent>}
                          </Td>
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
                          <Td className="w-14 text-right">
                            <StudentMenu student={student} />
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>

                {/* Below lg the table becomes ruled rows — a studio phone is not
                    asked to render a five-column grid (docs/RESPONSIVE.md). */}
                <ul className="lg:hidden">
                  {students.map((student) => (
                    <li key={student.id} className="rule-b last:border-b-0">
                      <StudentRow student={student} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </QueryBoundary>
        </div>

        {items && items.length > 0 ? (
          <PanelFooter>
            <span>
              Đang hiển thị <Figures className="text-ink">{items.length}</Figures> học viên
            </span>
          </PanelFooter>
        ) : null}
      </Panel>

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
    </WorkspacePage>
  );
}

/**
 * The row's overflow menu (ADR 0006, decision 7). No row on this list needs
 * handling, so there is no button at the edge — only the menu.
 */
function StudentMenu({ student }: { student: StudentResponse }) {
  const navigate = useNavigate();

  return (
    <RowMenu label={`Thao tác cho ${student.full_name}`}>
      <RowMenuItem
        icon={<UserRound aria-hidden="true" />}
        onClick={() => void navigate(`/studio/hoc-vien/${student.id}`)}
      >
        Mở hồ sơ
      </RowMenuItem>
      <RowMenuItem
        icon={<Phone aria-hidden="true" />}
        onClick={() => window.location.assign(telHref(student.phone))}
      >
        <span>
          Gọi <span className="figures">{formatPhone(student.phone)}</span>
        </span>
      </RowMenuItem>
    </RowMenu>
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

/** A phone row: the whole row is the link, so it is one large touch target. */
function StudentRow({ student }: { student: StudentResponse }) {
  return (
    <Link
      to={`/studio/hoc-vien/${student.id}`}
      className="hover:bg-sand/70 active:bg-sand-deep flex items-start gap-3 px-4 py-3.5 transition-colors duration-200 md:px-5"
    >
      <Avatar name={student.full_name} />

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-ink text-sm font-medium">{student.full_name}</span>
          <StatusBadge tone={STATUS[student.status].tone} className="shrink-0">
            {STATUS[student.status].label}
          </StatusBadge>
        </span>
        <Figures className="text-ink-2 block text-xs">{formatPhone(student.phone)}</Figures>
        <span className="text-ink-2 mt-0.5 block text-xs wrap-anywhere">
          {student.email ?? <Absent>Chưa ghi email</Absent>}
        </span>
        <span className="text-ink-2 mt-0.5 block text-xs">
          Vào studio{" "}
          <Figures className="text-ink">{formatDate(student.created_at)}</Figures>
        </span>
      </span>
    </Link>
  );
}
