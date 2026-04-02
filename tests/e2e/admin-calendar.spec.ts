import { expect, test } from "@playwright/test";
import { loginWithPassword, ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers";

test("admin calendar loads and create links prefill params", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/today",
  });

  await page.goto("/admin/content/calendar");
  await expect(page.getByRole("heading", { name: "Content Calendar" })).toBeVisible();

  const dailyCreateLink = page.locator('a[href*="/admin/content/new?type=daily_audio&publish_date="]').first();
  await expect(dailyCreateLink).toBeVisible();

  const href = await dailyCreateLink.getAttribute("href");
  expect(href).toContain("type=daily_audio");
  expect(href).toContain("publish_date=");

  await expect(
    page.locator('a[href*="/admin/content/new?type=weekly_principle&week_start="]').first()
  ).toBeVisible();
});
