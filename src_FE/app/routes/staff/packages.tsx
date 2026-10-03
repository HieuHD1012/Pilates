import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  useCreatePackageType,
  usePackageTypes,
  useUpdatePackageType,
} from "~/features/commerce/queries";
import type { ClassType, PackageTypeResponse } from "~/lib/api/schema";
import { decimalToNumber, formatNumber, formatVnd } from "~/lib/format";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Input, Select } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";
import {
  InlineNote,
  Panel,
  PanelHeader,
  RowMenu,
  RowMenuItem,
  WorkspacePage,
} from "~/ui/workspace";

import type { Route } from "./+types/packages";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Gói tập — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  GROUP: "Lớp nhóm",
  PRIVATE: "Lớp riêng",
};

const CLASS_TYPE_ORDER: ClassType[] = ["GROUP", "PRIVATE"];

/**
 * The catalogue the studio sells from.
 *
 * The winning subject is the package type. What is on sale is a handful of
 * offers a member of staff quotes from, so each is a card — name, the price
 * large, then its terms — grouped by the class format it pays for. What is no
 * longer on sale is reference, not an offer, so it drops into one table below.
 *
 * A package belongs to **one** class type, not a set: the backend decides which
 * sessions a package can pay for from `class_type`, and a package sold to a
 * student freezes that choice in its own snapshot. Editing a row here never
 * touches what someone already bought, which is why re-pricing is safe.
 */
export default function StaffPackages() {
  const query = usePackageTypes();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <WorkspacePage>
      <PageHeader
        title="Gói tập"
        description="Danh mục gói studio đang bán: số buổi, thời hạn sử dụng và giá niêm yết."
        actions={
          <>
            <DemoDataNotice />
            <Button
              onClick={() => setCreating(true)}
              icon={<Plus className="size-4" aria-hidden="true" />}
            >
              Thêm gói
            </Button>
          </>
        }
      />

      {/* One wrapper, so the refetch hairline QueryBoundary draws does not take
          a gap of its own in the page column. */}
      <div>
        <QueryBoundary
          query={query}
          skeletonRows={5}
          emptyTitle="Chưa có gói tập nào"
          emptyDescription="Danh mục sẽ xuất hiện khi studio thiết lập gói bán trong hệ thống."
          errorDescription="Không tải được danh mục gói tập."
          showErrorDetail
        >
          {(types) => {
            const stopped = types.filter((item) => !item.is_selling);
            return (
              <div className="flex flex-col gap-8 md:gap-10">
                {CLASS_TYPE_ORDER.map((classType) => (
                  <PackageGroup
                    key={classType}
                    classType={classType}
                    // Smallest package first, the order staff quote them in.
                    items={types
                      .filter((item) => item.is_selling && item.class_type === classType)
                      .sort((a, b) => a.credits - b.credits)}
                    onNotice={setNotice}
                  />
                ))}

                {stopped.length > 0 ? (
                  <StoppedPanel items={stopped} onNotice={setNotice} />
                ) : null}
              </div>
            );
          }}
        </QueryBoundary>
      </div>

      <InlineNote icon={<Info aria-hidden="true" />}>
        Ngừng bán chỉ ẩn gói khỏi danh sách bán mới. Gói học viên đã mua giữ nguyên tên, giá
        và số buổi của lúc mua, nên đổi giá ở đây không viết lại lịch sử.
      </InlineNote>

      <LiveRegion message={notice} />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent
          title="Thêm gói vào danh mục"
          description="Gói mới xuất hiện ở màn hình bán gói và trên trang công khai nếu để trạng thái đang bán."
        >
          <PackageTypeForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  );
}

type Notify = (message: string) => void;

