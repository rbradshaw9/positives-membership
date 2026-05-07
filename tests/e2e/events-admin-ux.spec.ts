import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  LEVEL_2_MEMBER_EMAIL,
  LEVEL_2_MEMBER_PASSWORD,
  cleanupEventUxFixturesByPrefix,
  createEventUxZoomFixture,
  loginWithPassword,
} from "./helpers";

const EVENT_TITLE_PREFIX = "E2E Events UX";

test.describe.configure({ mode: "serial", timeout: 60_000 });

test.beforeEach(async () => {
  await cleanupEventUxFixturesByPrefix(EVENT_TITLE_PREFIX);
});

test.afterEach(async () => {
  await cleanupEventUxFixturesByPrefix(EVENT_TITLE_PREFIX);
});

test("admin event form keeps advanced fields contextual and supports inline create", async ({
  page,
}) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/new",
  });

  await expect(page.getByRole("heading", { name: "New event" })).toBeVisible();
  await expect(page.getByText("Member visibility")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish event" })).toBeVisible();

  await expect(page.getByLabel("Occurrences")).toHaveCount(0);
  await page.getByLabel("Repeat").selectOption("weekly");
  await expect(page.getByLabel("Occurrences")).toBeVisible();
  await expect(page.getByLabel("End by")).toBeVisible();
  await page.getByLabel("Repeat").selectOption("none");
  await expect(page.getByLabel("Occurrences")).toHaveCount(0);

  await expect(page.getByLabel("Manual join URL")).toHaveCount(0);
  await page.getByLabel("Virtual mode").selectOption("manual");
  await expect(page.getByLabel("Manual join URL")).toBeVisible();
  await page.getByLabel("Virtual mode").selectOption("zoom");
  await expect(page.getByLabel("Zoom session")).toBeVisible();
  await expect(page.getByText("Do not change Zoom link")).toHaveCount(0);
  await expect(page.getByLabel("Existing Zoom session")).toHaveCount(0);
  await page.getByLabel("Zoom session").selectOption("existing");
  if ((await page.getByText("No Zoom accounts connected").count()) > 0) {
    await expect(page.getByRole("link", { name: "Connect Zoom account" })).toBeVisible();
  } else {
    await expect(page.getByLabel("Existing Zoom session")).toBeVisible();
  }

  await page.getByRole("button", { name: "HTML" }).click();
  await expect(page.getByLabel("Event details HTML")).toBeVisible();
  await page.getByRole("button", { name: "Visual" }).click();

  const typeName = `${EVENT_TITLE_PREFIX} Type`;
  await page.getByLabel("Event type").selectOption("__create");
  await page.getByRole("dialog").getByLabel("Name").fill(typeName);
  await page.getByRole("button", { name: "Create and select" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("select#type_id option:checked")).toHaveText(typeName);

  const hostName = `${EVENT_TITLE_PREFIX} Host`;
  await page.getByLabel("Host").selectOption("__create");
  await page.getByRole("dialog").getByLabel("Name").fill(hostName);
  await page.getByRole("button", { name: "Create and select" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("select#host_id option:checked")).toHaveText(hostName);

  const venueName = `${EVENT_TITLE_PREFIX} Venue`;
  await page.getByLabel("Venue").selectOption("__create");
  await page.getByRole("dialog").getByLabel("Name").fill(venueName);
  await page.getByRole("button", { name: "Create and select" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("select#venue_id option:checked")).toHaveText(venueName);
});

test("calendar quick create pre-fills local event time", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/new?starts_at=2099-06-15T18:00",
  });

  await expect(page.getByLabel("Start date & time")).toHaveValue("2099-06-15T18:00");
  await expect(page.getByLabel("End date & time")).toHaveValue("2099-06-15T19:00");
});

test("admin event editor supports image width resizing", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/new",
  });

  await page.getByRole("button", { name: "HTML" }).click();
  await page
    .getByLabel("Event details HTML")
    .fill('<p>Image sizing fixture</p><img src="/icon.png" alt="Resize me">');
  await page.getByRole("button", { name: "Visual" }).click();

  const editorImage = page.locator(".event-editor-image img").first();
  await expect(editorImage).toBeVisible();
  await editorImage.click();
  await expect(page.getByLabel("Image width")).toBeVisible();

  await page.getByLabel("Image width").fill("420");
  await page.getByLabel("Image width").press("Enter");
  await expect(editorImage).toHaveAttribute("width", "420");
  await page.getByRole("button", { name: "Wrap left" }).click();
  await expect(page.locator(".event-editor-image").first()).toHaveAttribute("data-align", "left");

  await page.getByRole("button", { name: "HTML" }).click();
  await expect(page.getByLabel("Event details HTML")).toHaveValue(/width="420"/);
  await expect(page.getByLabel("Event details HTML")).toHaveValue(/data-align="left"/);
});

