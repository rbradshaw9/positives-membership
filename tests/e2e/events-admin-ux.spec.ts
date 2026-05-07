import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  LEVEL_2_MEMBER_EMAIL,
  LEVEL_2_MEMBER_PASSWORD,
  createCompEventTicketFixture,
  cleanupEventUxFixturesByPrefix,
  createEventHostVenueFixture,
  createRsvpEventFixture,
  createEventUxZoomFixture,
  createTicketedEventFixture,
  eventRegistrationFieldsSupported,
  loginWithPassword,
} from "./helpers";

const EVENT_TITLE_PREFIX = "E2E Events UX";

test.describe.configure({ mode: "serial", timeout: 60_000 });

async function waitForEventFormReady(page: Page) {
  await expect(page.locator('form[data-event-form-ready="true"]')).toBeVisible();
}

test.beforeEach(async () => {
  await cleanupEventUxFixturesByPrefix(EVENT_TITLE_PREFIX);
});

test.afterEach(async () => {
  await cleanupEventUxFixturesByPrefix(EVENT_TITLE_PREFIX);
});

test("member events routes redirect guests to login", async ({ page }) => {
  await page.goto("/events");
  await expect(page).toHaveURL(/\/login\?next=%2Fevents$/);

  await page.goto("/events/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login\?next=%2Fevents%2F00000000-0000-0000-0000-000000000000$/);
});

test("admin event form keeps advanced fields contextual and supports inline create", async ({
  page,
}) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/new",
  });
  await waitForEventFormReady(page);

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

  await page.getByLabel("Ticketing mode").selectOption("ticket_required");
  await expect(page.getByRole("heading", { name: "General Admission" })).toBeVisible();
  await expect(page.getByLabel("Sales open")).toBeVisible();
  await expect(page.getByLabel("Sales close")).toBeVisible();

  const typeName = `${EVENT_TITLE_PREFIX} Type`;
  await page.getByLabel("Event type").selectOption("__create");
  await page.getByRole("dialog").getByLabel("Name").fill(typeName);
  await page.getByRole("button", { name: "Create and select" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("select#type_id option:checked")).toHaveText(typeName);

  const hostName = `${EVENT_TITLE_PREFIX} Host`;
  await page.getByRole("button", { name: "Create new host" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill(hostName);
  await page.getByRole("button", { name: "Create and select" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".rounded-xl").filter({ hasText: hostName }).first()).toBeVisible();
  await expect(page.getByLabel("Primary")).toBeChecked();

  const venueName = `${EVENT_TITLE_PREFIX} Venue`;
  await page.getByRole("button", { name: "Create new venue" }).click();
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
  await waitForEventFormReady(page);

  await expect(page.getByLabel("Start date & time")).toHaveValue("2099-06-15T18:00");
  await expect(page.getByLabel("End date & time")).toHaveValue("2099-06-15T19:00");
});

test("event settings area splits resources into focused admin pages", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/settings",
  });

  await expect(page.getByRole("heading", { name: "Event Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage types" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage hosts" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage venues" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Check-In", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Ticketing" })).toBeVisible();

  await page.goto("/admin/events/types");
  await expect(page.getByRole("heading", { name: "Event Types" })).toBeVisible();
  await page.goto("/admin/events/hosts");
  await expect(page.getByRole("heading", { name: "Hosts" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New host" })).toBeVisible();
  await page.goto("/admin/events/venues");
  await expect(page.getByRole("heading", { name: "Venues" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New venue" })).toBeVisible();
  await page.goto("/admin/events/ticketing");
  await expect(page.getByRole("heading", { name: "Ticketing" })).toBeVisible();
});

test("admin events defaults to list management view and can switch to calendar", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events",
  });

  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Events" })).toBeVisible();
  await expect(main.getByRole("navigation", { name: "Event view" }).getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
  await expect(main.locator("table.admin-events-table")).toBeVisible();
  await expect(main.locator(".admin-events-calendar-grid")).toHaveCount(0);

  await main.getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/view=calendar/);
  await expect(main.locator(".admin-events-calendar-grid")).toBeVisible();

  await main.getByRole("link", { name: "List" }).click();
  await expect(main.locator("table.admin-events-table")).toBeVisible();
  await expect(main.getByRole("navigation", { name: "Event view" }).getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
});

test("admin event editor supports image width resizing", async ({ page }) => {
  await loginWithPassword(page, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    next: "/admin/events/new",
  });
  await waitForEventFormReady(page);

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
  await waitForEventFormReady(page);

  await page.getByLabel("Short summary").fill("A fixture event for Zoom validation coverage.");
  await page.getByLabel("Virtual mode").selectOption("zoom");
  await page.getByLabel("Title").fill(`${EVENT_TITLE_PREFIX} Zoom Validation`);
  await page.getByLabel("Start date & time").fill("2099-06-15T18:00");
  await expect(page.getByLabel("Start date & time")).toHaveValue("2099-06-15T18:00");
  await page.getByLabel("End date & time").fill("2099-06-15T19:00");
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
  await waitForEventFormReady(page);

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
      await expect(memberPage.getByRole("link", { name: title, exact: true })).toHaveCount(visible ? 1 : 0);
      if (detailsVisible) {
        const eventId = editPath.split("/").at(-2);
        await memberPage.goto(`/events/${eventId}`);
        await expect(memberPage.getByRole("heading", { name: "Fixture details" })).toBeVisible();
        await expect(memberPage.getByText("This should render after sanitization.")).toBeVisible();
        const detailImage = memberPage.locator('.prose-positives img[src*="/api/media/assets/"]').first();
        await expect(detailImage).toHaveAttribute("alt", "Saved event image");
        await expect(detailImage).toHaveAttribute("width", "420");
        await expect(detailImage).toHaveAttribute("data-align", "left");
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
  await waitForEventFormReady(page);

  await page.getByLabel("Short summary").fill("A fixture event for publishing UX coverage.");
  await page.getByRole("button", { name: "HTML" }).click();
  await page
    .getByLabel("Event details HTML")
    .fill(
      '<h2>Fixture details</h2><p>This should render after sanitization.</p><img src="/api/media/assets/00000000-0000-0000-0000-000000000000" alt="Saved event image" title="Saved image" width="420" data-align="left" loading="lazy">'
    );
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
  await expect(page.locator('.event-editor-image img[src*="/api/media/assets/"]').first()).toHaveAttribute("alt", "Saved event image");
  await expect(page.locator(".event-editor-image").first()).toHaveAttribute("data-align", "left");

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

test("ticketed event hides join access until a paid or comp ticket exists", async ({
  page,
}) => {
  const fixture = await createTicketedEventFixture(EVENT_TITLE_PREFIX);

  await loginWithPassword(page, {
    email: LEVEL_2_MEMBER_EMAIL,
    password: LEVEL_2_MEMBER_PASSWORD,
    next: `/events/${fixture.eventId}`,
  });

  await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
  await expect(page.getByText("Ticket required")).toBeVisible();
  await expect(page.getByText("Reserve your seat")).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Join Event" })).toHaveCount(0);

  await createCompEventTicketFixture({
    memberEmail: LEVEL_2_MEMBER_EMAIL,
    eventId: fixture.eventId,
    ticketTypeId: fixture.ticketTypeId,
  });

  await page.reload();
  await expect(page.getByText("Ticket confirmed")).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Join Event" })).toBeVisible();
});

test("member events browse uses designed month, list, and mobile layouts", async ({
  page,
}) => {
  const fixture = await createEventHostVenueFixture(EVENT_TITLE_PREFIX);

  await loginWithPassword(page, {
    email: LEVEL_2_MEMBER_EMAIL,
    password: LEVEL_2_MEMBER_PASSWORD,
    next: "/events?month=2099-06&view=month",
  });

  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
  await expect(page.locator("[data-events-month-desktop]")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(fixture.title) })).toBeVisible();
  await expect(page.getByRole("link", { name: "Month" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "List", exact: true }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator("[data-events-list]")).toBeVisible();
  await expect(page.getByRole("heading", { name: /June 18/ })).toBeVisible();
  await expect(page.getByRole("link", { name: fixture.title, exact: true })).toBeVisible();

  for (const viewport of [
    { width: 375, height: 844, desktopCalendar: false },
    { width: 768, height: 900, desktopCalendar: false },
    { width: 1024, height: 900, desktopCalendar: true },
    { width: 1440, height: 1000, desktopCalendar: true },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/events?month=2099-06&view=month&date=2099-06-18");
    await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
    await expect(page.locator("[data-events-month-desktop]")).toBeVisible({
      visible: viewport.desktopCalendar,
    });
    await expect(page.locator("[data-events-month-mobile]")).toBeVisible({
      visible: !viewport.desktopCalendar,
    });
    const activeCalendar = viewport.desktopCalendar
      ? page.locator("[data-events-month-desktop]")
      : page.locator("[data-events-month-mobile]");
    await expect(activeCalendar.getByText(fixture.title).first()).toBeVisible();

    await page.goto("/events?month=2099-06&view=list");
    await expect(page.locator("[data-events-list]")).toBeVisible();
    await expect(page.getByRole("link", { name: fixture.title, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View Event" }).first()).toBeVisible();
  }
});

test("member event detail links to host and venue pages with eligible upcoming events", async ({
  page,
}) => {
  const fixture = await createEventHostVenueFixture(EVENT_TITLE_PREFIX);

  await loginWithPassword(page, {
    email: LEVEL_2_MEMBER_EMAIL,
    password: LEVEL_2_MEMBER_PASSWORD,
    next: `/events/${fixture.eventId}`,
  });

  await expect(page.getByRole("heading", { name: fixture.title })).toBeVisible();
  await expect(page.getByRole("link", { name: fixture.primaryHostName })).toBeVisible();
  await expect(page.getByRole("link", { name: fixture.secondHostName })).toBeVisible();
  await expect(page.getByRole("link", { name: fixture.venueName })).toBeVisible();
  await expect(page.getByText("Studio B")).toBeVisible();
  await expect(page.getByText("Use the north lot.")).toBeVisible();

  await page.goto(`/events/hosts/${fixture.hostSlug}`);
  await expect(page.getByRole("heading", { name: fixture.primaryHostName, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: fixture.title, exact: true })).toBeVisible();
  await expect(page.getByText(`primary-host-`)).toBeVisible();

  await page.goto(`/events/hosts/${fixture.secondHostSlug}`);
  await expect(page.getByRole("heading", { name: fixture.secondHostName, exact: true })).toBeVisible();
  await expect(page.getByText("Contact details are private for this host.")).toBeVisible();

  await page.goto(`/events/venues/${fixture.venueSlug}`);
  await expect(page.getByRole("heading", { name: fixture.venueName, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: fixture.title, exact: true })).toBeVisible();
  await expect(page.getByText("111 Test Avenue").first()).toBeVisible();
  await expect(page.getByText("Step-free entry is available.")).toBeVisible();
});

test("member RSVP creates an attendee that admins can check in", async ({
  browser,
}) => {
  const fixture = await createRsvpEventFixture(EVENT_TITLE_PREFIX);
  const attendeeName = `${EVENT_TITLE_PREFIX} Attendee`;
  const attendeeEmail = `event-rsvp-${Date.now()}@example.com`;

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  try {
    await loginWithPassword(memberPage, {
      email: LEVEL_2_MEMBER_EMAIL,
      password: LEVEL_2_MEMBER_PASSWORD,
      next: `/events/${fixture.eventId}`,
    });

    await expect(memberPage.getByRole("heading", { name: fixture.title })).toBeVisible();
    await expect(memberPage.getByRole("heading", { name: "Member RSVP" })).toBeVisible();
    await memberPage.getByLabel("Name").fill(attendeeName);
    await memberPage.getByLabel("Email").fill(attendeeEmail);
    await memberPage.getByRole("button", { name: "Confirm RSVP" }).click();
    await expect(memberPage).toHaveURL(new RegExp(`/events/${fixture.eventId}\\?rsvp=success$`));
    await expect(memberPage.getByText("RSVP confirmed. We saved your spot.")).toBeVisible();
    await expect(memberPage.getByText(attendeeName)).toBeVisible();
  } finally {
    await memberContext.close();
  }

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginWithPassword(adminPage, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      next: `/admin/events/${fixture.eventId}/attendees`,
      allowBootstrapFallback: false,
    });

    await expect(adminPage.getByRole("heading", { name: "Event Attendees" })).toBeVisible();
    await expect(adminPage.getByText(attendeeName)).toBeVisible();
    await expect(adminPage.getByText(attendeeEmail)).toBeVisible();
    const attendeeRow = adminPage.getByRole("row").filter({ hasText: attendeeName });
    await expect(attendeeRow.getByText("Not checked in")).toBeVisible();

    await adminPage.getByRole("button", { name: "Check in" }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/admin/events/${fixture.eventId}/attendees\\?success=checked_in$`));
    await expect(adminPage.getByText("Attendee checked in.")).toBeVisible();
    await expect(attendeeRow.getByText("Checked in").first()).toBeVisible();

    await adminPage.getByRole("button", { name: "Reverse" }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/admin/events/${fixture.eventId}/attendees\\?success=check_in_reversed$`));
    await expect(adminPage.getByText("Check-in reversed.")).toBeVisible();
    await expect(attendeeRow.getByText("Not checked in")).toBeVisible();

    await adminPage.goto(`/admin/events/attendees/check-in?event_id=${fixture.eventId}`);
    await expect(adminPage.getByRole("heading", { name: "Check-In" })).toBeVisible();
    await adminPage.getByLabel("Lookup").fill(attendeeEmail);
    await adminPage.getByRole("button", { name: "Check in attendee" }).click();
    await expect(adminPage).toHaveURL(/\/admin\/events\/attendees\/check-in\?event_id=.*success=checked_in/);
    await expect(adminPage.getByText("Attendee checked in.")).toBeVisible();

    await adminPage.getByLabel("Lookup").fill(attendeeEmail);
    await adminPage.getByRole("button", { name: "Check in attendee" }).click();
    await expect(adminPage).toHaveURL(/\/admin\/events\/attendees\/check-in\?event_id=.*error=already_checked_in/);
    await expect(adminPage.getByText("This attendee is already checked in.")).toBeVisible();
  } finally {
    await adminContext.close();
  }
});

test("custom RSVP fields are required for members and visible to admins", async ({
  browser,
}) => {
  test.skip(!(await eventRegistrationFieldsSupported()), "registration_fields migration is not applied in this environment");

  const fixture = await createRsvpEventFixture(EVENT_TITLE_PREFIX, {
    registrationFields: [
      {
        id: "dietary_needs",
        label: "Dietary needs",
        type: "short_text",
        required: true,
        helpText: "Tell us what to plan around.",
      },
      {
        id: "bring_guest",
        label: "Bringing a guest",
        type: "checkbox",
        required: false,
        helpText: "I may arrive with a guest.",
      },
    ],
  });
  const attendeeName = `${EVENT_TITLE_PREFIX} Field Attendee`;
  const attendeeEmail = `event-rsvp-fields-${Date.now()}@example.com`;

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  try {
    await loginWithPassword(memberPage, {
      email: LEVEL_2_MEMBER_EMAIL,
      password: LEVEL_2_MEMBER_PASSWORD,
      next: `/events/${fixture.eventId}`,
    });

    await expect(memberPage.getByLabel("Dietary needs")).toBeVisible();
    await memberPage.getByLabel("Name").fill(attendeeName);
    await memberPage.getByLabel("Email").fill(attendeeEmail);
    await memberPage.locator('input[name="custom_dietary_needs"]').evaluate((input) => input.removeAttribute("required"));
    await memberPage.getByRole("button", { name: "Confirm RSVP" }).click();
    await expect(memberPage).toHaveURL(new RegExp(`/events/${fixture.eventId}\\?rsvp_error=fields_required$`));
    await expect(memberPage.getByText("Please complete the required registration details.")).toBeVisible();

    await memberPage.getByLabel("Name").fill(attendeeName);
    await memberPage.getByLabel("Email").fill(attendeeEmail);
    await memberPage.getByLabel("Dietary needs").fill("Vegetarian");
    await memberPage.getByRole("button", { name: "Confirm RSVP" }).click();
    await expect(memberPage).toHaveURL(new RegExp(`/events/${fixture.eventId}\\?rsvp=success$`));
  } finally {
    await memberContext.close();
  }

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginWithPassword(adminPage, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      next: `/admin/events/${fixture.eventId}/attendees`,
      allowBootstrapFallback: false,
    });

    const attendeeRow = adminPage.getByRole("row").filter({ hasText: attendeeName });
    await expect(attendeeRow.getByText("Dietary needs: Vegetarian")).toBeVisible();
  } finally {
    await adminContext.close();
  }
});
