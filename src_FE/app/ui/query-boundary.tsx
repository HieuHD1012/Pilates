import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { EmptyState, ErrorState, RefreshingRule, SkeletonRows } from "./feedback";

/**
 * The four remote states, in one place.
 *
 * Every data-bearing screen in this product was repeating the same four-branch
 * conditional — pending, error, empty, content — which is how a screen ends up
 * shipping three of the four. This owns the sequence; the screen owns the row.
 *
 * Two deliberate differences from the usual version of this component:
 *  - it renders `isPending`, not `isLoading`. A query that has never fetched is
 *    pending; `isLoading` is pending-and-fetching and misses paused queries,
 *    which is exactly the offline case a studio phone hits.
 *  - it never shows `error.message`. Backend text is not user copy
 *    (docs/QUERY_CONVENTIONS.md). Staff surfaces may opt into `detail`.
 */
export function QueryBoundary<T>({
  query,
  children,
  skeletonRows = 5,
  loading,
  isEmpty,
  emptyTitle = "Chưa có dữ liệu",
  emptyDescription = "Chưa có gì để hiển thị ở đây.",
  emptyAction,
  errorDescription = "Không tải được dữ liệu. Vui lòng thử lại.",
  showErrorDetail = false,
}: {
  query: UseQueryResult<T, Error>;
  children: (data: T) => ReactNode;
  /** Rows in the default skeleton. Ignored when `loading` is given. */
  skeletonRows?: number;
  /** A skeleton shaped like the actual content, when rows are the wrong shape. */
  loading?: ReactNode;
  /** Defaults to an empty array check. */
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  errorDescription?: string;
  /** Staff-only: surface the backend's own message for triage. */
  showErrorDetail?: boolean;
}) {
  if (query.isPending) {
    return <>{loading ?? <SkeletonRows rows={skeletonRows} />}</>;
  }

  if (query.isError) {
    return (
      <ErrorState
        description={errorDescription}
        detail={showErrorDetail ? query.error.message : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data as T;
  const empty = isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0;

  if (empty) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return (
    <>
      {/* Existing rows stay on screen while new ones load — a studio tab that
          blanks on every refetch is unusable. */}
      <RefreshingRule active={query.isFetching} />
      {children(data)}
    </>
  );
}
