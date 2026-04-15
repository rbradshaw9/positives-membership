import { expect, test } from "@playwright/test";
import {
  createCourseEntitlementWebhookFixture,
  deleteCourseFixture,
  getAdminMemberSupportSnapshot,
  getMemberBillingState,
  loginWithPassword,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  type AdminMemberSupportSnapshot,
  updateAdminMemberSupportFields,
} from "./helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

let originalMemberState: AdminMemberSupportSnapshot | null = null;
let fixtureCourseId: string | null = null;

test.afterAll(async () => {
  if (originalMemberState) {
    await updateAdminMemberSupportFields(MEMBER_EMAIL, originalMemberState);
  }

  if (fixtureCourseId) {
    await deleteCourseFixture(fixtureCourseId);
  }
});

test("course-only members keep owned course access and get calm resubscribe prompts", async ({
  page,
}) => {
  const member = await getMemberBillingState(MEMBER_EMAIL);
  originalMemberState = await getAdminMemberSupportSnapshot(MEMBER_EMAIL);
  const paymentIntentId = `course-only-${Date.now()}`;
  const courseSlug = `e2e-course-webhook-${paymentIntentId}`;
  const fixture = await createCourseEntitlementWebhookFixture({
    memberId: member.id,
    paymentIntentId,
  });
  fixtureCourseId = fixture.courseId;

  await updateAdminMemberSupportFields(MEMBER_EMAIL, {
    subscription_status: "canceled",
    subscription_tier: null,
  });

  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
    expectedPath: "/library",
  });

  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E Course Webhook Fixture/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Want the full daily practice?" })).toBeVisible();

  await page.getByRole("link", { name: /E2E Course Webhook Fixture/i }).click();
  await expect(page).toHaveURL(new RegExp(`/library/courses/${courseSlug}$`));
  await expect(page.getByRole("heading", { name: "E2E Course Webhook Fixture" })).toBeVisible();

  await page.goto("/courses");
  await expect(page.getByText("You already have")).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E Course Webhook Fixture/i })).toHaveCount(0);

  await page.goto("/today");
  await expect(page).toHaveURL(/\/join$/);

  await page.goto("/library?upgrade=true");
  await expect(page.getByRole("heading", { name: "That area is part of the full Positives membership." })).toBeVisible();
});
