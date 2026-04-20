import { expect, test } from "@playwright/test";

test.setTimeout(75_000);

test("free alpha invite page shows clear tester-facing guidance", async ({
  page,
}) => {
  await page.goto("/beta?cohort=alpha&offer=free&code=alpha-wave-1");

  await expect(
    page.getByRole("heading", {
      name: "Welcome to the early Positives release.",
    })
  ).toBeVisible();
  await expect(page.getByText("Private Alpha Invite")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free alpha access" })).toBeVisible();
  await expect(
    page.getByText("Your total should be $0 for the alpha period.", {
      exact: false,
    })
  ).toBeVisible();
  await expect(page.getByText("Choose the membership level you want to test.")).toBeVisible();
});

test("paid-test alpha invite page explains the real billing path", async ({ page }) => {
  await page.goto("/beta?cohort=alpha&offer=paid-test&code=alpha-billing");

  await expect(page.getByRole("heading", { name: "Billing test access" })).toBeVisible();
  await expect(page.getByText("No promo code needed.")).toBeVisible();
  await expect(
    page.getByText("This path uses a real payment so we can test Stripe", {
      exact: false,
    })
  ).toBeVisible();
  await expect(page.getByText("Complete checkout with your normal card.")).toBeVisible();
});
