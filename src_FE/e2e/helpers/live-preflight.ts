import { request } from "@playwright/test";

export default async function preflight() {
  const base = process.env.LIVE_API_URL!;
  if (
    process.env.ENVIRONMENT !== "test" ||
    !process.env.DATABASE_URL?.endsWith("/pilates_fe_test")
  )
    throw new Error(
      "Only ENVIRONMENT=test and the isolated pilates_fe_test database are allowed.",
    );
  const api = await request.newContext({ baseURL: base });
  try {
    const health = await api.get("/health");
    if (!health.ok()) throw new Error("API liveness failed");
    const login = await api.post("/auth/login", {
      data: {
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
      },
    });
    if (!login.ok())
      throw new Error(`API database/auth readiness failed (${login.status()})`);
    const token = (await login.json()).access_token;
    const rows = await api.get("/students?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!rows.ok()) throw new Error(`Database query readiness failed (${rows.status()})`);
  } finally {
    await api.dispose();
  }
}
