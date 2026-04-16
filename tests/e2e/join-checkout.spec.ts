import { expect, test, type Response as PlaywrightResponse } from "@playwright/test";

async function expectHealthyResponse(pathname: string, response: PlaywrightResponse | null) {
  expect(response, `${pathname} should return a response`).not.toBeNull();
  expect(response!.status(), `${pathname} should not return an error status`).toBeLessThan(400);
}

test("guest can launch Stripe Checkout from the live join page", async ({ page }) => {
  const response = await page.goto("/join");
  await expectHealthyResponse("/join", response);

  await expect(
    page.getByRole("heading", { level: 3, name: "Membership", exact: true })
  ).toBeVisible();

  const membershipCheckoutButton = page
    .getByRole("button", { name: "Start your practice →" })
    .first();

  await expect(membershipCheckoutButton).toBeVisible();

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com|buy\.stripe\.com/, { timeout: 20_000 }),
    membershipCheckoutButton.click(),
  ]);

  await expect(page.getByText("Positives").first()).toBeVisible();
  await expect(page.getByText(/Membership|Join Positives/i).first()).toBeVisible();
});
