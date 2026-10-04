import fs from "node:fs";

const contract = JSON.parse(
  fs.readFileSync(process.argv[2] ?? "visual-qa/live/openapi.json", "utf8"),
);
const consumers = new Map();
for (const line of fs.readFileSync("docs/API_MAPPING.md", "utf8").split("\n")) {
  const cells = line.split("|").map((cell) => cell.trim());
  if (/^`(?:GET|POST|PATCH|DELETE)`$/.test(cells[1] ?? ""))
    consumers.set(`${cells[1].slice(1, -1)} ${cells[2].slice(1, -1)}`, cells);
}
const cases = {
  accounts: "people, auth-session, routes",
  auth: "public-auth, auth-session, rate-limit, routes",
  public: "public-auth, announcements, photos, routes",
  leads: "public-auth",
  students: "people, photos, data-boundaries, routes",
  trainers: "people, photos, routes",
  announcements: "announcements",
  "package-types": "commerce",
  packages: "commerce, bookings, production-api, routes",
  payments: "commerce, routes",
  classes: "schedule, trainer, data-boundaries, routes",
  bookings: "bookings, trainer, production-api",
  "my-schedule": "bookings, trainer, production-api, routes",
  renewals: "reports, routes",
  reports: "reports, commerce, data-boundaries, routes",
  health: "live-preflight (operational)",
};
const shape = (schema) => {
  if (!schema) return "—";
  if (schema.$ref) return schema.$ref.split("/").at(-1);
  if (schema.anyOf) return schema.anyOf.map(shape).join(" or ");
  if (schema.type === "array") return `${shape(schema.items)}[]`;
  if (schema.enum) return schema.enum.join(", ");
  return `${schema.type ?? "object"}${schema.format ? ` (${schema.format})` : ""}`;
};
const rows = [];
for (const [path, routes] of Object.entries(contract.paths))
  for (const [method, operation] of Object.entries(routes)) {
    if (!["get", "post", "patch", "delete"].includes(method)) continue;
    const key = `${method.toUpperCase()} ${path}`;
    const consumer = consumers.get(key);
    if (!consumer) throw new Error(`Missing mapping: ${key}`);
    const parameters =
      (operation.parameters ?? [])
        .map(
          (param) =>
            `${param.in}: ${param.name}${param.required ? "*" : ""} (${shape(param.schema)})`,
        )
        .join("<br>") || "—";
    const body =
      Object.entries(operation.requestBody?.content ?? {})
        .map(([media, entry]) => `${media}: ${shape(entry.schema)}`)
        .join("<br>") || "—";
    const response = Object.entries(operation.responses)
      .filter(([status]) => status.startsWith("2"))
      .flatMap(([status, entry]) =>
        Object.entries(entry.content ?? { "no body": {} }).map(
          ([media, value]) => `${status} ${media}: ${shape(value.schema)}`,
        ),
      )
      .join("<br>");
    const group = path.split("/")[1];
    const tests = path.includes("progress-photos") ? "photos" : cases[group];
    rows.push(
      `| \`${key}\` | ${consumer[3]} | ${consumer[4]}<br>${consumer[5]}<br>${consumer[6]} | ${parameters} | ${body} | ${response} | ${tests} |`,
    );
  }
fs.writeFileSync(
  "docs/API_VERIFICATION_MATRIX.md",
  [
    "# FE–BE verification matrix",
    "",
    "Generated from backend OpenAPI and API_MAPPING.md. Regenerate with `node scripts/write-api-matrix.mjs visual-qa/live/openapi.json`. All test names below refer to `e2e/<name>.live.spec.ts`. This is a contract and test index, not a claim that a run passed. Actual passing case names and successful browser requests are in each CI round's `test-results/api-coverage.json` and `.md`.",
    "",
    "## Contract checks",
    "",
    "`check-api-contract.mjs` compares 90 OpenAPI models with FE types: required properties, nullable values, primitive kinds and enum values. Nested models are checked independently. Endpoint path bindings have their own unit test. Browser coverage requires a successful real request from a passing UI test for every business endpoint; API fixture calls do not count. `/health` is the sole operational exception; readiness also logs in and executes an authenticated database query.",
    "",
    "Money responses retain decimal strings. Lists are bare arrays and UI uses limit/offset. Dates retain ISO dates; class writes use studio offsets and reads are formatted in Asia/Ho_Chi_Minh. Multipart images are validated/decoded by BE and read with the correct authorization. Export cases parse the downloaded CSV/XLSX and compare every row with the same BE filter.",
    "",
    "## Business flows",
    "",
    "| Business | UI operation | Tests |",
    "| --- | --- | --- |",
    "| Public acquisition | Packages, trainers, timetable, published news; consultation → staff lead edit → student conversion | public-auth, announcements, photos |",
    "| Authentication and access | Four-role UI login/deep links/reload, refresh, logout, lock/unlock, email reset/expiry/reuse, 429 backoff | routes, auth-session, public-auth, people, rate-limit |",
    "| Profiles and media | Student creation/edit/account invitation; trainer creation/link/publication; own profile; authenticated photo upload/read/admin deletion | people, public-auth, photos |",
    "| Packages and money | Catalogue create/edit and frozen snapshots; sale, renewal, adjustment with reason, receipt confirm/VOID and revenue reconciliation | commerce |",
    "| Timetable | Group/Private, recurrence preview/create, conflicting trainer slot, trainer reassignment, class cancellation/refund, midnight | schedule, data-boundaries |",
    "| Reservations | Debit/refund once, move/rollback, last-seat race, duplicate refusal, wrong type/empty/expired package | bookings, production-api |",
    "| Attendance | Assigned trainer marks/corrects finished class, student reads history, unchanged ledger | trainer |",
    "| Renewals and reports | Contact log/history, dashboard/revenue/class/trainer filters and parsed downloads | reports, commerce, data-boundaries, routes |",
    "| Data states | More than 200 rows, directory pagination, empty search/report, absent optional fields, timezone crossing midnight, real offline write and retry | data-boundaries, people |",
    "",
    "## Endpoint → permission → query/mutation → contract → tests",
    "",
    "An asterisk marks a required parameter. Permissions are the consumer contract; finer own-profile/class authorization is exercised by the live negative cases and BE permission tests.",
    "",
    "| Endpoint | Permission | Binding / cache / actual consumer | Parameters | Request | Success response | Live test group |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## State propagation",
    "",
    "Mutations await TanStack Query invalidation. Booking refreshes rosters, capacities, packages/ledger, renewals, reports and public schedule; commerce refreshes packages, payments, overview, eligibility and revenue; schedule refreshes classes, rosters, student schedule and reports; attendance refreshes roster/history/reports; announcement changes invalidate both workspace and public news. See app/lib/api/invalidation.ts and its unit test. Other browser sessions use existing refetch/reload rather than a new realtime transport. Live tests check the affected API/ledger and reread the relevant UI across sessions.",
    "",
    "Precise cancellation boundaries (before/equal/after 4h Group and 1h Private), concurrent double spend and transactional rollback also run in BE tests with controlled clocks and independent transactions. Live tests check the allowed/denied UI states; the disposable DB time fixture never adds a clock API to the product. The seven existing ledger invariants are checked across the whole database after each fresh run.",
    "",
  ].join("\n"),
);
console.log(`Generated matrix for ${rows.length} endpoints.`);
