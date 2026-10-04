import fs from "node:fs";
import ts from "typescript";

const input = process.argv[2];
if (!input)
  throw new Error("Usage: node scripts/check-api-contract.mjs <backend-openapi.json>");
const api = JSON.parse(fs.readFileSync(input, "utf8"));
const file = "app/lib/api/schema.ts";
const program = ts.createProgram([file], { strict: true, target: ts.ScriptTarget.ESNext });
const checker = program.getTypeChecker();
const source = program.getSourceFile(file);
const exports = new Map(
  checker
    .getExportsOfModule(checker.getSymbolAtLocation(source))
    .map((symbol) => [symbol.name, checker.getDeclaredTypeOfSymbol(symbol)]),
);
const aliases = {
  AccountCreate: "AccountCreateRequest",
  AccountUpdate: "AccountUpdateRequest",
  AnnouncementCreate: "AnnouncementCreateRequest",
  AnnouncementUpdate: "AnnouncementUpdateRequest",
  BookingCreate: "BookingCreateRequest",
  ClassSessionCreate: "ClassCreateRequest",
  ClassSessionDetail: "ClassSessionDetailResponse",
  ChangeTrainerRequest: "AssignTrainerRequest",
  LeadCreate: "PublicLeadRequest",
  LeadUpdate: "LeadUpdateRequest",
  PackageTypeCreate: "PackageTypeCreateRequest",
  PackageTypeUpdate: "PackageTypeUpdateRequest",
  StudentCreate: "StudentCreateRequest",
  StudentUpdate: "StudentUpdateRequest",
  StudentOverview: "StudentOverviewResponse",
  TrainerCreate: "TrainerCreateRequest",
  TrainerUpdate: "TrainerUpdateRequest",
  TrainerMonthlyStats: "TrainerMonthStatsResponse",
  RecurrenceCreatedResponse: "RecurrenceCreateResponse",
  RenewalContactCreate: "RenewalContactRequest",
  PackageStatus: "StudentPackageStatus",
  LedgerReason: "LedgerReasonCode",
};
const ignored = new Set(["HTTPValidationError", "ValidationError"]);
const failures = [];
let checked = 0;
function backendKinds(schema) {
  if (schema.$ref)
    return backendKinds(api.components.schemas[schema.$ref.split("/").at(-1)]);
  if (schema.anyOf)
    return new Set(schema.anyOf.flatMap((branch) => [...backendKinds(branch)]));
  return new Set([schema.type === "integer" ? "number" : schema.type]);
}
function frontendKinds(type) {
  if (type.isUnion())
    return new Set(type.types.flatMap((branch) => [...frontendKinds(branch)]));
  const flags = type.flags;
  if (flags & ts.TypeFlags.Undefined) return new Set();
  if (flags & ts.TypeFlags.Null) return new Set(["null"]);
  if (flags & ts.TypeFlags.StringLike) return new Set(["string"]);
  if (flags & ts.TypeFlags.NumberLike) return new Set(["number"]);
  if (flags & ts.TypeFlags.BooleanLike) return new Set(["boolean"]);
  return new Set([checker.isArrayType(type) ? "array" : "object"]);
}
for (const [name, schema] of Object.entries(api.components.schemas)) {
  if (ignored.has(name) || name.startsWith("Body_upload_")) continue; // multipart checked by live upload tests
  const type = exports.get(aliases[name] ?? name);
  if (!type) {
    failures.push(`${name}: no FE type`);
    continue;
  }
  checked++;
  const isRequest = /(?:Request|Create|Update)$/.test(name);
  if (schema.enum) {
    const variants = type.isUnion() ? type.types : [type];
    const values = variants.map((variant) => variant.value).sort();
    if (JSON.stringify(values) !== JSON.stringify([...schema.enum].sort()))
      failures.push(`${name}: enum differs`);
    continue;
  }
  const properties = new Map(
    type.getProperties().map((property) => [property.name, property]),
  );
  for (const [field, definition] of Object.entries(schema.properties ?? {})) {
    const property = properties.get(field);
    if (!property) {
      failures.push(`${name}.${field}: missing FE field`);
      continue;
    }
    const optional = Boolean(property.flags & ts.SymbolFlags.Optional);
    if ((schema.required ?? []).includes(field) && optional)
      failures.push(`${name}.${field}: required in BE, optional in FE`);
    const actual = frontendKinds(checker.getTypeOfSymbolAtLocation(property, source));
    const expected = backendKinds(definition);
    if (
      [...actual].some((kind) => !expected.has(kind)) ||
      (!isRequest && [...expected].some((kind) => !actual.has(kind)))
    ) {
      failures.push(`${name}.${field}: BE ${[...expected]} / FE ${[...actual]}`);
    }
  }
  for (const field of properties.keys())
    if (!schema.properties?.[field]) failures.push(`${name}.${field}: absent in BE`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `OpenAPI contract: ${checked} schemas matched (fields, required, nullable, primitive types and enums). Nested schemas are checked independently; date/decimal formats and multipart are verified in live cases.`,
);