/** One class format: a serif heading, then a card per package on sale. */
function PackageGroup({
  classType,
  items,
  onNotice,
}: {
  classType: ClassType;
  items: PackageTypeResponse[];
  onNotice: Notify;
}) {
  const headingId = `packages-${classType.toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id={headingId}
          className="font-display text-ink text-2xl leading-tight font-normal"
        >
          {CLASS_TYPE_LABEL[classType]}
        </h2>
        <p className="text-ink-2 text-sm">
          <Figures className="text-ink">{formatNumber(items.length)}</Figures> gói đang bán
        </p>
      </div>

      {items.length === 0 ? (
        <Panel tone="recessed" className="text-ink-2 px-4 py-5 text-sm md:px-5">
          Chưa có gói {CLASS_TYPE_LABEL[classType].toLowerCase()} nào đang bán.
        </Panel>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0">
              <PackageCard item={item} onNotice={onNotice} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Withdrawing a package from sale is `is_selling`, never a delete: rows are
 * permanent because the packages people bought still point at them. The hook
 * lives with the card or row that owns the package, so each one carries its
 * own pending state.
 */
function useSellingToggle(item: PackageTypeResponse, onNotice: Notify) {
  const update = useUpdatePackageType(item.id);
  const toggle = () =>
    update.mutate(
      { is_selling: !item.is_selling },
      {
        onSuccess: () =>
          onNotice(
            item.is_selling ? `Đã ngừng bán ${item.name}.` : `Đã bán lại ${item.name}.`,
          ),
      },
    );
  return { update, toggle };
}

function PackageCard({ item, onNotice }: { item: PackageTypeResponse; onNotice: Notify }) {
  const { update, toggle } = useSellingToggle(item, onNotice);
  const price = decimalToNumber(item.price);
  const titleId = `package-${item.id}`;

  return (
    <Panel
      as="article"
      aria-labelledby={titleId}
      aria-busy={update.isPending || undefined}
      className={cn(
        "flex w-full flex-col gap-1 p-4 transition-opacity duration-200 md:p-5",
        update.isPending && "opacity-60",
      )}
    >
      <div className="-mt-1 -mr-1.5 mb-2 flex items-center justify-between gap-2">
        <StatusBadge tone="positive">Đang bán</StatusBadge>
        <RowMenu label={`Thao tác cho ${item.name}`}>
          <RowMenuItem
            danger
            icon={<X aria-hidden="true" />}
            note="Gói ẩn khỏi danh sách bán mới. Gói học viên đã mua không đổi."
            disabled={update.isPending}
            onClick={toggle}
          >
            Ngừng bán
          </RowMenuItem>
        </RowMenu>
      </div>

      <h3 id={titleId} className="text-ink text-base font-medium">
        {item.name}
      </h3>

      {/* `null` is a price the studio has not entered, not a free package. It
          renders as a waiting slot, and so does the per-session line it would
          have produced. */}
      {price === null ? (
        <p className="font-display text-ink-2 mt-1 text-2xl">
          <PendingFact label={`Giá gói ${item.name}`} />
        </p>
      ) : (
        <>
          <p className="mt-1">
            <Figures display className="text-ink text-3xl leading-tight whitespace-nowrap">
              {formatVnd(price)}
            </Figures>
          </p>
          {/* Arithmetic on the two figures printed on this card, nothing more:
              the price the studio charges for one session is not a field the
              backend owns, it is this quotient. */}
          {item.credits > 0 ? (
            <p className="text-copper-2 text-sm">
              <Figures>{formatVnd(Math.round(price / item.credits))}</Figures> / buổi
            </p>
          ) : null}
        </>
      )}

      {/* The terms sit at the card's foot, so cards in a row align them however
          many lines the name and price above took. */}
      <div className="mt-auto pt-4">
        <dl className="rule-t grid grid-cols-2 gap-3 pt-3.5">
          <div>
            <dt className="text-ink-2 text-xs">Số buổi</dt>
            <dd className="text-ink mt-0.5 text-base">
              <Figures>{formatNumber(item.credits)}</Figures>
            </dd>
          </div>
          <div>
            <dt className="text-ink-2 text-xs">Thời hạn</dt>
            <dd className="text-ink mt-0.5 text-base whitespace-nowrap">
              <Figures>{formatNumber(item.duration_days)}</Figures> ngày
            </dd>
          </div>
        </dl>
      </div>

      {update.isError ? (
        <p role="alert" className="text-danger mt-2 text-xs">
          Chưa đổi được trạng thái bán. Vui lòng thử lại.
        </p>
      ) : null}
    </Panel>
  );
}

/** No longer offered: reference rows, read across, with the one way back. */
function StoppedPanel({
  items,
  onNotice,
}: {
  items: PackageTypeResponse[];
  onNotice: Notify;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Đã ngừng bán"
        description="Không hiện ở màn hình bán gói. Bán lại để đưa gói trở về danh mục đang bán."
      />
      <DataTable caption="Gói đã ngừng bán" minWidth="44rem">
        <thead>
          <tr>
            <Th>Tên gói</Th>
            <Th>Hình thức lớp</Th>
            <Th numeric>Số buổi</Th>
            <Th numeric>Thời hạn</Th>
            <Th numeric>Giá</Th>
            <Th>
              <span className="sr-only">Thao tác</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <StoppedRow key={item.id} item={item} onNotice={onNotice} />
          ))}
        </tbody>
      </DataTable>
    </Panel>
  );
}

function StoppedRow({ item, onNotice }: { item: PackageTypeResponse; onNotice: Notify }) {
  const { update, toggle } = useSellingToggle(item, onNotice);

  return (
    <Tr>
      <Td className="font-medium">{item.name}</Td>
      <Td className="text-ink-2">{CLASS_TYPE_LABEL[item.class_type]}</Td>
      <Td numeric>
        <Figures>{formatNumber(item.credits)}</Figures>
      </Td>
      <Td numeric>
        <span className="whitespace-nowrap">
          <Figures>{formatNumber(item.duration_days)}</Figures> ngày
        </span>
      </Td>
      <Td numeric>
        {item.price === null ? (
          <PendingFact label={`Giá gói ${item.name}`} />
        ) : (
          <Figures className="whitespace-nowrap">{formatVnd(item.price)}</Figures>
        )}
      </Td>
      <Td className="text-right">
        <Button
          size="sm"
          className="max-sm:min-h-11"
          variant="secondary"
          pending={update.isPending}
          onClick={toggle}
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
        >
          Bán lại
        </Button>
        {update.isError ? (
          <p role="alert" className="text-danger mt-1 text-xs">
            Chưa bán lại được.
          </p>
        ) : null}
      </Td>
    </Tr>
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
