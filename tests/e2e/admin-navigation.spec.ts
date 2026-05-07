import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginWithPassword } from "./helpers";

test("admin sidebar groups expand and reveal focused subnavigation", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/ops",
  });

  const adminNav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(adminNav.getByRole("button", { name: "Workspace" })).toHaveAttribute("aria-expanded", "true");
  await expect(adminNav.getByRole("button", { name: "Content" })).toHaveAttribute("aria-expanded", "false");
  await expect(adminNav.getByRole("link", { name: "Events" })).toHaveCount(0);

  await adminNav.getByRole("button", { name: "Content" }).click();
  await expect(adminNav.getByRole("button", { name: "Content" })).toHaveAttribute("aria-expanded", "true");
  await expect(adminNav.getByRole("link", { name: "Events" })).toBeVisible();
  await expect(adminNav.getByRole("link", { name: "Calendar" })).toHaveCount(0);

  await adminNav.getByRole("button", { name: "Expand Events" }).click();
  await expect(adminNav.getByRole("link", { name: "Calendar" })).toBeVisible();
  await expect(adminNav.getByRole("link", { name: "Ticketing" })).toBeVisible();

  await adminNav.getByRole("button", { name: "Management" }).click();
  await expect(adminNav.getByRole("button", { name: "Management" })).toHaveAttribute("aria-expanded", "true");
  await expect(adminNav.getByRole("link", { name: "Integrations" })).toBeVisible();
});
