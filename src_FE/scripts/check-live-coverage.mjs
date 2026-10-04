import fs from "node:fs";
import path from "node:path";

const [contractPath, resultsPath, ...flags] = process.argv.slice(2);
if (!contractPath || !resultsPath)
  throw new Error(
    "Usage: node scripts/check-live-coverage.mjs openapi.json live-results.json [--report-only]",
  );
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const mapping = new Map();
for (const line of fs.readFileSync("docs/API_MAPPING.md", "utf8").split("\n")) {
  const cells = line.split("|").map((cell) => cell.trim());
  if (!/^`(?:GET|POST|PATCH|DELETE)`$/.test(cells[1] ?? "")) continue;
  mapping.set(`${cells[1].slice(1, -1)} ${cells[2].slice(1, -1)}`, {
    permission: cells[3],
    binding: cells[4],
    cache: cells[5],
    consumer: cells[6],
  });
}
const methods = new Set(["get", "post", "patch", "delete", "put"]);
const operations = Object.entries(contract.paths)
  .flatMap(([template, routes]) =>
    Object.entries(routes)
      .filter(([method]) => methods.has(method))
      .map(([method, operation]) => {
        const parts = template.split("/").map((part) => {
          if (!/^\{.+\}$/.test(part)) return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const parameter = operation.parameters?.find(
            (param) => param.in === "path" && param.name === part.slice(1, -1),
          );
          return parameter?.schema?.type === "integer" ? "[0-9]+" : "[^/]+";
        });
        const key = `${method.toUpperCase()} ${template}`;
        return {
          key,
          method: method.toUpperCase(),
          template,
          matcher: new RegExp(`^${parts.join("/")}$`),
          operational: key === "GET /health",
          ...mapping.get(key),
          parameters: operation.parameters ?? [],
          request: operation.requestBody ?? null,
          responses: operation.responses,
          cases: [],
        };
      }),
  )
  .sort(
    (a, b) =>
      b.template.replace(/\{[^}]+\}/g, "").length -
      a.template.replace(/\{[^}]+\}/g, "").length,
  );
const failures = [];
let testCount = 0;
function visit(suite) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests) {
      testCount++;
      const label = `${test.projectName}: ${spec.file} — ${spec.title}`;
      const result = test.results.at(-1);
      if (test.status !== "expected" || result?.status !== "passed") {
        failures.push(label);
        continue;
      }
      const evidence = result.attachments.find((item) => item.name === "mapping-evidence");
      if (!evidence?.body) {
        failures.push(`${label}: missing browser evidence`);
        continue;
      }
      for (const call of JSON.parse(
        Buffer.from(evidence.body, "base64").toString("utf8"),
      )) {
        if (call.status < 200 || call.status >= 300) continue;
        const operation = operations.find(
          (entry) => entry.method === call.method && entry.matcher.test(call.path),
        );
        if (operation && !operation.cases.includes(label)) operation.cases.push(label);
      }
    }
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of results.suites) visit(suite);
const missing = operations.filter((entry) => !entry.operational && !entry.cases.length);
const undocumented = operations.filter((entry) => !entry.consumer);
const report = {
  startedAt: results.stats.startTime,
  tests: testCount,
  passed: results.stats.expected,
  skipped: results.stats.skipped,
  failures,
  missing: missing.map((entry) => entry.key),
  endpoints: operations.map((operation) => {
    const entry = { ...operation };
    delete entry.matcher;
    return entry;
  }),
};
const output = path.join(path.dirname(resultsPath), "api-coverage.json");
fs.writeFileSync(output, JSON.stringify(report, null, 2));
fs.writeFileSync(
  output.replace(/\.json$/, ".md"),
  [
    "# Live browser API evidence",
    "",
    "Only successful requests triggered in the browser by passing UI tests count. API fixture setup and verification reads are excluded. `/health` is checked by readiness, with an authenticated database query in global setup.",
    "",
    `Tests: ${testCount}; passed: ${results.stats.expected}; skipped: ${results.stats.skipped}.`,
    "",
    "| Endpoint | Permission | Consumer | Passing browser cases |",
    "| --- | --- | --- | --- |",
    ...report.endpoints
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(
        (entry) =>
          `| \`${entry.key}\` | ${entry.permission ?? "UNDOCUMENTED"} | ${entry.consumer ?? "UNDOCUMENTED"} | ${entry.operational ? "Readiness" : entry.cases.join("<br>") || "MISSING"} |`,
      ),
    "",
  ].join("\n"),
);
console.log(
  `Live coverage: ${operations.length - missing.length}/${operations.length} endpoints including readiness; ${testCount} tests; evidence: ${output}`,
);
if (missing.length)
  console.error(
    `Missing browser consumers:\n${missing.map((entry) => entry.key).join("\n")}`,
  );
if (
  !flags.includes("--report-only") &&
  (missing.length ||
    undocumented.length ||
    failures.length ||
    results.stats.skipped ||
    results.stats.flaky ||
    results.errors.length ||
    !testCount)
)
  process.exitCode = 1;
