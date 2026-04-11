import { expect, test, type Response as PlaywrightResponse } from "@playwright/test";
import {
  LEVEL_2_MEMBER_EMAIL,
  LEVEL_2_MEMBER_PASSWORD,
  LEVEL_3_MEMBER_EMAIL,
  LEVEL_3_MEMBER_PASSWORD,
  loginWithPassword,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
} from "./helpers";

async function expectHealthyResponse(pathname: string, response: PlaywrightResponse | null) {
  expect(response, `${pathname} should return a response`).not.toBeNull();
  expect(response!.status(), `${pathname} should not return an error status`).toBeLessThan(400);
}

test("public launch routes render their key entry surfaces", async ({ page }) => {
  const publicRoutes = [
    {
      pathname: "/",
      assertVisible: async () => {
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: "A few minutes each day. A more positive life.",
          })
        ).toBeVisible();
      },
    },
    {
      pathname: "/join",
      assertVisible: async () => {
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: "Choose the level of support that fits you.",
          })
        ).toBeVisible();
      },
    },
    {
      pathname: "/login",
      assertVisible: async () => {
        await expect(page.getByRole("button", { name: "Sign in →" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
      },
    },
    {
      pathname: "/forgot-password",
      assertVisible: async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "Reset your password" })
        ).toBeVisible();
      },
    },
    {
      pathname: "/faq",
      assertVisible: async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "Questions, answered." })
        ).toBeVisible();
      },
    },
    {
      pathname: "/support",
      assertVisible: async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "We're here to help." })
        ).toBeVisible();
      },
    },
    {
      pathname: "/privacy",
      assertVisible: async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "Privacy Policy" })
        ).toBeVisible();
      },
    },
    {
      pathname: "/terms",
      assertVisible: async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: "Terms of Service" })
        ).toBeVisible();
      },
    },
  ] as const;

  for (const route of publicRoutes) {
    const response = await page.goto(route.pathname);
    await expectHealthyResponse(route.pathname, response);
    await route.assertVisible();
  }
});

test("public info pages reuse the shared marketing shell", async ({ page }) => {
  const infoRoutes = [
    {
      pathname: "/about",
      heading: "Dr. Paul Jenkins",
    },
    {
      pathname: "/faq",
      heading: "Questions, answered.",
    },
    {
      pathname: "/support",
      heading: "We're here to help.",
    },
    {
      pathname: "/privacy",
      heading: "Privacy Policy",
    },
    {
      pathname: "/terms",
      heading: "Terms of Service",
    },
    {
      pathname: "/affiliate-program",
      heading: "Positives Affiliate Program Terms",
    },
  ] as const;

  for (const route of infoRoutes) {
    const response = await page.goto(route.pathname);
    await expectHealthyResponse(route.pathname, response);
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    await expect(
      page.getByLabel("Public site navigation").getByRole("link", { name: "Sign in" })
    ).toBeVisible();
    await expect(
      page.getByRole("contentinfo").getByText("From $37/month · Cancel anytime · 30-day guarantee")
    ).toBeVisible();
  }
});

test("core signed-in launch routes stay available across member tiers", async ({ page }) => {
  await loginWithPassword(page, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    next: "/today",
  });

  await expect(page.getByRole("navigation", { name: "Member navigation" })).toBeVisible();
  await expect(page.getByRole("region").first()).toBeVisible();

  let response = await page.goto("/account");
  await expectHealthyResponse("/account", response);
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();

  await loginWithPassword(page, {
    email: LEVEL_2_MEMBER_EMAIL,
    password: LEVEL_2_MEMBER_PASSWORD,
    next: "/events",
  });

  response = await page.goto("/events");
  await expectHealthyResponse("/events", response);
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();

  await loginWithPassword(page, {
    email: LEVEL_3_MEMBER_EMAIL,
    password: LEVEL_3_MEMBER_PASSWORD,
    next: "/coaching",
  });

  response = await page.goto("/coaching");
  await expectHealthyResponse("/coaching", response);
  await expect(page.getByRole("heading", { name: "Coaching", exact: true })).toBeVisible();
});