test("publishing a Zoom event requires a Zoom setup choice", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/new",
  });

  await page.getByLabel("Short summary").fill("A fixture event for Zoom validation coverage.");
  await page.getByLabel("Start date & time").fill("2099-06-15T18:00");
  await page.getByLabel("End date & time").fill("2099-06-15T19:00");
  await page.getByLabel("Virtual mode").selectOption("zoom");
  await page.getByLabel("Title").fill(`${EVENT_TITLE_PREFIX} Zoom Validation`);
  await page.getByRole("button", { name: "Publish event" }).click();

  await expect(page).toHaveURL(/\/admin\/events\/new\?error=zoom_setup_required$/);
  await expect(page.getByText("Choose how Zoom should be set up before publishing.")).toBeVisible();
});

test("editing an attached Zoom event requires detaching before choosing a different session", async ({
  page,
}) => {
  const { eventId } = await createEventUxZoomFixture(EVENT_TITLE_PREFIX);

  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: `/admin/events/${eventId}/edit`,
  });

  await expect(page.getByText("Current Zoom session")).toBeVisible();
  await expect(page.getByText("Zoom meeting")).toBeVisible();
  await expect(page.getByText(/e2e-/)).toBeVisible();
  await expect(page.getByLabel("Zoom session")).toHaveCount(0);
  await expect(page.getByText("Do not change Zoom link")).toHaveCount(0);

  await page.getByRole("button", { name: "Remove Zoom session from this event" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/edit\\?success=zoom_detached$`));
  await expect(page.getByText("Zoom session removed from this event.")).toBeVisible();
  await expect(page.getByLabel("Zoom session")).toBeVisible();
  await expect(page.getByText("Current Zoom session")).toHaveCount(0);
});

test("draft publish and unpublish flow controls member event visibility", async ({
  page,
  browser,
}) => {
  const title = `${EVENT_TITLE_PREFIX} Visibility ${Date.now()}`;
  const memberEventsPath = "/events?month=2099-06&view=list";
  let editPath = "";

  async function expectMemberVisibility(visible: boolean, detailsVisible = false) {
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    try {
      await loginWithPassword(memberPage, {
        email: LEVEL_2_MEMBER_EMAIL,
        password: LEVEL_2_MEMBER_PASSWORD,
        next: memberEventsPath,
      });
      await expect(memberPage.getByText(title)).toHaveCount(visible ? 1 : 0);
      if (detailsVisible) {
        const eventId = editPath.split("/").at(-2);
        await memberPage.goto(`/events/${eventId}`);
        await expect(memberPage.getByRole("heading", { name: "Fixture details" })).toBeVisible();
        await expect(memberPage.getByText("This should render after sanitization.")).toBeVisible();
      }
    } finally {
      await memberContext.close();
    }
  }

  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/new",
  });

  await page.getByLabel("Short summary").fill("A fixture event for publishing UX coverage.");
  await page.getByRole("button", { name: "HTML" }).click();
  await page
    .getByLabel("Event details HTML")
    .fill("<h2>Fixture details</h2><p>This should render after sanitization.</p>");
  await expect(page.locator('input[name="body"]')).toHaveValue(/Fixture details/);
  await page.getByLabel("Start date & time").fill("2099-06-15T12:00");
  await page.getByLabel("End date & time").fill("2099-06-15T13:00");
  await page.getByLabel("Timezone").selectOption("America/New_York");
  await page.getByLabel("Virtual mode").selectOption("manual");
  await page.getByLabel("Manual join URL").fill("https://example.com/e2e-event");
  await page.getByLabel("Title").fill(title);
  await expect(page.getByLabel("Title")).toHaveValue(title);

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+\/edit\?success=draft_saved$/);
  await expect(page.getByText("Draft saved. Members will not see this event until it is published.")).toBeVisible();

  editPath = new URL(page.url()).pathname;

  await expectMemberVisibility(false);

  await page.goto(editPath);
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+\/edit\?success=published$/);
  await expect(page.getByText("Event published. Eligible members can now see it.")).toBeVisible();

  await expectMemberVisibility(true, true);

  await page.goto(editPath);
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+\/edit\?success=unpublished$/);
  await expect(page.getByText("Event unpublished. Members can no longer see it.")).toBeVisible();

  await expectMemberVisibility(false);
});
