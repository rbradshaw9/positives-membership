import { expect, test } from "@playwright/test";
import {
  ensureMemberStripeCustomer,
  getAdminMemberSupportSnapshot,
  loginWithPassword,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  type AdminMemberSupportSnapshot,
  updateAdminMemberSupportFields,
} from "./helpers";

test.describe.configure({ mode: "serial", timeout: 90_000 });

let originalMemberState: AdminMemberSupportSnapshot | null = null;

test.afterAll(async () => {
  if (originalMemberState) {
    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberState);
  }
});

test.describe("member billing portal", () => {
  test("member can open the in-app billing center from /account", async ({ page }) => {
    await ensureMemberStripeCustomer(MEMBER_EMAIL);

    await loginWithPassword(page, {
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      next: "/account",
    });

    await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your membership is active" })).toBeVisible();
    await expect(page.getByText("Full membership")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent invoices" }).last()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Manage billing" })
    ).toBeVisible();

    await page.getByRole("link", { name: "Manage billing" }).click();

    await expect(page).toHaveURL(/\/account\/billing$/);
    await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Current Plan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment Method" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Invoice History" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plan Details" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel membership" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Change or cancel" })).toHaveCount(0);
  });

  test("past-due member is sent to billing repair", async ({ page }) => {
    originalMemberState = await getAdminMemberSupportSnapshot(MEMBER_EMAIL);
    await ensureMemberStripeCustomer(MEMBER_EMAIL);
    await updateAdminMemberSupportFields(MEMBER_EMAIL, {
      subscription_status: "past_due",
      subscription_tier: "level_1",
    });

    await loginWithPassword(page, {
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      next: "/account",
      expectedPath: "/account/billing",
      normalizeAccess: false,
    });

    await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
    await expect(page.getByText("Payment method")).toBeVisible();

    await page.goto("/today");
    await expect(page).toHaveURL(/\/account\/billing$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();

    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberState);
    originalMemberState = null;
  });

  test("account handles missing Stripe and missing password without crashing", async ({ page }) => {
    originalMemberState = await getAdminMemberSupportSnapshot(MEMBER_EMAIL);
    await updateAdminMemberSupportFields(MEMBER_EMAIL, {
      stripe_customer_id: null,
      subscription_status: "active",
      subscription_tier: "level_1",
      password_set: false,
    });

    await loginWithPassword(page, {
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      next: "/account",
      expectedPath: "/account",
      normalizeAccess: false,
    });

    await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
    await expect(page.getByText("Billing not connected yet").first()).toBeVisible();
    await expect(page.getByText("Set a password anytime")).toBeVisible();
    await expect(page.getByText("You signed up via a magic link. Add a password")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent invoices" }).last()).toBeVisible();
    await expect(page.getByText("No Stripe invoices are available for this account yet.")).toBeVisible();

    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberState);
    originalMemberState = null;
  });

  test("first-login password setup link opens the account password form", async ({ page }) => {
    originalMemberState = await getAdminMemberSupportSnapshot(MEMBER_EMAIL);
    await updateAdminMemberSupportFields(MEMBER_EMAIL, {
      subscription_status: "active",
      subscription_tier: "level_1",
      password_set: false,
    });

    await loginWithPassword(page, {
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      next: "/today?welcome=1",
      expectedPath: "/today",
      normalizeAccess: false,
    });

    const welcomeDialog = page.getByRole("dialog", { name: "Welcome to Positives" });
    await expect(welcomeDialog).toBeVisible();

    await welcomeDialog.getByRole("link", { name: "Create my password" }).click();

    await expect(page).toHaveURL(/\/account#password$/);
    await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByLabel("New password")).toBeFocused();

    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberState);
    originalMemberState = null;
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
    await expect(page).toHaveURL(/\/account\/billing$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
  });
});
