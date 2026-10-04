import { spawnSync } from "node:child_process";
import { test, expect, fixture, signIn, call, ledger } from "./helpers/live";
import type {
  RenewalContactResponse,
  TrainerStatsResponse,
  TrainerClassSizeResponse,
} from "../app/lib/api/schema";

test("renewal contact is append-only and leaves credits unchanged across student detail", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  await call(
    request,
    "POST",
    `/packages/${data.sold.id}/adjust`,
    { delta: -5, reason: "Chuẩn bị nhắc gia hạn E2E" },
    data.token,
  );
  await signIn(page, data.staffAccount.email);
  await page.goto("/studio/gia-han");
  const card = page.getByRole("article", { name: data.student.full_name, exact: true });
  await card
    .getByLabel("Kết quả", { exact: true })
    .fill("Đã trao đổi và hẹn tư vấn gói mới");
  await card.getByRole("button", { name: "Đã liên hệ", exact: true }).click();
  await expect(
    card.getByText("Đã ghi nhận vào hồ sơ học viên.", { exact: true }),
  ).toBeVisible();
  const history = await call<RenewalContactResponse[]>(
    request,
    "GET",
    `/renewals/students/${data.student.id}/contacts`,
    undefined,
    data.token,
  );
  expect(history).toHaveLength(1);
  expect(history[0]!.result).toBe("Đã trao đổi và hẹn tư vấn gói mới");
  expect(history[0]!.next_contact_date).toBeNull();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(5);
  await page.goto(`/studio/hoc-vien/${data.student.id}`);
  await expect(page.getByText(history[0]!.result, { exact: true })).toBeVisible();
});

for (const kind of ["trainers", "class-sizes"] as const)
  for (const format of ["csv", "xlsx"] as const) {
    test(`${kind} ${format} browser download matches real report query and exact selected filter`, async ({
      page,
      request,
    }, info) => {
      const data = await fixture(request);
      await signIn(page, data.staffAccount.email);
      await page.goto(
        kind === "trainers" ? "/studio/bao-cao/huan-luyen-vien" : "/studio/bao-cao/lop-hoc",
      );
      const start = new Date(new Date(data.session.starts_at).getTime() - 86400000)
        .toISOString()
        .slice(0, 10);
      const end = new Date(new Date(data.session.ends_at).getTime() + 86400000)
        .toISOString()
        .slice(0, 10);
      await page.getByLabel("Từ ngày", { exact: true }).fill(start);
      await page.getByLabel("Đến ngày", { exact: true }).fill(end);
      await expect(page.locator(".animate-skeleton")).toHaveCount(0);
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", {
          name: format === "csv" ? "Xuất CSV" : "Xuất Excel",
          exact: true,
        })
        .click();
      const file = await download;
      expect(await file.failure()).toBeNull();
      const path = info.outputPath(`report.${format}`);
      await file.saveAs(path);
      const python =
        process.env.LIVE_PYTHON ??
        (process.platform === "win32"
          ? "../src_BE/.venv/Scripts/python.exe"
          : "../src_BE/.venv/bin/python");
      const parsed = spawnSync(python, ["-m", "scripts.read_test_export", path], {
        cwd: "../src_BE",
        encoding: "utf8",
        env: { ...process.env, PYTHONUTF8: "1" },
      });
      expect(parsed.status, parsed.stderr).toBe(0);
      const rows = JSON.parse(parsed.stdout) as string[][];
      const suffix = `?period_start=${start}&period_end=${end}`;
      if (kind === "trainers") {
        const api = await call<TrainerStatsResponse[]>(
          request,
          "GET",
          `/reports/trainers${suffix}`,
          undefined,
          data.token,
        );
        expect(rows.slice(1)).toEqual(
          api.map((row) => [
            row.trainer_name,
            String(row.scheduled_sessions),
            String(row.cancelled_sessions),
            String(row.total_bookings),
          ]),
        );
      } else {
        const api = await call<TrainerClassSizeResponse[]>(
          request,
          "GET",
          `/reports/trainers/class-sizes${suffix}`,
          undefined,
          data.token,
        );
        expect(rows.slice(1)).toEqual(
          api.map((row) => [
            row.trainer_name,
            ...[
              row.size_1,
              row.size_2,
              row.size_3,
              row.size_4,
              row.size_5,
              row.sessions_over_max,
              row.sessions_empty,
              row.total_sessions,
            ].map(String),
          ]),
        );
      }
    });
  }
