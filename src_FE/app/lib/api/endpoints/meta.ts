import { api } from "../client";

/** `docs/api/meta/` — liveness only; it does not touch the database. */
export const metaApi = {
  /** `GET /health` */
  health: () => api.get<Record<string, unknown>>("/health", { anonymous: true }),
};
