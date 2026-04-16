import { expect, test } from "@playwright/test";
import {
  ensureMemberStripeCustomer,
  loginWithPassword,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
} from "./helpers";

test.describe("member billing portal", () => {
  test("member can launch the Stripe billing center from /account", async ({ page }) => {
    await ensureMemberStripeCustomer(MEMBER_EMAIL);

    await loginWithPassword(page, {
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      next: "/account",
    });

    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open billing portal" })
    ).toBeVisible();

    await Promise.all([
      page.waitForURL(/billing\.stripe\.com/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Open billing portal" }).click(),
    ]);

    await expect(
      page.getByText("Manage your Positives membership in one calm place.")
    ).toBeVisible();
  });

  test("legacy /upgrade route hands active members into the billing center", async ({
    page,
  }) => {
    await ensureMemberStripeCustomer(MEMBER_EMAIL);

    await loginWithPassword(page, {
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      next: "/today",
    });

    await page.goto("/upgrade");
    await expect(page).toHaveURL(/billing\.stripe\.com/, { timeout: 20_000 });
    await expect(
      page.getByText("Manage your Positives membership in one calm place.")
    ).toBeVisible();
  });
});
