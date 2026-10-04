import { useState } from "react";
import { useNavigate } from "react-router";
import { useSession } from "~/features/auth/use-session";
import { errorMessage } from "~/lib/api/client";
import type { TrainerResponse } from "~/lib/api/schema";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Input, Select, Textarea } from "~/ui/field";
import { useCreateTrainer, useUpdateTrainer, useTrainerAccountDirectory } from "./queries";

export function TrainerEditor({ trainer }: { trainer?: TrainerResponse }) {
  const [open, setOpen] = useState(false);
  const create = useCreateTrainer();
  const update = useUpdateTrainer(trainer?.id ?? 0);
  const pending = create.isPending || update.isPending;
  const navigate = useNavigate();
  return (
    <>
      <Button
        variant={trainer ? "secondary" : "primary"}
        onClick={() => {
          create.reset();
          update.reset();
          setOpen(true);
        }}
      >
        {trainer ? "Sửa hồ sơ HLV" : "Thêm huấn luyện viên"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        {open ? (
          <DialogContent
            title={trainer ? "Sửa hồ sơ huấn luyện viên" : "Thêm huấn luyện viên"}
            busy={pending}
          >
            <TrainerForm
              trainer={trainer}
              pending={pending}
              error={create.error ?? update.error}
              onCancel={() => setOpen(false)}
              onSave={async (payload) => {
                const saved = trainer
                  ? await update.mutateAsync(payload)
                  : await create.mutateAsync(payload);
                setOpen(false);
                if (!trainer) await navigate(`/studio/huan-luyen-vien/${saved.id}`);
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function TrainerForm({
  trainer,
  pending,
  error,
  onCancel,
  onSave,
}: {
  trainer?: TrainerResponse;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (payload: {
    full_name: string;
    phone: string | null;
    bio: string | null;
    specialties: string | null;
    is_public: boolean;
    is_active?: boolean;
    user_id?: number | null;
  }) => Promise<void>;
}) {
  const session = useSession();
  const admin = session.data?.role === "ADMIN";
  const accounts = useTrainerAccountDirectory(admin);
  const [name, setName] = useState(trainer?.full_name ?? "");
  const [phone, setPhone] = useState(trainer?.phone ?? "");
  const [bio, setBio] = useState(trainer?.bio ?? "");
  const [specialties, setSpecialties] = useState(trainer?.specialties ?? "");
  const [published, setPublished] = useState(trainer?.is_public ?? false);
  const [active, setActive] = useState(trainer?.is_active ?? true);
  const [userId, setUserId] = useState(String(trainer?.user_id ?? ""));
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          full_name: name.trim(),
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          specialties: specialties.trim() || null,
          is_public: published,
          ...(trainer ? { is_active: active } : {}),
          ...(admin ? { user_id: userId === "" ? null : Number(userId) } : {}),
        }).catch(() => {});
      }}
    >
      <Field label="Họ và tên" required>
        {({ id }) => (
          <Input
            id={id}
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>
      <Field label="Số điện thoại">
        {({ id }) => (
          <Input
            id={id}
            type="tel"
            maxLength={32}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        )}
      </Field>
      <Field label="Giới thiệu">
        {({ id }) => (
          <Textarea
            id={id}
            maxLength={4000}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        )}
      </Field>
      <Field label="Chuyên môn">
        {({ id }) => (
          <Textarea
            id={id}
            maxLength={1000}
            value={specialties}
            onChange={(event) => setSpecialties(event.target.value)}
          />
        )}
      </Field>
      <Field label="Trang công khai">
        {({ id }) => (
          <Select
            id={id}
            value={String(published)}
            onChange={(event) => setPublished(event.target.value === "true")}
          >
            <option value="false">Chưa công khai</option>
            <option value="true">Công khai hồ sơ</option>
          </Select>
        )}
      </Field>
      {trainer ? (
        <Field label="Trạng thái giảng dạy">
          {({ id }) => (
            <Select
              id={id}
              value={String(active)}
              onChange={(event) => setActive(event.target.value === "true")}
            >
              <option value="true">Đang dạy</option>
              <option value="false">Tạm nghỉ</option>
            </Select>
          )}
        </Field>
      ) : null}
      {admin ? (
        <Field
          label="Tài khoản HLV"
          hint="Tạo tài khoản với quyền Huấn luyện viên trước, sau đó liên kết tại đây."
        >
          {({ id }) => (
            <Select
              id={id}
              value={userId}
              disabled={accounts.isPending || accounts.isError}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">Chưa liên kết tài khoản</option>
              {(accounts.data ?? [])
                .filter(
                  (account) =>
                    account.trainer_id === null || account.trainer_id === trainer?.id,
                )
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.full_name ?? account.email} · {account.email}
                  </option>
                ))}
            </Select>
          )}
        </Field>
      ) : null}
      {admin && accounts.isError ? (
        <p role="alert">
          Chưa tải được tài khoản HLV.{" "}
          <Button variant="ghost" size="sm" onClick={() => void accounts.refetch()}>
            Thử lại
          </Button>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {errorMessage(error, "Chưa lưu được hồ sơ. Vui lòng thử lại.")}
        </p>
      ) : null}
      <FormActions>
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          Quay lại
        </Button>
        <Button type="submit" pending={pending} disabled={!name.trim()}>
          {trainer ? "Lưu hồ sơ HLV" : "Tạo hồ sơ HLV"}
        </Button>
      </FormActions>
    </form>
  );
}
