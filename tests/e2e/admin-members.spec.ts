import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  getAdminMemberSupportSnapshot,
  MEMBER_EMAIL,
  loginWithPassword,
  type AdminMemberSupportSnapshot,
  updateAdminMemberSupportFields,
} from "./helpers";

test.describe.configure({ mode: "serial" });

let originalMemberSupportState: AdminMemberSupportSnapshot | null = null;

test.afterAll(async () => {
  if (originalMemberSupportState) {
    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberSupportState);
  }
});

test.describe("admin member operations", () => {
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

  test("admin detail flags canceled, incomplete, and billing-handoff edge cases", async ({
    page,
  }) => {
    originalMemberSupportState = await getAdminMemberSupportSnapshot(MEMBER_EMAIL);

    await updateAdminMemberSupportFields(MEMBER_EMAIL, {
      name: null,
      stripe_customer_id: null,
      subscription_status: "canceled",
      subscription_tier: "level_1",
      subscription_end_date: "2099-04-30T12:00:00.000Z",
      password_set: false,
      practice_streak: 0,
      last_practiced_at: null,
    });

    try {
      await loginWithPassword(page, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        next: "/admin/members",
      });

      await page.getByLabel("Search by email or name").fill(MEMBER_EMAIL);
      await page.getByRole("button", { name: "Filter" }).click();
      await expect(page.getByRole("link", { name: MEMBER_EMAIL })).toBeVisible();
      await page.getByRole("link", { name: MEMBER_EMAIL }).click();

      await expect(page.getByRole("heading", { name: MEMBER_EMAIL })).toBeVisible();
      await expect(page.getByText("Support flags")).toBeVisible();
      await expect(page.getByText("Missing Stripe customer link")).toBeVisible();
      await expect(page.getByText("Canceled membership")).toBeVisible();
      await expect(page.getByText("Password not set")).toBeVisible();
      await expect(page.getByText("No practice activity yet")).toBeVisible();
      await expect(page.getByText("Not linked")).toBeVisible();
      await expect(page.getByText("No — magic link only")).toBeVisible();
    } finally {
      await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberSupportState);
      originalMemberSupportState = null;
    }
  });
});
