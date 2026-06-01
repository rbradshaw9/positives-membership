import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  cleanupZoomOwnershipFixtures,
  createZoomOwnershipFixture,
  getCoachProfileZoomConnectionId,
  loginWithPassword,
} from "./helpers";

const ZOOM_OWNERSHIP_PREFIX = "E2E Zoom Ownership";

test.describe.configure({ mode: "serial", timeout: 60_000 });

test.beforeEach(async () => {
  await cleanupZoomOwnershipFixtures(ZOOM_OWNERSHIP_PREFIX);
});

test.afterEach(async () => {
  await cleanupZoomOwnershipFixtures(ZOOM_OWNERSHIP_PREFIX);
});

test("coach Zoom defaults are scoped to platform accounts and the coach's own account", async ({
  page,
}) => {
  const fixture = await createZoomOwnershipFixture(ZOOM_OWNERSHIP_PREFIX);

  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/coaching/coaches/new",
  });

  const newCoachZoomOptions = page.locator("#cf-zoom-connection option");
  await expect(newCoachZoomOptions.filter({ hasText: fixture.labels.platformOne })).toHaveCount(1);
  await expect(newCoachZoomOptions.filter({ hasText: fixture.labels.platformTwo })).toHaveCount(1);
  await expect(newCoachZoomOptions.filter({ hasText: fixture.labels.coachOne })).toHaveCount(0);
  await expect(newCoachZoomOptions.filter({ hasText: fixture.labels.coachTwo })).toHaveCount(0);

  await page.goto(`/admin/coaching/coaches/${fixture.coachProfileId}`);

  const editCoachZoomOptions = page.locator("#cf-zoom-connection option");
  await expect(editCoachZoomOptions.filter({ hasText: fixture.labels.platformOne })).toHaveCount(1);
  await expect(editCoachZoomOptions.filter({ hasText: fixture.labels.platformTwo })).toHaveCount(1);
  await expect(editCoachZoomOptions.filter({ hasText: fixture.labels.coachOne })).toHaveCount(1);
  await expect(editCoachZoomOptions.filter({ hasText: fixture.labels.coachTwo })).toHaveCount(0);

  const response = await page.request.patch("/api/admin/coaching/coaches", {
    data: {
      id: fixture.coachProfileId,
      display_name: `${ZOOM_OWNERSHIP_PREFIX} Coach One Updated`,
      title: "E2E Coach",
      bio: "Fixture coach for Zoom ownership validation.",
      avatar_url: null,
      member_id: fixture.coachOneMemberId,
      routing_group: "general",
      is_active: true,
      accepts_new: true,
      session_duration_minutes: 60,
      buffer_minutes_after: 15,
      zoom_connection_id: fixture.connectionIds.coachTwo,
    },
  });

  await expect(response).toBeOK();
  await expect.poll(() => getCoachProfileZoomConnectionId(fixture.coachProfileId)).toBeNull();
});
