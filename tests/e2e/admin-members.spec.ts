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
  test("admin can open role permission management", async ({ page }) => {
    await loginWithPassword(page, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      next: "/admin/roles",
    });

    await expect(page.getByRole("heading", { name: "Admin Roles" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Super Admin" })).toBeVisible();
    await expect(page.getByText("Read members").first()).toBeVisible();
    await expect(page.getByText("Save role permissions").first()).toBeVisible();
  });

  test("admin can find a member and open operational detail", async ({ page }) => {
    await loginWithPassword(page, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      next: "/admin/members",
    });

    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

    await page.getByLabel("Search members").fill(MEMBER_EMAIL);
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByRole("link", { name: MEMBER_EMAIL })).toBeVisible();
    await page.getByRole("link", { name: MEMBER_EMAIL }).click();

    await expect(page.getByRole("heading", { name: /Ryan \(L1 Test\)|rbradshaw\+l1@gmail\.com/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Access" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

    const beforeUrl = page.url();
    const accessSection = page.locator("section#access");
    await accessSection.getByLabel("Change reason").fill("E2E verifies inline CRM save behavior.");
    await accessSection
      .getByLabel("I verified this change is authorized by the member/client or approved by the team.")
      .check();
    await accessSection.getByRole("button", { name: "Save member management fields" }).click();

    await expect(accessSection.getByRole("status")).toContainText("Member management fields saved.");
    expect(page.url()).toBe(beforeUrl);
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

      await page.getByLabel("Search members").fill(MEMBER_EMAIL);
      await page.getByRole("button", { name: "Search" }).click();
      await expect(page.getByRole("link", { name: MEMBER_EMAIL })).toBeVisible();
      await page.getByRole("link", { name: MEMBER_EMAIL }).click();

      await expect(page.getByRole("heading", { name: MEMBER_EMAIL })).toBeVisible();
      await expect(page.getByText("Canceled", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("No active access", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Magic-link / password not set")).toBeVisible();
      await expect(page.getByText("No practice tracked yet.")).toBeVisible();
      await expect(page.getByText("Not linked")).toBeVisible();
    } finally {
      await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberSupportState);
      originalMemberSupportState = null;
    }
  });
});
