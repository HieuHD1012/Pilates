import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openDemo, readDemo } from "./helpers/demo";

// Normal-state inventory. Transaction/failure cases live in the feature specs;
// this does not substitute for staging, keyboard or screen-reader acceptance.
const groups = {
  ADMIN: [
    "/studio/tong-quan",
    "/studio/lich",
    "/studio/lich/1",
    "/studio/khach-quan-tam",
    "/studio/khach-quan-tam/1",
    "/studio/hoc-vien",
    "/studio/hoc-vien/1",
    "/studio/huan-luyen-vien",
    "/studio/huan-luyen-vien/1",
    "/studio/goi-tap",
    "/studio/thanh-toan",
    "/studio/so-buoi",
    "/studio/gia-han",
    "/studio/bao-cao",
    "/studio/bao-cao/doanh-thu",
    "/studio/bao-cao/lop-hoc",
    "/studio/bao-cao/huan-luyen-vien",
    "/studio/tai-khoan",
  ],
  STUDENT: [
    "/hv/lop-hoc",
    "/hv/lop-hoc/1",
    "/hv/lich-cua-toi",
    "/hv/lich-su",
    "/hv/goi-tap",
    "/hv/tai-khoan",
  ],
  TRAINER: ["/hlv/hom-nay", "/hlv/lich-day", "/hlv/lop/:own", "/hlv/ho-so"],
};

for (const [role, paths] of Object.entries(groups)) {
  for (const path of paths) {
    test(`${role} normal screen ${path}`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let target = path;
      if (path.endsWith(":own")) {
        await openDemo(page, "/hlv/hom-nay", role);
        const sessions = await readDemo<{ id: number }[]>(page, "/classes/my-schedule");
        expect(sessions.length).toBeGreaterThan(0);
        target = `/hlv/lop/${sessions[0]!.id}`;
      }
      await openDemo(page, target, role);
      await expect(page).toHaveURL(new RegExp(`${target}$`));
      await expect(page.getByRole("heading", { level: 1 }).first()).not.toContainText(
        /Không tìm thấy|Không mở được/,
      );
      await expect(page.locator(".animate-skeleton")).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
      // Await finite transitions so an animation is not mistaken for contrast.
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        audit.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath("screen.png"), fullPage: true });
    });
  }
}
