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
  const fixture = await createStandaloneCourseFixture("detail-public", {
    withOutline: true,
    title: "E2E Public Course Detail",
  });
  fixtureCourseIds.push(fixture.courseId);

  await page.goto("/courses");
  await expect(page.getByRole("heading", { name: "Keep the courses that matter to you." })).toBeVisible();
  await page.getByRole("link", { name: "E2E Public Course Detail", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/courses/${fixture.courseSlug}$`));
  await expect(page.getByRole("heading", { name: "E2E Public Course Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Keep it in your library." })).toBeVisible();
  await expect(page.getByText("Module 1: Foundations")).toBeVisible();
  await expect(page.getByText("Lesson 1: Setting a gentler rhythm")).toBeVisible();

  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com/),
    page.getByRole("button", { name: "Add to my library" }).click(),
  ]);
});

test("signed-in members can quick-buy from the course detail page and then open the owned course from their library", async ({
  page,
}) => {
  await ensureMemberSavedPaymentMethod(LEVEL_2_MEMBER_EMAIL);

  const fixture = await createStandaloneCourseFixture("detail-owned", {
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
  await page.getByRole("button", { name: "Add to my library" }).click();
  await page.getByRole("button", { name: "Confirm and add to library" }).click();

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("link", { name: "E2E Saved Card Course" })).toBeVisible();

  await page.goto(`/courses/${fixture.courseSlug}`);
  await expect(page.getByRole("link", { name: "Open in library" })).toBeVisible();
  await page.getByRole("link", { name: "Open in library" }).click();
  await expect(page).toHaveURL(new RegExp(`/library/courses/${fixture.courseSlug}$`));

  await expect(page.getByRole("heading", { name: "E2E Saved Card Course" })).toBeVisible();
});
