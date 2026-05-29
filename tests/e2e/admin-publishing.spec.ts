import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ensureAdminMonthWorkspaceFixture,
  loginWithPassword,
} from "./helpers";

test("authenticated admin month workspace covers setup, weekly drafts, daily assignment, and publish flow", async ({
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
  await expect(page.getByText("Setup progress")).toBeVisible();
  await expect(page.getByRole("link", { name: /Monthly theme/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Weekly principles/ })).toBeVisible();
  await expect(page.getByText("Preview opens when this month is active.")).toBeVisible();

  const monthlyThemeSection = page
    .locator(".admin-section")
    .filter({ has: page.getByText("Monthly theme") });
  await expect(monthlyThemeSection).toContainText(fixture.titles.monthly);
  await monthlyThemeSection.getByRole("button", { name: /Edit/ }).click();
  await expect(page.locator("#mc-title")).toHaveValue(fixture.titles.monthly);

  await expect(page.getByRole("link", { name: fixture.titles.weekly })).toBeVisible();
  const weeklySection = page
    .locator(".admin-section")
    .filter({ has: page.getByText("Weekly principles") });
  await expect(weeklySection).toContainText("Create missing drafts");
  await weeklySection.getByRole("button", { name: "Create missing drafts" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/months/${fixture.monthId}\\?success=weekly_created$`)
  );
  await expect(page.getByText("Weekly principle drafts created.")).toBeVisible();

  const dailyGridSection = page
    .locator(".admin-section")
    .filter({ has: page.getByText("Daily audio") });

  await expect(dailyGridSection).toContainText("1/30");
  await expect(
    dailyGridSection.getByRole("link", { name: fixture.titles.assignedDaily })
  ).toBeVisible();

  await dailyGridSection.getByRole("combobox", { name: /Audio for/ }).first().selectOption({
    label: fixture.titles.unassignedDaily,
  });
  await dailyGridSection.getByRole("button", { name: /Assign audio to/ }).first().click();

  await expect(page).toHaveURL(new RegExp(`/admin/months/${fixture.monthId}$`));
  await expect(dailyGridSection).toContainText("2/30");
  await expect(
    dailyGridSection.getByRole("link", { name: fixture.titles.unassignedDaily })
  ).toBeVisible();

  await dailyGridSection.getByRole("button", { name: /Hide/ }).click();
  await expect(page.locator(".admin-cal-grid")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".admin-cal-grid")).toHaveCount(0);
  await dailyGridSection.getByRole("button", { name: /Show/ }).click();
  await expect(page.locator(".admin-cal-grid")).toBeVisible();

  await page.getByRole("button", { name: "Publish month" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/admin/months/${fixture.monthId}\\?success=published$`)
  );
  await expect(page.getByText("Month and all content published.")).toBeVisible();
  await expect(page.locator(".admin-month-status-row")).toContainText("Published");
  await expect(page.getByRole("button", { name: "Publish month" })).toHaveCount(0);
  await expect(
    page.locator(".admin-section").filter({ has: page.getByText("Monthly theme") })
  ).toContainText("Published");
  await expect(
    page.locator(".admin-section").filter({ has: page.getByText("Weekly principles") })
  ).toContainText("Published");
});
