import { useState } from "react";
import { errorMessage } from "~/lib/api/client";
import type { AccountResponse } from "~/lib/api/schema";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Input } from "~/ui/field";
import { QueryBoundary } from "~/ui/query-boundary";
import { useAccount, useUpdateAccount } from "./queries";

export function AccountEdit({ accountId }: { accountId: number }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateAccount(accountId);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Sửa tài khoản
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!update.isPending) setOpen(value);
        }}
      >
        {open ? (
          <AccountDetail
            accountId={accountId}
            update={update}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </Dialog>
    </>
  );
}
function AccountDetail({
  accountId,
  update,
  onDone,
}: {
  accountId: number;
  update: ReturnType<typeof useUpdateAccount>;
  onDone: () => void;
}) {
  const query = useAccount(accountId);
  return (
    <DialogContent
      busy={update.isPending}
      title="Sửa tài khoản"
      description="Cập nhật họ tên và số điện thoại. Quyền truy cập và email đăng nhập được giữ nguyên."
    >
      <QueryBoundary query={query} errorDescription="Chưa tải được tài khoản.">
        {(account) => <EditForm account={account} update={update} onDone={onDone} />}
      </QueryBoundary>
    </DialogContent>
  );
}
function EditForm({
  account,
  update,
  onDone,
}: {
  account: AccountResponse;
  update: ReturnType<typeof useUpdateAccount>;
  onDone: () => void;
}) {
  const [name, setName] = useState(account.full_name ?? "");
  const [phone, setPhone] = useState(account.phone ?? "");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(
          { full_name: name.trim() || null, phone: phone.trim() || null },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Họ và tên">
        {({ id }) => (
          <Input id={id} value={name} onChange={(event) => setName(event.target.value)} />
        )}
      </Field>
      <Field label="Số điện thoại">
        {({ id }) => (
          <Input
            id={id}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        )}
      </Field>
      {update.isError ? (
        <p role="alert" className="text-danger text-sm">
          {errorMessage(update.error, "Chưa lưu được tài khoản.")}
        </p>
      ) : null}
      <FormActions>
        <Button
          type="button"
          variant="secondary"
          disabled={update.isPending}
          onClick={onDone}
        >
          Quay lại
        </Button>
        <Button type="submit" pending={update.isPending}>
          Lưu tài khoản
        </Button>
      </FormActions>
    </form>
  );
}
