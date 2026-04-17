import { expect, test, type Response as PlaywrightResponse } from "@playwright/test";

async function expectHealthyResponse(pathname: string, response: PlaywrightResponse | null) {
  expect(response, `${pathname} should return a response`).not.toBeNull();
  expect(response!.status(), `${pathname} should not return an error status`).toBeLessThan(400);
}

test.describe("subscribe success handoff", () => {
  test("success page falls back cleanly when no checkout session is present", async ({
    page,
  }) => {
    const response = await page.goto("/subscribe/success");
    await expectHealthyResponse("/subscribe/success", response);

    await expect(page.locator("#success-fallback-login")).toBeVisible();
    await expect(page.getByRole("heading", { name: /your membership is active/i })).toBeVisible();
    await expect(
      page.getByText(/use the email you provided at checkout to sign in/i)
    ).toBeVisible();
  });

  test("auth exchange rejects missing session ids", async ({ request }) => {
    const response = await request.get("/api/auth/exchange");

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Missing session_id query parameter.",
    });
  });

  test("auth exchange rejects malformed and invalid checkout sessions", async ({
    request,
  }) => {
    const tooLongSessionId = `cs_test_${"x".repeat(300)}`;
    const malformed = await request.get(
      `/api/auth/exchange?session_id=${encodeURIComponent(tooLongSessionId)}`
    );

    expect(malformed.status()).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({
      error: "Invalid checkout session.",
    });

    const invalid = await request.get(
      "/api/auth/exchange?session_id=cs_test_nonexistent_checkout_session"
    );

    expect(invalid.status()).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      error: "Invalid or expired checkout session.",
    });
  });
});
