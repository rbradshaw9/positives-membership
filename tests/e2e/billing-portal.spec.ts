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

test.describe.configure({ mode: "serial" });

let originalMemberState: AdminMemberSupportSnapshot | null = null;

test.afterAll(async () => {
  if (originalMemberState) {
    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberState);
  }
});

test.describe("member billing portal", () => {
  test("member can launch the Stripe billing center from /account", async ({ page }) => {
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
      page.getByRole("button", { name: "Open billing center" })
    ).toBeVisible();

    await Promise.all([
      page.waitForURL(/billing\.stripe\.com/, { timeout: 20_000, waitUntil: "commit" }),
      page.getByRole("button", { name: "Open billing center" }).click(),
    ]);

    await expect(
      page.getByText("Manage your Positives membership in one calm place.")
    ).toBeVisible();
  });

  test("past-due member is sent to billing repair and sees account warning", async ({ page }) => {
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
      expectedPath: "/account",
      normalizeAccess: false,
    });

    await expect(page.getByRole("heading", { name: "Update billing to continue your membership" })).toBeVisible();
    await expect(page.getByText("Payment attention needed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update billing" })).toBeVisible();

    await page.goto("/today");
    await expect(page).toHaveURL(/billing\.stripe\.com/, { timeout: 20_000 });

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
