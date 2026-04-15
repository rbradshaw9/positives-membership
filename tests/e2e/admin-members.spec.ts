import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  MEMBER_EMAIL,
  loginWithPassword,
} from "./helpers";

test("admin can find a member and open operational detail", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/members",
  });

  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

  await page.getByLabel("Search by email or name").fill(MEMBER_EMAIL);
  await page.getByRole("button", { name: "Filter" }).click();

  await expect(page.getByRole("link", { name: MEMBER_EMAIL })).toBeVisible();
  await page.getByRole("link", { name: MEMBER_EMAIL }).click();

  await expect(page.getByRole("heading", { name: /Ryan \(L1 Test\)|rbradshaw\+l1@gmail\.com/ })).toBeVisible();
  await expect(page.getByText("Profile")).toBeVisible();
  await expect(page.getByText("Billing is managed exclusively in Stripe.")).toBeVisible();
  await expect(page.getByText("Recent Activity")).toBeVisible();
});
