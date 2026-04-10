import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ensureAdminMonthWorkspaceFixture,
  loginWithPassword,
} from "./helpers";

test("admin month workspace smoke test covers daily weekly monthly and publish-all flow", async ({
  page,
}) => {
  const fixture = await ensureAdminMonthWorkspaceFixture();

  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/months",
  });

  await page.goto(`/admin/months/${fixture.monthId}`);

  await expect(page.getByRole("heading", { name: fixture.label })).toBeVisible();
  await expect(page.getByText("📹 Monthly Masterclass")).toBeVisible();
  await page.getByText("📹 Monthly Masterclass").click();
  await expect(page.locator("#mc-title")).toHaveValue(fixture.titles.monthly);
  await expect(page.getByRole("link", { name: fixture.titles.weekly })).toBeVisible();

  const dailyGridSection = page
    .locator(".admin-section")
    .filter({ has: page.getByText("Daily Audio Grid") });

  await expect(dailyGridSection).toContainText("1/30 filled");
  await expect(
    dailyGridSection.getByRole("link", { name: fixture.titles.assignedDaily })
  ).toBeVisible();

  await dailyGridSection.getByRole("combobox").first().selectOption({
    label: fixture.titles.unassignedDaily,
  });
  await dailyGridSection.getByRole("button", { name: "+ Assign" }).first().click();

  await expect(page).toHaveURL(new RegExp(`/admin/months/${fixture.monthId}$`));
  await expect(dailyGridSection).toContainText("2/30 filled");
  await expect(
    dailyGridSection.getByRole("link", { name: fixture.titles.unassignedDaily })
  ).toBeVisible();

  await page.getByRole("button", { name: "Publish All" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/admin/months/${fixture.monthId}\\?success=published$`)
  );
  await expect(page.getByText("Month and all content published.")).toBeVisible();
  await expect(page.locator(".admin-month-status-row")).toContainText("Published");
  await expect(page.getByRole("button", { name: "Publish All" })).toHaveCount(0);
  await expect(
    page.locator(".admin-section").filter({ has: page.getByText("📹 Monthly Masterclass") })
  ).toContainText("Published");
  await expect(
    page.locator(".admin-section").filter({ has: page.getByText("📝 Weekly Reflections") })
  ).toContainText("Published");
});
