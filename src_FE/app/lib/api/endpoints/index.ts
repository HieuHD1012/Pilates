/**
 * Every endpoint the backend serves, in one place.
 *
 * 88 endpoints, 16 modules, one function each. The table that pairs them with
 * the screens that call them is `docs/API_MAPPING.md`; the contract they
 * implement is `../../../../docs/api/`.
 */

export { accountsApi } from "./accounts";
export { announcementsApi } from "./announcements";
export { authApi } from "./auth";
export { bookingsApi } from "./bookings";
export { classesApi } from "./classes";
export { leadsApi } from "./leads";
export { metaApi } from "./meta";
export { myScheduleApi } from "./my-schedule";
export { packagesApi } from "./packages";
export { paymentsApi } from "./payments";
export { progressPhotosApi } from "./progress-photos";
export { publicApi } from "./public";
export { renewalsApi } from "./renewals";
export { reportsApi } from "./reports";
export { studentsApi } from "./students";
export { trainersApi } from "./trainers";
