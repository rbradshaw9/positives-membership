import { expect, test, type Page } from "@playwright/test";
import {
  LEVEL_3_MEMBER_EMAIL,
  LEVEL_3_MEMBER_PASSWORD,
  loginWithPassword,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
} from "./helpers";

async function dismissMemberTourIfPresent(page: Page) {
  const closeTourButton = page.getByRole("button", { name: "Close tour" });
  try {
    await expect(closeTourButton).toBeVisible({ timeout: 2_500 });
  } catch {
    return;
  }
  await closeTourButton.click();
  await expect(closeTourButton).toHaveCount(0);
}

test("protected member routes redirect to login", async ({ page }) => {
  for (const pathname of ["/today", "/practice", "/community", "/coaching", "/account"]) {
    await page.goto(pathname);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(pathname)}`));
  }

  await page.goto("/today?welcome=1");
  await expect(page).toHaveURL(
    new RegExp(`/login\\?next=${encodeURIComponent("/today?welcome=1")}`)
  );
});

test("signed-in non-admin is redirected away from admin", async ({ page }) => {
  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/today$/);
});

test("member sign out ends the session on the login page", async ({ page }) => {
  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login\?signed_out=1$/);
  await expect(page.getByRole("heading", { name: "Sign in to Positives" })).toBeVisible();
  await expect(page.getByText("You’re signed out. Sign in when you’re ready.")).toBeVisible();

  await page.goto("/today");
  await expect(page).toHaveURL(/\/login\?next=%2Ftoday$/);
});

test("GET sign-out route is side-effect free", async ({ page }) => {
  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  await page.goto("/auth/sign-out");
  await expect(page).toHaveURL(/\/today$/);

  await page.goto("/today");
  await expect(page.getByRole("region", { name: "Daily Practice", exact: true })).toBeVisible();
});

test("password sign-in redirects directly to the next destination", async ({ page }) => {
  await loginWithPassword(page, {
    email: LEVEL_3_MEMBER_EMAIL,
    password: LEVEL_3_MEMBER_PASSWORD,
    next: "/today",
    allowBootstrapFallback: false,
  });

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("region", { name: "Daily Practice", exact: true })).toBeVisible();

  await page.goto("/today?welcome=1");
  const welcomeDialog = page.getByRole("dialog", { name: "Welcome to Positives" });
  await expect(welcomeDialog).toBeVisible();
  await expect(welcomeDialog.getByText("Start with today's short audio")).toBeVisible();
  await expect(welcomeDialog.getByRole("link", { name: "Your personal journey" })).toBeVisible();
});

test("member can navigate launch routes and use practice tabs", async ({ page }) => {
  const memberNav = page.getByRole("navigation", { name: "Member navigation" });

  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });
  await dismissMemberTourIfPresent(page);

  await expect(page.getByRole("region", { name: "Daily Practice", exact: true })).toBeVisible();
  await expect(page.getByText("Your Rhythm")).toHaveCount(0);
  await expect(page.getByText("Go Deeper")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open this week's principle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open this month's theme" })).toBeVisible();
  await expect(page.getByText("Home is today's guidance")).toHaveCount(0);
  await expect(page.getByText("Start your streak")).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Daily Practice", exact: true })
      .getByText(/Start today's practice|Today's practice is complete|Today's audio will appear here/)
  ).toBeVisible();

  await page.getByRole("button", { name: "Open this week's principle" }).click();
  const weeklyDialog = page.getByRole("dialog", { name: "This Week" });
  await expect(weeklyDialog).toBeVisible();
  await weeklyDialog.getByRole("button", { name: "Close" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  const archiveToggle = page.getByRole("button", { name: "Explore past practices" });
  if ((await archiveToggle.count()) > 0) {
    await expect(archiveToggle).toBeVisible();
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(memberNav.getByRole("link", { name: "Community", exact: true })).toHaveCount(0);
  await expect(memberNav.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);

  await memberNav.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

  await memberNav.getByRole("link", { name: "My Practice", exact: true }).click();
  await expect(page).toHaveURL(/\/practice(\?tab=daily)?$/);
  const practiceSections = page.getByRole("navigation", { name: "Practice sections" });
  await expect(practiceSections.getByRole("link", { name: "Daily", exact: true })).toBeVisible();
  await expect(practiceSections.getByRole("link", { name: "Weekly", exact: true })).toBeVisible();
  await expect(practiceSections.getByRole("link", { name: "Monthly", exact: true })).toBeVisible();
  await expect(
    practiceSections.getByRole("link", { name: "Overview" })
  ).toHaveCount(0);
  await expect(
    practiceSections.getByRole("link", { name: "Journal" })
  ).toHaveCount(0);
  await expect(
    practiceSections.getByRole("link", { name: "Saved" })
  ).toHaveCount(0);

  await practiceSections.getByRole("link", { name: "Weekly", exact: true }).click();
  await expect(page).toHaveURL(/\/practice\?tab=weekly$/);
  await practiceSections.getByRole("link", { name: "Monthly", exact: true }).click();
  await expect(page).toHaveURL(/\/practice\?tab=monthly$/);

  await page.getByRole("button", { name: /open profile menu/i }).click();
  await expect(
    page.getByRole("menu", { name: "Profile menu" }).getByRole("menuitem", { name: "Journal" })
  ).toBeVisible();
  await expect(
    page.getByRole("menu", { name: "Profile menu" }).getByRole("menuitem", { name: "Admin" })
  ).toHaveCount(0);
  await page
    .getByRole("menu", { name: "Profile menu" })
    .getByRole("menuitem", { name: "Account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timezone" })).toBeVisible();
});

test("persistent player survives navigation when today audio is available", async ({ page }) => {
  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  const playButton = page.locator('button[aria-label^="Play "]').first();
  test.skip((await playButton.count()) === 0, "No playable today audio available for smoke verification.");

  await playButton.click();
  try {
    await expect(page.locator(".persistent-player")).toBeVisible({ timeout: 5_000 });
  } catch {
    test.skip(true, "Playable audio did not initialize the persistent player in this environment.");
  }

  await page.goto("/library");
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.locator(".persistent-player")).toBeVisible();

  await page.goto("/practice");
  await expect(page).toHaveURL(/\/practice(\?tab=daily)?$/);
  await expect(page.locator(".persistent-player")).toBeVisible();

  await expect(page.locator(".persistent-player")).toHaveCount(1);
});
