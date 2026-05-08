import { expect, test } from "@playwright/test";
import {
  createStandaloneCourseFixture,
  deleteCourseFixture,
  ensureMemberSavedPaymentMethod,
  LEVEL_2_MEMBER_EMAIL,
  LEVEL_2_MEMBER_PASSWORD,
  loginWithPassword,
} from "./helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const fixtureCourseIds: string[] = [];

test.afterAll(async () => {
  for (const courseId of fixtureCourseIds) {
    await deleteCourseFixture(courseId);
  }
});

test("logged-out visitors can open course details and start Stripe Checkout from the detail page", async ({
  page,
}) => {
  const fixture = await createStandaloneCourseFixture(`detail-public-${Date.now()}`, {
    withOutline: true,
    title: "E2E Public Course Detail",
  });
  fixtureCourseIds.push(fixture.courseId);

  await page.goto("/courses");
  await expect(page.getByRole("heading", { name: "Focused support you can keep." })).toBeVisible();
  await page.getByRole("link", { name: "E2E Public Course Detail", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/courses/${fixture.courseSlug}$`));
  await expect(page.getByRole("heading", { name: "E2E Public Course Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curriculum Preview" })).toBeVisible();
  await expect(page.getByText("Module 1: Foundations")).toBeVisible();
  await expect(page.getByText("Lesson 1: Setting a gentler rhythm")).toBeVisible();

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com/),
    page.getByRole("button", { name: "Add to My Courses" }).click(),
  ]);
});

test("signed-in members can quick-buy from the course detail page and then open the owned course from their library", async ({
  page,
}) => {
  await ensureMemberSavedPaymentMethod(LEVEL_2_MEMBER_EMAIL);

  const fixture = await createStandaloneCourseFixture(`detail-owned-${Date.now()}`, {
    withOutline: true,
    title: "E2E Saved Card Course",
  });
  fixtureCourseIds.push(fixture.courseId);

  await loginWithPassword(page, {
    email: LEVEL_2_MEMBER_EMAIL,
    password: LEVEL_2_MEMBER_PASSWORD,
    next: `/courses/${fixture.courseSlug}`,
    expectedPath: `/courses/${fixture.courseSlug}`,
  });

  await expect(page.getByRole("heading", { name: "E2E Saved Card Course" })).toBeVisible();
  await page.getByRole("button", { name: "Add to My Courses" }).click();
  await page.getByRole("button", { name: "Confirm and add" }).click();

  await expect(page).toHaveURL(/\/my-courses$/);
  await expect(page.locator(`a[href="/my-courses/${fixture.courseSlug}"]`)).toBeVisible();

  await page.goto(`/courses/${fixture.courseSlug}`);
  await expect(page.getByRole("link", { name: "Open in My Courses" })).toBeVisible();
  await page.getByRole("link", { name: "Open in My Courses" }).click();
  await expect(page).toHaveURL(new RegExp(`/my-courses/${fixture.courseSlug}$`));

  await expect(page.getByRole("heading", { name: "E2E Saved Card Course" })).toBeVisible();
});
