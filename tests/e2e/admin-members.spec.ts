import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  getAdminAccessSnapshot,
  getAdminMemberSupportSnapshot,
  getAdminRolePermissionsSnapshot,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  loginWithPassword,
  replaceAdminAccess,
  replaceAdminRolePermissions,
  type AdminMemberSupportSnapshot,
  type AdminAccessSnapshot,
  type AdminRolePermissionsSnapshot,
  updateAdminMemberSupportFields,
} from "./helpers";

test.describe.configure({ mode: "serial" });

let originalMemberSupportState: AdminMemberSupportSnapshot | null = null;
let originalMemberAdminAccessState: AdminAccessSnapshot | null = null;
let originalSupportRolePermissions: AdminRolePermissionsSnapshot | null = null;

test.afterAll(async () => {
  if (originalMemberSupportState) {
    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberSupportState);
  }
  if (originalMemberAdminAccessState) {
    await replaceAdminAccess(MEMBER_EMAIL, originalMemberAdminAccessState);
  }
  if (originalSupportRolePermissions) {
    await replaceAdminRolePermissions(originalSupportRolePermissions);
  }
});

test.describe("admin member operations", () => {
  test("admin sees admin navigation from the member shell", async ({ page }) => {
    await loginWithPassword(page, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      next: "/today",
    });

    const memberNav = page.getByRole("navigation", { name: "Member navigation" });
    await expect(memberNav.getByRole("link", { name: "Admin", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /open profile menu/i }).click();
    await expect(
      page.getByRole("menu", { name: "Profile menu" }).getByRole("menuitem", { name: "Admin" })
    ).toBeVisible();
  });

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

  test("admin can update default permissions for a role", async ({ page }) => {
    originalSupportRolePermissions = await getAdminRolePermissionsSnapshot("support");

    try {
      await loginWithPassword(page, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        next: "/admin/roles",
      });

      const supportCard = page.locator("form.admin-role-card").filter({
        has: page.getByRole("heading", { name: "Support" }),
      });

      const manageRolesCheckbox = supportCard.getByLabel("Manage roles");
      await expect(manageRolesCheckbox).not.toBeChecked();
      await manageRolesCheckbox.check();
      await supportCard
        .getByLabel(
          "I verified this role-permission change is approved by the team and safe to apply."
        )
        .check();
      await supportCard
        .getByLabel("Change reason")
        .fill("E2E verifies support role permission defaults can be updated.");
      await supportCard.getByRole("button", { name: "Save role permissions" }).click();

      await expect(page.getByRole("status")).toContainText("Role permissions updated.");

      const updatedSupportRole = await getAdminRolePermissionsSnapshot("support");
      expect(updatedSupportRole.permissions).toContain("roles.manage");
    } finally {
      if (originalSupportRolePermissions) {
        await replaceAdminRolePermissions(originalSupportRolePermissions);
        originalSupportRolePermissions = null;
      }
    }
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

    const tabNav = page.getByRole("navigation", { name: "Member management tabs" });
    await expect(tabNav.getByRole("link", { name: "Access", exact: true })).toBeVisible();
    await expect(tabNav.getByRole("link", { name: "Billing", exact: true })).toBeVisible();

    await tabNav.getByRole("link", { name: "Access", exact: true }).click();
    await expect(page).toHaveURL(/tab=access/);
    await expect(page.getByRole("heading", { name: "Access" })).toBeVisible();

    const assignedCoachOptions = await page
      .locator('select[name="assignedCoachId"] option')
      .allTextContents();
    expect(assignedCoachOptions).toContain("Admin (lopcadmin@gmail.com)");
    expect(
      assignedCoachOptions.some((option) => option.includes("Ryan (L1 Test)"))
    ).toBeFalsy();

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
      await expect(page.getByText("No practice tracked yet.")).toBeVisible();

      const tabNav = page.getByRole("navigation", { name: "Member management tabs" });
      await tabNav.getByRole("link", { name: "Communication", exact: true }).click();
      await expect(page).toHaveURL(/tab=communication/);
      await expect(page.getByText("Magic-link / password not set")).toBeVisible();

      await tabNav.getByRole("link", { name: "Billing", exact: true }).click();
      await expect(page).toHaveURL(/tab=billing/);
      await expect(page.getByText("Not linked")).toBeVisible();
    } finally {
      await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberSupportState);
      originalMemberSupportState = null;
    }
  });

  test("admin billing preview handles a stale Stripe customer without crashing", async ({
    page,
  }) => {
    originalMemberSupportState = await getAdminMemberSupportSnapshot(MEMBER_EMAIL);

    await updateAdminMemberSupportFields(MEMBER_EMAIL, {
      stripe_customer_id: "cus_missing_preview_fixture",
      subscription_status: "active",
      subscription_tier: "level_1",
    });

    try {
      await loginWithPassword(page, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        next: "/admin/members",
      });

      await page.getByLabel("Search members").fill(MEMBER_EMAIL);
      await page.getByRole("button", { name: "Search" }).click();
      await page.getByRole("link", { name: MEMBER_EMAIL }).click();

      await page.goto(`${page.url()}?tab=billing&planTarget=level_3_monthly`);

      await expect(page.getByRole("heading", { name: /Ryan \(L1 Test\)|rbradshaw\+l1@gmail\.com/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
      await expect(
        page.getByText(
          "The linked Stripe customer could not be found in Stripe. Reconnect billing before previewing or changing this plan."
        )
      ).toBeVisible();
    } finally {
      if (originalMemberSupportState) {
        await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberSupportState);
        originalMemberSupportState = null;
      }
    }
  });

  test("admin can assign a role and use per-user overrides to expand access", async ({
    page,
    browser,
  }) => {
    originalMemberAdminAccessState = await getAdminAccessSnapshot(MEMBER_EMAIL);
    await replaceAdminAccess(MEMBER_EMAIL, {
      roleKeys: [],
      permissionOverrides: [],
    });

    try {
      await loginWithPassword(page, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        next: "/admin/members",
      });

      await page.getByLabel("Search members").fill(MEMBER_EMAIL);
      await page.getByRole("button", { name: "Search" }).click();
      await page.getByRole("link", { name: MEMBER_EMAIL }).click();

      await page
        .getByRole("navigation", { name: "Member management tabs" })
        .getByRole("link", { name: "Admin Access" })
        .click();
      await expect(page).toHaveURL(/tab=admin-access/);

      const adminAccessSection = page.locator("section#admin-access");
      const assignRoleForm = adminAccessSection
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "Assign role" }) });

      await assignRoleForm.locator('select[name="roleId"]').selectOption({ label: "Read Only" });
      await assignRoleForm
        .getByLabel(
          "I verified this change is authorized by the member/client or approved by the team."
        )
        .check();
      await assignRoleForm.getByLabel("Change reason").fill("E2E role assignment verification.");
      await assignRoleForm.getByRole("button", { name: "Assign role" }).click();

      await expect(assignRoleForm.getByRole("status")).toContainText("Admin role assigned.");
      await expect(
        adminAccessSection.locator(".member-crm-record__title", { hasText: "Read Only" }).first()
      ).toBeVisible();

      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();

      await loginWithPassword(memberPage, {
        email: MEMBER_EMAIL,
        password: MEMBER_PASSWORD,
        next: "/admin/members",
      });

      await expect(memberPage.getByRole("heading", { name: "Members" })).toBeVisible();
      await expect(memberPage.getByRole("link", { name: "Roles" })).toHaveCount(0);
      await memberPage.goto("/admin/roles");
      await expect(memberPage).toHaveURL(/\/admin\/members\?error=permission_denied$/);

      const overrideForm = adminAccessSection
        .locator("form")
        .filter({ has: page.getByRole("button", { name: "Save override" }) });

      await overrideForm.locator('select[name="permission"]').selectOption("roles.manage");
      await overrideForm.locator('select[name="allowed"]').selectOption("true");
      await overrideForm
        .getByLabel(
          "I verified this change is authorized by the member/client or approved by the team."
        )
        .check();
      await overrideForm
        .getByLabel("Change reason")
        .fill("E2E verification of per-user admin permission override.");
      await overrideForm.getByRole("button", { name: "Save override" }).click();

      await expect(overrideForm.getByRole("status")).toContainText("Permission override saved.");
      await expect(
        adminAccessSection.locator(".member-crm-chip", { hasText: "Manage roles" }).first()
      ).toBeVisible();

      await memberPage.goto("/admin/roles");
      await expect(memberPage.getByRole("heading", { name: "Admin Roles" })).toBeVisible();

      await memberContext.close();
    } finally {
      if (originalMemberAdminAccessState) {
        await replaceAdminAccess(MEMBER_EMAIL, originalMemberAdminAccessState);
        originalMemberAdminAccessState = null;
      }
    }
  });
});
