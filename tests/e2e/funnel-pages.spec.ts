import { expect, test, type Response as PlaywrightResponse } from "@playwright/test";
import { loginWithPassword, MEMBER_EMAIL, MEMBER_PASSWORD } from "./helpers";

async function expectHealthyResponse(pathname: string, response: PlaywrightResponse | null) {
  expect(response, `${pathname} should return a response`).not.toBeNull();
  expect(response!.status(), `${pathname} should not return an error status`).toBeLessThan(400);
}

const FUNNEL_ROUTES = [
  {
    pathname: "/",
    heading: "A few minutes each day. A more positive life.",
  },
  {
    pathname: "/watch",
    heading: "Hear why a few minutes each day can change the rest of your life.",
  },
  {
    pathname: "/try",
    heading: "Try the Positives rhythm before you pay for it.",
  },
] as const;

for (const viewport of [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1440, height: 960 },
] as const) {
  test(`public funnel pages render cleanly on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of FUNNEL_ROUTES) {
      const response = await page.goto(route.pathname);
      await expectHealthyResponse(route.pathname, response);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    }
  });
}

test("logged-in members can browse public funnel pages without being forced away", async ({
  page,
}) => {
  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  let response = await page.goto("/");
  await expectHealthyResponse("/", response);
  await expect(page.getByRole("heading", { level: 1, name: "A few minutes each day. A more positive life." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Today" }).first()).toBeVisible();

  response = await page.goto("/watch");
  await expectHealthyResponse("/watch", response);
  await expect(page.getByRole("heading", { level: 1, name: "Hear why a few minutes each day can change the rest of your life." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Today" }).first()).toBeVisible();

  response = await page.goto("/try");
  await expectHealthyResponse("/try", response);
  await expect(page.getByRole("heading", { level: 2, name: "You already have access to Positives." })).toBeVisible();

  response = await page.goto("/join");
  await expectHealthyResponse("/join", response);
  await expect(page).toHaveURL(/\/today$/);
});

test("partner and funnel links preserve attribution parameters", async ({ page }) => {
  let response = await page.goto("/with/april-webinar?fpr=ryan32&utm_source=partner&utm_campaign=april");
  await expectHealthyResponse("/with/april-webinar", response);
  await expect(page).toHaveURL(/\/try\?fpr=ryan32&utm_source=partner&utm_campaign=april/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Try the Positives rhythm before you pay for it." })
  ).toBeVisible();

  response = await page.goto("/watch?fpr=ryan32&utm_medium=email");
  await expectHealthyResponse("/watch", response);
  await expect(page.getByRole("link", { name: "Join Positives →" })).toHaveAttribute(
    "href",
    /\/join\?fpr=ryan32&utm_medium=email/
  );
});
