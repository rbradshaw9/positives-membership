import "./load-local-env";
import { expect, test } from "@playwright/test";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import {
  clearSupportSubmissions,
  getLatestSupportSubmission,
  getMemberEmailUnsubscribed,
  MEMBER_EMAIL,
  setMemberEmailUnsubscribed,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("unsubscribe and support flows", () => {
  test("unsubscribe route rejects invalid tokens and accepts a signed member link", async ({
    request,
  }) => {
    await setMemberEmailUnsubscribed(MEMBER_EMAIL, false);

    const invalid = await request.get(
      `/api/unsubscribe?email=${encodeURIComponent(MEMBER_EMAIL)}&token=invalid`
    );
    expect(invalid.status()).toBe(400);
    expect(await getMemberEmailUnsubscribed(MEMBER_EMAIL)).toBe(false);

    const unsubscribeUrl = new URL(buildUnsubscribeUrl(MEMBER_EMAIL));
    const valid = await request.get(
      `${unsubscribeUrl.pathname}${unsubscribeUrl.search}`
    );
    expect(valid.status()).toBe(200);
    expect(await getMemberEmailUnsubscribed(MEMBER_EMAIL)).toBe(true);

    await setMemberEmailUnsubscribed(MEMBER_EMAIL, false);
  });

  test("support page accepts a member question and stores the submission", async ({
    page,
  }) => {
    const supportEmail = "rbradshaw+supporttest@gmail.com";
    await clearSupportSubmissions(supportEmail);

    await page.goto("/support");
    await expect(page.getByRole("heading", { name: "We're here to help." })).toBeVisible();

    await page.getByLabel("Name").fill("Ryan Support QA");
    await page.getByLabel("Email").fill(supportEmail);
    await page.getByLabel("Topic").selectOption("billing");
    await page.getByLabel("Message").fill("Testing the support intake flow from Playwright.");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByRole("heading", { name: "Message sent." })).toBeVisible();

    const submission = await getLatestSupportSubmission(supportEmail);
    expect(submission).toMatchObject({
      name: "Ryan Support QA",
      email: supportEmail,
      subject: "billing",
      message: "Testing the support intake flow from Playwright.",
    });

    await clearSupportSubmissions(supportEmail);
  });
});
