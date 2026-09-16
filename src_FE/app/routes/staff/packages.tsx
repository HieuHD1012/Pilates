import { usePackageDefinitions } from "~/features/commerce/queries";
import type { ClassType, PackageDefinition } from "~/lib/api/types";
import { formatNumber, formatVnd } from "~/lib/format";
import { DataTable, Td, Th } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/packages";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Gói tập — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * Which class types a package may be spent on, written out. A row of two pills
 * would spend a column on decoration for a fact that is read once, not filtered.
 */
function classTypeWords(types: ClassType[]): string | null {
  const group = types.includes("group");
  const priv = types.includes("private");
  if (group && priv) return "Lớp nhóm và lớp riêng";
  if (group) return "Lớp nhóm";
  if (priv) return "Lớp riêng";
  return null;
}

/**
 * The packages the studio sells.
 *
 * The winning subject is the package definition; every column is one of its
 * terms — buổi, ngày, giá — which is exactly the case a table exists for: four
 * comparable figures read down, not across. Prices and validity come from the
 * backend, never from this file (AGENTS.md rule 19).
 *
 * Creating and editing a package are out of scope and have no endpoint, so the
 * screen carries no form and no disabled button — it says so in a sentence.
 */
export default function StaffPackages() {
  const query = usePackageDefinitions();

  const items = query.data;
  const onSaleCount = (items ?? []).filter((item) => item.onSale).length;

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Gói tập"
        description="Danh mục gói studio đang bán: số buổi, thời hạn sử dụng và giá niêm yết."
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

      <DemoDataNotice className="mt-5 mb-3" />

      <QueryBoundary
        query={query}
        skeletonRows={5}
        emptyTitle="Chưa có gói tập nào"
        emptyDescription="Danh mục sẽ xuất hiện khi studio thiết lập gói bán trong hệ thống."
        errorDescription="Không tải được danh mục gói tập."
        showErrorDetail
      >
        {(definitions) => (
          <>
            {/* 1440 / 1024: six terms read down as columns. */}
            <div className="hidden lg:block">
              <DataTable caption="Danh mục gói tập" minWidth="54rem">
                <thead>
                  <tr>
                    <Th>Tên gói</Th>
                    <Th numeric>Số buổi</Th>
                    <Th numeric>Thời hạn</Th>
                    <Th numeric>Giá</Th>
                    <Th>Hình thức lớp</Th>
                    <Th>Trạng thái</Th>
                  </tr>
                </thead>
                <tbody>
                  {definitions.map((item) => (
                    <tr key={item.id}>
                      <Td>{item.name}</Td>
                      <Td numeric>
                        <Figures>{formatNumber(item.sessions)}</Figures>
                      </Td>
                      <Td numeric>
                        <span className="whitespace-nowrap">
                          <Figures>{formatNumber(item.validityDays)}</Figures> ngày
                        </span>
                      </Td>
                      <Td numeric>
                        <Figures className="whitespace-nowrap">
                          {formatVnd(item.price)}
                        </Figures>
                      </Td>
                      <Td>{classTypeWords(item.allowedClassTypes) ?? <Placeholder />}</Td>
                      <Td>
                        {item.onSale ? (
                          <StatusBadge tone="positive">Đang bán</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Ngừng bán</StatusBadge>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            {/* Below lg the table becomes ruled rows — a studio phone is not
                asked to render six columns (docs/RESPONSIVE.md). */}
            <ul className="rule-t lg:hidden">
              {definitions.map((item) => (
                <li key={item.id} className="rule-b">
                  <PackageRow item={item} />
                </li>
              ))}
            </ul>

            <p className="rule-t measure-wide text-ink-2 mt-8 pt-3 text-xs">
              Màn hình này chỉ để xem danh mục. Thêm gói mới hoặc đổi giá chưa có trong hệ
              thống, nên không có nút cho hai việc đó ở đây.
            </p>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function PackageRow({ item }: { item: PackageDefinition }) {
  const types = classTypeWords(item.allowedClassTypes);

  return (
    <div className="grid gap-x-6 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
      <div className="min-w-0">
        <p className="text-ink text-sm">{item.name}</p>
        <p className="text-ink-2 mt-1 text-xs">
          <Figures className="text-ink">{formatNumber(item.sessions)}</Figures> buổi
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <Figures className="text-ink">{formatNumber(item.validityDays)}</Figures> ngày
        </p>
        <p className="text-ink-2 mt-1 text-xs">{types ?? <Placeholder />}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-end">
        <Figures className="text-ink text-sm whitespace-nowrap">
          {formatVnd(item.price)}
        </Figures>
        {item.onSale ? (
          <StatusBadge tone="positive">Đang bán</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Ngừng bán</StatusBadge>
        )}
      </div>
    </div>
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
