import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  useCreatePackageType,
  usePackageTypes,
  useUpdatePackageType,
} from "~/features/commerce/queries";
import type { ClassType, PackageTypeResponse } from "~/lib/api/schema";
import { formatNumber, formatVnd } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Input, Select } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/packages";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Gói tập — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  GROUP: "Lớp nhóm",
  PRIVATE: "Lớp riêng",
};

/**
 * The catalogue the studio sells from.
 *
 * The winning subject is the package type; every column is one of its terms —
 * buổi, ngày, giá — which is what a table is for: comparable figures read down.
 *
 * A package belongs to **one** class type, not a set: the backend decides which
 * sessions a package can pay for from `class_type`, and a package sold to a
 * student freezes that choice in its own snapshot. Editing a row here never
 * touches what someone already bought, which is why re-pricing is safe.
 */
export default function StaffPackages() {
  const query = usePackageTypes();
  const [creating, setCreating] = useState(false);

  const items = query.data;
  const onSaleCount = (items ?? []).filter((item) => item.is_selling).length;

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Gói tập"
        description="Danh mục gói studio đang bán: số buổi, thời hạn sử dụng và giá niêm yết."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            Thêm gói
          </Button>
        }
        meta={
          items ? (
            <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
              <div className="flex items-baseline gap-2">
                <dt>Đang bán</dt>
                <dd>
                  <Figures className="text-ink">
                    {formatNumber(onSaleCount)}/{formatNumber(items.length)}
                  </Figures>
                </dd>
              </div>
            </dl>
          ) : null
        }
      />

      <div className="mt-5">
        <QueryBoundary
          query={query}
          skeletonRows={5}
          emptyTitle="Chưa có gói tập nào"
          emptyDescription="Danh mục sẽ xuất hiện khi studio thiết lập gói bán trong hệ thống."
          errorDescription="Không tải được danh mục gói tập."
          showErrorDetail
        >
          {(types) => (
            <>
              {/* 1440 / 1024: six terms read down as columns. */}
              <div className="hidden lg:block">
                <DataTable caption="Danh mục gói tập" minWidth="56rem">
                  <thead>
                    <tr>
                      <Th>Tên gói</Th>
                      <Th numeric>Số buổi</Th>
                      <Th numeric>Thời hạn</Th>
                      <Th numeric>Giá</Th>
                      <Th>Hình thức lớp</Th>
                      <Th>Trạng thái</Th>
                      <Th> </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((item) => (
                      <tr key={item.id}>
                        <Td>{item.name}</Td>
                        <Td numeric>
                          <Figures>{formatNumber(item.credits)}</Figures>
                        </Td>
                        <Td numeric>
                          <span className="whitespace-nowrap">
                            <Figures>{formatNumber(item.duration_days)}</Figures> ngày
                          </span>
                        </Td>
                        <Td numeric>
                          {/* `null` is a price the studio has not entered, not
                              a free package. It renders as a waiting slot. */}
                          {item.price === null ? (
                            <PendingFact label={`Giá gói ${item.name}`} />
                          ) : (
                            <Figures className="whitespace-nowrap">
                              {formatVnd(item.price)}
                            </Figures>
                          )}
                        </Td>
                        <Td>{CLASS_TYPE_LABEL[item.class_type]}</Td>
                        <Td>
                          {item.is_selling ? (
                            <StatusBadge tone="positive">Đang bán</StatusBadge>
                          ) : (
                            <StatusBadge tone="neutral">Ngừng bán</StatusBadge>
                          )}
                        </Td>
                        <Td>
                          <SellingToggle item={item} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>

              {/* Below lg the table becomes ruled rows — a studio phone is not
                  asked to render six columns (docs/RESPONSIVE.md). */}
              <ul className="rule-t lg:hidden">
                {types.map((item) => (
                  <li key={item.id} className="rule-b">
                    <PackageRow item={item} />
                  </li>
                ))}
              </ul>

              <p className="rule-t measure-wide text-ink-2 mt-8 pt-3 text-xs">
                Ngừng bán chỉ ẩn gói khỏi danh sách bán mới. Gói học viên đã mua giữ nguyên
                tên, giá và số buổi của lúc mua, nên đổi giá ở đây không viết lại lịch sử.
              </p>
            </>
          )}
        </QueryBoundary>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent
          title="Thêm gói vào danh mục"
          description="Gói mới xuất hiện ở màn hình bán gói và trên trang công khai nếu để trạng thái đang bán."
        >
          <PackageTypeForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Withdrawing a package from sale is `is_selling`, never a delete: rows are
 * permanent because the packages people bought still point at them.
 */
function SellingToggle({ item }: { item: PackageTypeResponse }) {
  const update = useUpdatePackageType(item.id);

  return (
    <Button
      size="sm"
      variant="secondary"
      pending={update.isPending}
      onClick={() => update.mutate({ is_selling: !item.is_selling })}
    >
      {item.is_selling ? "Ngừng bán" : "Bán lại"}
    </Button>
  );
}

function PackageRow({ item }: { item: PackageTypeResponse }) {
  return (
    <div className="grid gap-x-6 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
      <div className="min-w-0">
        <p className="text-ink text-sm">{item.name}</p>
        <p className="text-ink-2 mt-1 text-xs">
          <Figures className="text-ink">{formatNumber(item.credits)}</Figures> buổi
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <Figures className="text-ink">{formatNumber(item.duration_days)}</Figures> ngày
        </p>
        <p className="text-ink-2 mt-1 text-xs">{CLASS_TYPE_LABEL[item.class_type]}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-end">
        {item.price === null ? (
          <PendingFact label={`Giá gói ${item.name}`} />
        ) : (
          <Figures className="text-ink text-sm whitespace-nowrap">
            {formatVnd(item.price)}
          </Figures>
        )}
        {item.is_selling ? (
          <StatusBadge tone="positive">Đang bán</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Ngừng bán</StatusBadge>
        )}
        <SellingToggle item={item} />
      </div>
    </div>
  );
}

const schema = z.object({
  name: z.string().trim().min(1, "Nhập tên gói").max(120, "Tên gói quá dài"),
  credits: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, "Số buổi phải lớn hơn 0"),
  duration_days: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, "Thời hạn phải lớn hơn 0"),
  /** Blank is allowed: the studio may not have set a price yet. */
  price: z
    .string()
    .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), "Giá chỉ gồm chữ số"),
  class_type: z.enum(["GROUP", "PRIVATE"]),
});

