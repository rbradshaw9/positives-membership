import { expect, test } from "@playwright/test";
import { loginWithPassword, MEMBER_EMAIL, MEMBER_PASSWORD } from "./helpers";

test("protected member routes redirect to login", async ({ page }) => {
  for (const pathname of ["/today", "/practice", "/community", "/coaching", "/account"]) {
    await page.goto(pathname);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(pathname)}`));
  }
});

test("member can navigate launch routes and use practice tabs", async ({ page }) => {
  const memberNav = page.getByRole("navigation", { name: "Member navigation" });

  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  await expect(page.getByRole("region", { name: "Today's Practice" })).toBeVisible();
  await expect(memberNav.getByRole("link", { name: "Community", exact: true })).toHaveCount(0);

  await memberNav.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

  await memberNav.getByRole("link", { name: "My Practice", exact: true }).click();
  await expect(page).toHaveURL(/\/practice(\?tab=daily)?$/);
  await expect(page.getByRole("link", { name: "Daily" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Weekly" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Monthly" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Practice sections" }).getByRole("link", { name: "Overview" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Practice sections" }).getByRole("link", { name: "Journal" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Practice sections" }).getByRole("link", { name: "Saved" })
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Weekly" }).click();
  await expect(page).toHaveURL(/\/practice\?tab=weekly$/);
  await page.getByRole("link", { name: "Monthly" }).click();
  await expect(page).toHaveURL(/\/practice\?tab=monthly$/);

  await page.getByRole("button", { name: /open profile menu/i }).click();
  await expect(
    page.getByRole("menu", { name: "Profile menu" }).getByRole("menuitem", { name: "Journal" })
  ).toBeVisible();
  await page
    .getByRole("menu", { name: "Profile menu" })
    .getByRole("menuitem", { name: "Account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timezone" })).toBeVisible();
});

test("persistent player survives navigation when today audio is available", async ({ page }) => {
  const memberNav = page.getByRole("navigation", { name: "Member navigation" });

  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  const playButton = page.locator('button[aria-label^="Play "]').first();
  test.skip((await playButton.count()) === 0, "No playable today audio available for smoke verification.");

  await playButton.click();
  await expect(page.locator(".persistent-player")).toBeVisible();

  await memberNav.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.locator(".persistent-player")).toBeVisible();

  await memberNav.getByRole("link", { name: "My Practice", exact: true }).click();
  await expect(page).toHaveURL(/\/practice(\?tab=daily)?$/);
  await expect(page.locator(".persistent-player")).toBeVisible();

  await expect(page.locator(".persistent-player")).toHaveCount(1);
});
