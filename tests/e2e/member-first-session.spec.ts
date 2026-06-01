import { expect, test } from "@playwright/test";
import {
  LEVEL_2_MEMBER_EMAIL,
  LEVEL_2_MEMBER_PASSWORD,
  loginWithPassword,
} from "./helpers";

test("mobile first-session loop keeps core beta actions reachable", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await loginWithPassword(page, {
    email: LEVEL_2_MEMBER_EMAIL,
    password: LEVEL_2_MEMBER_PASSWORD,
    next: "/today",
  });

  await expect(page.getByRole("navigation", { name: "Member navigation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Good morning/ })).toBeVisible();
  const dailyPractice = page.getByRole("region", { name: "Daily Practice" });
  await expect(dailyPractice).toBeVisible();
  await expect(dailyPractice.getByRole("button", { name: /Play/ })).toBeVisible();

  const feedbackButton = page.getByTestId("beta-feedback-launcher");
  await expect(feedbackButton).toBeVisible();
  await feedbackButton.click();
  await expect(page.getByRole("dialog", { name: "Tell us what slowed you down" })).toBeVisible();
  await page.getByRole("button", { name: "Close feedback form" }).click();

  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText("you’re in the Positives beta")).toBeHidden();

  const practiceLink = page.getByRole("link", { name: "Open My Practice" });
  await practiceLink.scrollIntoViewIfNeeded();
  await expect(practiceLink).toBeVisible();
  await practiceLink.click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "My Practice" })).toBeVisible();

  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();

  await page.goto("/community");
  await expect(page.getByRole("heading", { name: "Community", exact: true })).toBeVisible();

  await page.goto("/account/coaching/availability");
  await expect(page.getByRole("heading", { name: "Coaching Availability" })).toBeVisible();
  await expect(page.getByText("Your coaching sessions live in Account.")).toBeVisible();
});
