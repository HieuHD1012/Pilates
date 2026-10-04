import { useState } from "react";
import { useSession } from "~/features/auth/use-session";
import { errorMessage } from "~/lib/api/client";
import { cn } from "~/lib/cn";
import { formatDate } from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";
import { QueryBoundary } from "~/ui/query-boundary";
import { Panel, PanelBody, PanelHeader } from "~/ui/workspace";
import {
  useDeleteProgressPhoto,
  useProgressPhotoFile,
  useProgressPhotos,
  useUploadProgressPhoto,
  useUploadTrainerPhoto,
} from "./queries";

/**
 * A file field that speaks the page's language. The native control prints the
 * browser's own words ("Choose File · No file chosen", in English on most
 * machines) and cannot be styled. The input stays in the page, visually
 * hidden but focusable and labelled, so keyboards, screen readers and
 * `setInputFiles` reach it exactly as before; a styled label opens it.
 */
function PhotoPicker({
  id,
  file,
  disabled,
  onChange,
}: {
  id: string;
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-3">
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className={cn(
          "border-rule-2 text-ink bg-paper inline-flex min-h-11 cursor-pointer items-center rounded-sm border px-4 text-sm font-medium",
          "hover:border-ink peer-focus-visible:outline-copper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
          "peer-disabled:text-ink-3 peer-disabled:cursor-not-allowed",
        )}
      >
        Chọn ảnh
      </label>
      <span className="text-ink-2 min-w-0 truncate text-sm">
        {file ? file.name : "Chưa chọn ảnh nào"}
      </span>
    </span>
  );
}

export function TrainerPhotoUpload({ trainerId }: { trainerId: number }) {
  const upload = useUploadTrainerPhoto(trainerId);
  const [file, setFile] = useState<File | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (file)
          upload.mutate(file, {
            onSuccess: () => {
              setFile(null);
              form.reset();
            },
          });
      }}
    >
      <Field label="Ảnh huấn luyện viên" hint="Ảnh JPEG, PNG hoặc WebP, tối đa 8 MB.">
        {({ id }) => (
          <PhotoPicker id={id} file={file} disabled={upload.isPending} onChange={setFile} />
        )}
      </Field>
      {upload.isError ? (
        <p role="alert" className="text-danger text-sm">
          {errorMessage(upload.error, "Chưa tải được ảnh. Vui lòng thử lại.")}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={!file} pending={upload.isPending}>
        Lưu ảnh huấn luyện viên
      </Button>
      <LiveRegion message={upload.isSuccess ? "Đã lưu ảnh huấn luyện viên." : null} />
    </form>
  );
}

export function ProgressGallery({ studentId }: { studentId: number }) {
  const session = useSession();
  const allowed = session.data?.role !== "STAFF" && session.data != null;
  const query = useProgressPhotos(studentId, allowed);
  const upload = useUploadProgressPhoto(studentId);
  const remove = useDeleteProgressPhoto(studentId);
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  if (!allowed) return null;
  return (
    <Panel>
      <PanelHeader
        title="Ảnh tiến trình"
        description="Ảnh chỉ hiển thị cho học viên, huấn luyện viên phụ trách và quản trị."
      />
      <PanelBody>
        <form
          className="mb-5 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            if (file)
              upload.mutate(
                { file },
                {
                  onSuccess: () => {
                    setFile(null);
                    form.reset();
                  },
                },
              );
          }}
        >
          <Field label="Ảnh tiến trình mới" hint="Ảnh JPEG, PNG hoặc WebP, tối đa 8 MB.">
            {({ id }) => (
              <PhotoPicker
                id={id}
                file={file}
                disabled={upload.isPending}
                onChange={setFile}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="secondary"
            disabled={!file}
            pending={upload.isPending}
          >
            Tải ảnh tiến trình
          </Button>
          {upload.isError ? (
            <p role="alert" className="text-danger text-sm">
              {errorMessage(upload.error, "Chưa tải được ảnh. Vui lòng thử lại.")}
            </p>
          ) : null}
        </form>
        <QueryBoundary
          query={query}
          emptyTitle="Chưa có ảnh tiến trình"
          errorDescription="Không tải được ảnh tiến trình."
        >
          {(photos) => (
            <ul className="grid gap-5 sm:grid-cols-2">
              {photos.map((photo) => (
                <li key={photo.id} className="rule-b pb-4">
                  <ProgressImage studentId={studentId} photoId={photo.id} />
                  <p className="text-ink-2 my-2 text-sm">
                    Chụp ngày {formatDate(photo.taken_at)}
                  </p>
                  {session.data?.role === "ADMIN" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        remove.reset();
                        setTarget(photo.id);
                      }}
                    >
                      Xóa ảnh tiến trình
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
        <LiveRegion
          message={
            upload.isSuccess
              ? "Đã tải ảnh tiến trình."
              : remove.isSuccess
                ? "Đã xóa ảnh tiến trình."
                : null
          }
        />
        <Dialog
          open={target !== null}
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setTarget(null);
          }}
        >
          <DialogContent
            title="Xóa ảnh tiến trình?"
            description="Ảnh sẽ bị xóa vĩnh viễn. Thao tác này chỉ dành cho quản trị."
            busy={remove.isPending}
          >
            {remove.isError ? (
              <p role="alert">{errorMessage(remove.error, "Chưa xóa được ảnh.")}</p>
            ) : null}
            <FormActions>
              <Button
                variant="secondary"
                disabled={remove.isPending}
                onClick={() => setTarget(null)}
              >
                Quay lại
              </Button>
              <Button
                variant="danger"
                pending={remove.isPending}
                onClick={() => {
                  if (target !== null)
                    remove.mutate(target, { onSuccess: () => setTarget(null) });
                }}
              >
                Xóa ảnh
              </Button>
            </FormActions>
          </DialogContent>
        </Dialog>
      </PanelBody>
    </Panel>
  );
}

function ProgressImage({ studentId, photoId }: { studentId: number; photoId: number }) {
  const query = useProgressPhotoFile(studentId, photoId);
  return (
    <QueryBoundary query={query} errorDescription="Chưa tải được ảnh.">
      {(url) => (
        <img
          src={url}
          alt="Ảnh tiến trình học viên"
          className="aspect-[4/3] w-full rounded-sm object-contain"
        />
      )}
    </QueryBoundary>
  );
}
