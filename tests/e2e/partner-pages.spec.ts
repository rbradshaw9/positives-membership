import { expect, test } from "@playwright/test";
import {
  clearSupportSubmissions,
  getLatestSupportSubmission,
} from "./helpers";

test("public visitors can view the partner page and submit a partner application", async ({
  page,
}) => {
  const email = `rbradshaw+partner-${Date.now()}@gmail.com`;

  await clearSupportSubmissions(email);

  await page.goto("/partners");
  await expect(
    page.getByRole("heading", { name: "Share Positives in a way that feels natural." })
  ).toBeVisible();
  await expect(page.getByText("This is not a spammy affiliate program.")).toBeVisible();

  await page.getByRole("link", { name: "Apply to partner" }).first().click();
  await expect(page).toHaveURL(/\/partners\/apply$/);
  await expect(
    page.getByRole("heading", { name: "Tell us who you serve and why Positives fits." })
  ).toBeVisible();

  await page.getByLabel("Name").fill("Partner Applicant");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Partner type").selectOption("strategic_partner");
  await page
    .getByLabel("Who would you share Positives with?")
    .fill("Warm webinar and podcast audiences who already trust my recommendations.");
  await page.getByLabel("Website or public profile").fill("https://example.com/partner");
  await page
    .getByLabel("Why are you a good fit?")
    .fill("I regularly introduce grounded, practical tools to people who want a calmer daily rhythm.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit application" }).click();

  await expect(page.getByRole("heading", { name: "Application received." })).toBeVisible();

  const submission = await getLatestSupportSubmission(email);
  expect(submission?.subject).toBe("partner_application");
  expect(submission?.message).toContain("Partner type: strategic_partner");
  expect(submission?.message).toContain("Audience summary: Warm webinar and podcast audiences");
  expect(submission?.message).toContain("Website or profile: https://example.com/partner");
  expect(submission?.message).toContain("Agreed to terms: yes");

  await clearSupportSubmissions(email);
});
