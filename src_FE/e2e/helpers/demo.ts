import { expect, type Page } from "@playwright/test";

export async function openDemo(page: Page, path: string, role = "ADMIN") {
  await page.goto("/");
  await page.evaluate((value) => localStorage.setItem("soul:demo-role", value), role);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

/** Fixture-only setup/read; the transaction under test still uses the UI. */
export async function readDemo<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (url) => {
    const response = await fetch(`/api${url}`);
    if (!response.ok) throw new Error(`Fixture read ${response.status}`);
    return response.json();
  }, path);
}

export function studioDay(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(Date.now() + offset * 86400000),
  );
}
