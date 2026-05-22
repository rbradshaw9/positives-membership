import { expect, test, type Response as PlaywrightResponse } from "@playwright/test";

async function expectHealthyResponse(pathname: string, response: PlaywrightResponse | null) {
  expect(response, `${pathname} should return a response`).not.toBeNull();
  expect(response!.status(), `${pathname} should not return an error status`).toBeLessThan(400);
}

test("guest can launch Stripe Checkout from the live join page", async ({ page }) => {
  test.setTimeout(90_000);

  const response = await page.goto("/join");
  await expectHealthyResponse("/join", response);

  await expect(
    page.getByRole("heading", { level: 3, name: "Positives", exact: true })
  ).toBeVisible();
  await expect(page.getByText("$37/mo").first()).toBeVisible();

  const membershipCheckoutButton = page
    .getByRole("button", { name: "Start my practice →" })
    .first();

  await expect(membershipCheckoutButton).toBeVisible();

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com|buy\.stripe\.com/, { timeout: 20_000 }),
    membershipCheckoutButton.click(),
  ]);

  await expect(page.getByText("Positives").first()).toBeVisible();
  await expect(page.getByText(/Membership|Join Positives/i).first()).toBeVisible();
});

test("join pricing toggle shows annual prices and two-month savings clearly", async ({ page }) => {
  const response = await page.goto("/join");
  await expectHealthyResponse("/join", response);

  await expect(page.getByText("$37").first()).toBeVisible();
  await expect(page.getByText("/mo").first()).toBeVisible();
  await expect(page.getByText("or $370/year — get two months free")).toBeVisible();

  await page.getByRole("button", { name: /Annual/i }).click();

  await expect(page.getByText("$370").first()).toBeVisible();
  await expect(page.getByText("$970").first()).toBeVisible();
  await expect(page.getByText("/yr").first()).toBeVisible();
  await expect(page.getByText("About $31/mo — get two months free")).toBeVisible();
  await expect(page.getByText("About $81/mo — get two months free")).toBeVisible();
});

test("guest can launch annual Positives checkout from the join page", async ({ page }) => {
  test.setTimeout(90_000);

  const response = await page.goto("/join");
  await expectHealthyResponse("/join", response);

  await page.getByRole("button", { name: /Annual/i }).click();
  await expect(page.getByText("$370").first()).toBeVisible();

  const annualCheckoutButton = page
    .getByRole("button", { name: "Start my practice →" })
    .first();

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com|buy\.stripe\.com/, { timeout: 20_000 }),
    annualCheckoutButton.click(),
  ]);

  await expect(page.getByText("Positives").first()).toBeVisible();
  await expect(page.getByText(/\$370|370\\.00|per year|year/i).first()).toBeVisible();
});
