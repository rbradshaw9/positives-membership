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

test("standalone content type selector reloads type-specific fields", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/content/new?type=daily_audio",
  });

  await expect(page.getByRole("heading", { name: "New content" })).toBeVisible();
  await expect(page.getByLabel(/Publish date/)).toBeVisible();

  await page.getByLabel(/Content type/).selectOption("coaching_call");

  await expect(page).toHaveURL(/\/admin\/content\/new\?type=coaching_call/);
  await expect(page.getByLabel(/Call date/)).toBeVisible();
  await expect(page.getByLabel("Zoom join URL")).toBeVisible();
  await expect(page.getByLabel(/Publish date/)).toHaveCount(0);
});
