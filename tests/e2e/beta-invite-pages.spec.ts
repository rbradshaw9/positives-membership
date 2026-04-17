import { expect, test } from "@playwright/test";

test("free alpha invite page shows the correct cohort and access-path guidance", async ({
  page,
}) => {
  await page.goto("/beta?cohort=alpha&offer=free&code=alpha-wave-1");

  await expect(
    page.getByRole("heading", {
      name: "You’re invited to help shape Positives before launch.",
    })
  ).toBeVisible();
  await expect(page.getByText("Private Alpha")).toBeVisible();
  await expect(page.getByText("Cohort: alpha", { exact: false })).toBeVisible();
  await expect(page.getByText("access path: free alpha", { exact: false })).toBeVisible();
  await expect(page.getByText("invite code: alpha-wave-1", { exact: false })).toBeVisible();
  await expect(
    page.getByText("A zero-dollar alpha checkout still creates the real account", {
      exact: false,
    })
  ).toBeVisible();
});

test("paid-test alpha invite page explains the real billing path", async ({ page }) => {
  await page.goto("/beta?cohort=alpha&offer=paid-test&code=alpha-billing");

  await expect(page.getByText("access path: paid billing test", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Please complete checkout with your normal card.", { exact: false })
  ).toBeVisible();
  await expect(
    page.getByText("/beta?cohort=alpha&offer=paid-test&code=alpha-billing", {
      exact: false,
    })
  ).toBeVisible();
});
