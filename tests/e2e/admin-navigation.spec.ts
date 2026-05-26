import { expect, test, type Locator } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginWithPassword } from "./helpers";

async function expandAdminNavGroup(nav: Locator, name: string) {
  const button = nav.getByRole("button", { name, exact: true });
  await expect
    .poll(async () => {
      if ((await button.getAttribute("aria-expanded")) !== "true") {
        await button.click();
      }
      return button.getAttribute("aria-expanded");
    })
    .toBe("true");
}

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

  await expandAdminNavGroup(adminNav, "Content");
  await expect(adminNav.getByRole("link", { name: "Events" })).toBeVisible();
  await expect(adminNav.getByRole("link", { name: "Calendar" })).toHaveCount(0);

  await adminNav.getByRole("button", { name: "Expand Events" }).click();
  await expect(adminNav.getByRole("link", { name: "All Events" })).toBeVisible();
  await expect(adminNav.getByRole("link", { name: "All Events" })).toHaveAttribute("href", "/admin/events");
  await expect(adminNav.getByRole("link", { name: "List" })).toHaveCount(0);
  await expect(adminNav.getByRole("link", { name: "Calendar" })).toHaveCount(0);
  await expect(adminNav.getByRole("link", { name: "Ticketing" })).toBeVisible();

  await expandAdminNavGroup(adminNav, "Management");
  await expect(adminNav.getByRole("link", { name: "Integrations" })).toBeVisible();
});
