import { expect, test } from "@playwright/test";
import {
  loginWithPassword,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  resetAffiliateTestState,
} from "./helpers";

test.describe("affiliate portal", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await resetAffiliateTestState(MEMBER_EMAIL);
  });

  test("member can enroll, finish payout setup, and use the portal on a narrow screen", async ({
    page,
  }) => {
    await loginWithPassword(page, {
      email: MEMBER_EMAIL,
      password: MEMBER_PASSWORD,
      next: "/account/affiliate",
    });

    const enrollButton = page.locator("#affiliate-enroll-btn");
    const agreementCheckbox = page.getByRole("checkbox");

    await expect(
      page.getByRole("heading", { name: "Earn 20% for every member you refer" })
    ).toBeVisible();
    await expect(enrollButton).toBeDisabled();

    await agreementCheckbox.check();
    await expect(enrollButton).toBeEnabled();
    await enrollButton.click();

    await expect(
      page.getByRole("heading", {
        name: "One more step before your affiliate portal opens",
      })
    ).toBeVisible({ timeout: 20_000 });

    const payoutEmail = "rbradshaw+paypal@gmail.com";
    await page.locator("#payout-paypal-input").fill(payoutEmail);
    await page.locator("#payout-save-btn").click();

    await expect(
      page.getByRole("heading", { name: "Your affiliate portal" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /My Links/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Performance/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Share Kit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Earnings/i })).toBeVisible();
    await expect(page.getByText("https://positives.life?fpr=", { exact: false })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your affiliate portal" })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Share Kit/i }).click();
    await expect(page.getByText("Best places to share first")).toBeVisible();
    await expect(page.getByText("Good source-tag ideas")).toBeVisible();
    await expect(page.getByText("Warm personal text")).toBeVisible();
    await expect(page.getByText("Three good angles to lead with")).toBeVisible();

    await page.getByRole("button", { name: /Earnings/i }).click();
    await expect(page.getByText(/PayPal email/i).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Save payout email/i })
    ).toBeVisible();
  });
});
