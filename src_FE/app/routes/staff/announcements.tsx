import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useAnnouncements,
  useDeleteAnnouncement,
  useSaveAnnouncement,
} from "~/features/announcements/queries";
import { errorMessage } from "~/lib/api/client";
import type { AnnouncementResponse } from "~/lib/api/schema";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Input, Select, Textarea } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";
import { PageHeader } from "~/ui/layout";
import { PageControls } from "~/ui/page-controls";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";
import {
  Panel,
  PanelBody,
  RowMenu,
  RowMenuItem,
  SegmentFilter,
  Toolbar,
  WorkspacePage,
} from "~/ui/workspace";

export function meta() {
  return [{ title: "Thông báo — J Pilates" }, { name: "robots", content: "noindex" }];
}

type Filter = "all" | "published" | "draft";
const LIMIT = 50;

export default function StaffAnnouncements() {
  const [filter, setFilter] = useState<Filter>("all");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<AnnouncementResponse | "new" | null>(null);
  const [removing, setRemoving] = useState<AnnouncementResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useAnnouncements({
    limit: LIMIT,
    offset,
    is_published: filter === "all" ? undefined : filter === "published",
  });
  const remove = useDeleteAnnouncement();
  return (
    <WorkspacePage>
      <PageHeader
        title="Thông báo"
        description="Nội dung studio đăng trên trang khuyến mãi. Bản nháp chỉ hiển thị trong phần quản lý."
        actions={
          <Button
            icon={<Plus className="size-4" aria-hidden="true" />}
            onClick={() => setEditing("new")}
          >
            Thêm thông báo
          </Button>
        }
      />
      <Panel>
        <Toolbar>
          <SegmentFilter
            label="Trạng thái thông báo"
            value={filter}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "published", label: "Đã xuất bản" },
              { value: "draft", label: "Bản nháp" },
            ]}
            onChange={(value) => {
              setFilter(value);
              setOffset(0);
            }}
          />
        </Toolbar>
        <QueryBoundary
          query={query}
          emptyTitle="Chưa có thông báo nào"
          emptyDescription="Thêm thông báo khi studio có nội dung cần chia sẻ."
          errorDescription="Chưa tải được thông báo."
          showErrorDetail
        >
          {(items) => (
            <ul>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rule-b flex items-start justify-between gap-4 px-4 py-5 md:px-5"
                >
                  <div className="min-w-0">
                    <StatusBadge tone={item.is_published ? "positive" : "neutral"}>
                      {item.is_published ? "Đã xuất bản" : "Bản nháp"}
                    </StatusBadge>
                    <h2 className="text-ink mt-2 text-base font-medium wrap-break-word">
                      {item.title}
                    </h2>
                    <p className="text-ink-2 mt-1 line-clamp-3 text-sm whitespace-pre-line">
                      {item.body}
                    </p>
                  </div>
                  <RowMenu label={`Thao tác cho ${item.title}`}>
                    <RowMenuItem onClick={() => setEditing(item)}>
                      Sửa thông báo
                    </RowMenuItem>
                    <RowMenuItem
                      danger
                      onClick={() => {
                        remove.reset();
                        setRemoving(item);
                      }}
                    >
                      Xóa thông báo
                    </RowMenuItem>
                  </RowMenu>
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
        <PageControls
          offset={offset}
          limit={LIMIT}
          count={query.data?.length ?? 0}
          pending={query.isFetching}
          onChange={setOffset}
        />
      </Panel>
      <LiveRegion message={notice} />
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing !== null ? (
          <AnnouncementForm
            key={editing === "new" ? "new" : editing.id}
            item={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              setNotice("Đã lưu thông báo.");
            }}
          />
        ) : null}
      </Dialog>
      <Dialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setRemoving(null);
        }}
      >
        <DialogContent
          title="Xóa thông báo?"
          description="Thông báo sẽ bị xóa vĩnh viễn và không còn trên trang công khai."
          busy={remove.isPending}
        >
          <PanelBody>
            <p>{removing?.title}</p>
            {remove.isError ? (
              <p role="alert" className="text-danger mt-3">
                {errorMessage(remove.error, "Chưa xóa được thông báo. Vui lòng thử lại.")}
              </p>
            ) : null}
          </PanelBody>
          <FormActions>
            <Button
              variant="secondary"
              disabled={remove.isPending}
              onClick={() => setRemoving(null)}
            >
              Quay lại
            </Button>
            <Button
              pending={remove.isPending}
              onClick={() => {
                if (removing)
                  remove.mutate(removing.id, {
                    onSuccess: () => {
                      setRemoving(null);
                      setNotice("Đã xóa thông báo.");
                    },
                  });
              }}
            >
              Xóa thông báo
            </Button>
          </FormActions>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

const schema = z.object({
  title: z.string().trim().min(1, "Nhập tiêu đề").max(200, "Tiêu đề tối đa 200 ký tự"),
  body: z
    .string()
    .trim()
    .min(1, "Nhập nội dung")
    .max(10000, "Nội dung tối đa 10.000 ký tự"),
  status: z.enum(["draft", "published"]),
});
type Values = z.infer<typeof schema>;

function AnnouncementForm({
  item,
  onDone,
  onCancel,
}: {
  item?: AnnouncementResponse;
  onDone: () => void;
  onCancel: () => void;
}) {
  const save = useSaveAnnouncement(item?.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: item?.title ?? "",
      body: item?.body ?? "",
      status: item?.is_published ? "published" : "draft",
    },
  });
  return (
    <DialogContent
      title={item ? "Sửa thông báo" : "Thêm thông báo"}
      description="Chọn xuất bản để nội dung hiển thị trên trang khuyến mãi."
      busy={save.isPending}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) =>
          save.mutate(
            {
              title: values.title,
              body: values.body,
              is_published: values.status === "published",
              publish_at: null,
            },
            { onSuccess: onDone },
          ),
        )}
      >
        <Field label="Tiêu đề" required error={errors.title?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("title")}
            />
          )}
        </Field>
        <Field label="Nội dung" required error={errors.body?.message}>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              rows={8}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("body")}
            />
          )}
        </Field>
        <Field label="Trạng thái">
          {({ id }) => (
            <Select id={id} {...register("status")}>
              <option value="draft">Bản nháp</option>
              <option value="published">Xuất bản ngay</option>
            </Select>
          )}
        </Field>
        {save.isError ? (
          <p role="alert" className="text-danger text-sm">
            {errorMessage(
              save.error,
              "Chưa lưu được thông báo. Vui lòng kiểm tra thông tin và thử lại.",
            )}
          </p>
        ) : null}
        <FormActions>
          <Button
            variant="secondary"
            type="button"
            disabled={save.isPending}
            onClick={onCancel}
          >
            Quay lại
          </Button>
          <Button type="submit" pending={save.isPending}>
            Lưu thông báo
          </Button>
        </FormActions>
      </form>
    </DialogContent>
  );
}