type PackageTypeValues = z.infer<typeof schema>;

function PackageTypeForm({ onDone }: { onDone: () => void }) {
  const create = useCreatePackageType();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PackageTypeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      credits: "",
      duration_days: "",
      price: "",
      class_type: "GROUP",
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        create
          .mutateAsync({
            name: values.name,
            credits: Number(values.credits),
            duration_days: Number(values.duration_days),
            // A blank price is `null` — "not set yet" — and never 0, which
            // would say the studio gives this package away.
            price: values.price === "" ? null : values.price,
            class_type: values.class_type,
          })
          .then(onDone)
          .catch(() => {}),
      )}
      className="flex flex-col gap-4"
    >
      <LiveRegion message={create.isSuccess ? "Đã thêm gói." : null} />

      <Field label="Tên gói" required error={errors.name?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("name")}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số buổi" required error={errors.credits?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("credits")}
            />
          )}
        </Field>

        <Field label="Thời hạn (ngày)" required error={errors.duration_days?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("duration_days")}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Giá"
          hint="Bỏ trống nếu studio chưa chốt giá."
          error={errors.price?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("price")}
            />
          )}
        </Field>

        <Field label="Hình thức lớp" required error={errors.class_type?.message}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("class_type")}
            >
              <option value="GROUP">Lớp nhóm</option>
              <option value="PRIVATE">Lớp riêng</option>
            </Select>
          )}
        </Field>
      </div>

      {create.isError ? (
        <p role="alert" className="text-danger text-sm">
          Chưa thêm được gói. Vui lòng kiểm tra lại thông tin.
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" type="button" onClick={onDone}>
          Quay lại
        </Button>
        <Button type="submit" size="sm" pending={create.isPending}>
          Thêm gói
        </Button>
      </FormActions>
    </form>
  );
}
