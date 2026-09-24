import { api } from "../client";
import type {
  AdjustCreditsRequest,
  PackageLedgerResponse,
  PackageTypeCreateRequest,
  PackageTypeListParams,
  PackageTypeResponse,
  PackageTypeUpdateRequest,
  RenewPackageRequest,
  SellPackageRequest,
  StudentPackageListParams,
  StudentPackageResponse,
} from "../schema";

/**
 * `docs/api/packages/` — two different things under one heading.
 *
 * `/package-types` is the catalogue the studio sells from. `/packages` is what
 * a student actually bought, carrying `*_snapshot` fields frozen at the sale so
 * that re-pricing the catalogue cannot rewrite last month's revenue.
 */
export const packagesApi = {
  /** `GET /package-types` */
  listTypes: (params: PackageTypeListParams = {}) =>
    api.get<PackageTypeResponse[]>("/package-types", { searchParams: params }),

  /** `POST /package-types` */
  createType: (body: PackageTypeCreateRequest) =>
    api.post<PackageTypeResponse>("/package-types", body),

  /**
   * `PATCH /package-types/{id}` — never touches packages already sold.
   * Withdrawing one from sale is `is_selling: false`; rows are never deleted,
   * because sold packages still point at them.
   */
  updateType: (packageTypeId: number, body: PackageTypeUpdateRequest) =>
    api.patch<PackageTypeResponse>(`/package-types/${packageTypeId}`, body),

  /** `GET /packages` — omitting `student_id` as a student pins it to yourself. */
  list: (params: StudentPackageListParams = {}) =>
    api.get<StudentPackageResponse[]>("/packages", { searchParams: params }),

  /** `POST /packages/sell` — creates the package and credits it in one transaction. */
  sell: (body: SellPackageRequest) =>
    api.post<StudentPackageResponse>("/packages/sell", body),

  /** `POST /packages/{id}/renew` — extra credits post as their own ledger entry. */
  renew: (packageId: number, body: RenewPackageRequest) =>
    api.post<StudentPackageResponse>(`/packages/${packageId}/renew`, body),

  /** `POST /packages/{id}/adjust` — ADMIN only, reason required. */
  adjust: (packageId: number, body: AdjustCreditsRequest) =>
    api.post<StudentPackageResponse>(`/packages/${packageId}/adjust`, body),

  /**
   * `GET /packages/{id}/ledger` — one student's one package. Render
   * `balance_after` per row; adding up `delta` in the client is how the screen
   * and the database start disagreeing.
   */
  ledger: (packageId: number) =>
    api.get<PackageLedgerResponse>(`/packages/${packageId}/ledger`),
};
