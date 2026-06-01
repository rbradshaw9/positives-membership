#!/usr/bin/env node

/**
 * Broad read-only browser smoke for production routes.
 *
 * This intentionally avoids destructive workflows and dynamic pages that require
 * a specific booking/order/session id. It covers public pages, representative
 * member/course/library pages, and read-only admin surfaces in desktop + mobile.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const envPath = resolve(repoRoot, ".env.local");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/affiliate-program",
  "/beta",
  "/contact",
  "/courses",
  "/faq",
  "/forgot-password",
  "/inactive",
  "/join",
  "/login",
  "/offline",
  "/partners",
  "/partners/apply",
  "/privacy",
  "/reset-password",
  "/subscribe",
  "/subscribe/success",
  "/support",
  "/terms",
  "/try",
  "/upgrade",
  "/watch",
];

const MEMBER_ROUTES = [
  "/today",
  "/practice",
  "/journal",
  "/library",
  "/my-courses",
  "/account",
  "/account/billing",
  "/account/affiliate",
  "/account/cancel",
  "/account/coaching",
  "/account/coaching/availability",
];

const LEVEL_2_ROUTES = ["/events", "/community"];
const LEGACY_LEVEL_3_ROUTES = ["/coaching"];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/ops",
  "/admin/beta-feedback",
  "/admin/community",
  "/admin/content",
  "/admin/content/calendar",
  "/admin/content/new",
  "/admin/courses",
  "/admin/events",
  "/admin/events/attendees",
  "/admin/events/attendees/check-in",
  "/admin/events/hosts",
  "/admin/events/hosts/new",
  "/admin/events/new",
  "/admin/events/settings",
  "/admin/events/ticketing",
  "/admin/events/types",
  "/admin/events/venues",
  "/admin/events/venues/new",
  "/admin/ingestion",
  "/admin/integrations",
  "/admin/integrations/zoom",
  "/admin/members",
  "/admin/months",
  "/admin/roles",
  "/admin/team",
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PRODUCTION_SMOKE_BASE_URL || "https://positives.life",
    screenshots: false,
    viewports: "all",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      args.baseUrl = argv[index + 1] ?? args.baseUrl;
      index += 1;
    } else if (arg === "--screenshots") {
      args.screenshots = true;
    } else if (arg === "--viewports") {
      args.viewports = argv[index + 1] ?? args.viewports;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  args.baseUrl = args.baseUrl.replace(/\/$/, "");
  if (!["all", "desktop", "mobile"].includes(args.viewports)) {
    throw new Error('--viewports must be "all", "desktop", or "mobile".');
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/smoke-production-routes.mjs [--base-url https://positives.life] [--viewports all|desktop|mobile] [--screenshots]

Purpose:
  Runs a broad read-only browser route smoke against production.
`);
}

function requiredEnv(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing ${key}.`);
  return value;
}

function routeLabel(route) {
  return `${route.role}:${route.path}`;
}

function screenshotPath(route, viewportName) {
  const safe = `${route.role}-${viewportName}-${route.path}`
    .replace(/^\W+/, "")
    .replaceAll("/", "_")
    .replaceAll(/[^a-zA-Z0-9_.-]/g, "-");
  return resolve(repoRoot, "tmp", "production-route-smoke", `${safe || "root"}.png`);
}

function uniqRoutes(routes) {
  const seen = new Set();
  const out = [];
  for (const route of routes) {
    const key = `${route.role}:${route.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(route);
  }
  return out;
}

async function maybeSingle(supabase, table, select, query) {
  const request = query(supabase.from(table).select(select).limit(1));
  const { data, error } = await request;
  if (error) {
    console.warn(`[route-smoke] Could not load ${table} sample: ${error.message}`);
    return null;
  }
  return data?.[0] ?? null;
}

async function buildDynamicRoutes(supabase) {
  const routes = [];

  const course =
    (await maybeSingle(
      supabase,
      "course",
      "id, slug, title",
      (query) => query.eq("status", "published").eq("slug", "face-your-giants")
    )) ??
    (await maybeSingle(
      supabase,
      "course",
      "id, slug, title",
      (query) => query.eq("status", "published").not("slug", "is", null)
    ));

  if (course?.slug) {
    routes.push({ role: "public", path: `/courses/${course.slug}` });
    routes.push({ role: "member", path: `/library/courses/${course.slug}` });
    routes.push({ role: "member", path: `/my-courses/${course.slug}` });
    routes.push({ role: "admin", path: `/admin/courses/${course.id}` });
    routes.push({ role: "admin", path: `/admin/courses/${course.id}/enrollments` });
  }

  const lesson = await maybeSingle(
    supabase,
    "course_lesson",
    "id, slug, title, course_module(course(slug))",
    (query) => query.eq("status", "published").not("slug", "is", null)
  );
  const lessonCourseSlug = lesson?.course_module?.course?.slug;
  if (lessonCourseSlug && lesson?.slug) {
    routes.push({ role: "member", path: `/library/courses/${lessonCourseSlug}/${lesson.slug}` });
    routes.push({ role: "member", path: `/my-courses/${lessonCourseSlug}/lessons/${lesson.slug}` });
  }

  const content = await maybeSingle(
    supabase,
    "content",
    "id, type, title, month_year, monthly_practice_id",
    (query) =>
      query
        .eq("status", "published")
        .in("type", ["daily_audio", "weekly_principle", "monthly_theme"])
        .order("published_at", { ascending: false })
  );
  if (content?.id) {
    routes.push({ role: "member", path: `/library/${content.id}` });
    routes.push({ role: "admin", path: `/admin/content/${content.id}/edit` });
  }
  if (content?.month_year) {
    routes.push({ role: "member", path: `/library/months/${content.month_year}` });
    routes.push({ role: "member", path: `/practice/${content.month_year}` });
  }

  const month = content?.monthly_practice_id
    ? await maybeSingle(
        supabase,
        "monthly_practice",
        "id, month_year, label",
        (query) => query.eq("id", content.monthly_practice_id)
      )
    : await maybeSingle(
        supabase,
        "monthly_practice",
        "id, month_year, label",
        (query) => query.eq("status", "published").order("month_year", { ascending: false })
      );
  if (month?.id) {
    routes.push({ role: "admin", path: `/admin/months/${month.id}` });
    if (content?.id) {
      routes.push({ role: "admin", path: `/admin/months/${month.id}/content/${content.id}/edit` });
    }
  }

  const event = await maybeSingle(
    supabase,
    "member_event",
    "id, title",
    (query) => query.eq("status", "published").neq("visibility", "hidden").order("starts_at", { ascending: true })
  );
  if (event?.id) routes.push({ role: "level2", path: `/events/${event.id}` });

  const member = await maybeSingle(
    supabase,
    "member",
    "id, email",
    (query) => query.eq("email", process.env.E2E_MEMBER_EMAIL ?? "rbradshaw+l1@gmail.com")
  );
  if (member?.id) {
    routes.push({ role: "admin", path: `/admin/members/${member.id}` });
    routes.push({ role: "admin", path: `/admin/members/${member.id}/assign-l4` });
  }

  const host = await maybeSingle(
    supabase,
    "event_host",
    "slug, name",
    (query) => query.not("slug", "is", null)
  );
  if (host?.slug) routes.push({ role: "level2", path: `/events/hosts/${host.slug}` });

  const venue = await maybeSingle(
    supabase,
    "event_venue",
    "slug, name",
    (query) => query.not("slug", "is", null)
  );
  if (venue?.slug) routes.push({ role: "level2", path: `/events/venues/${venue.slug}` });

  return routes;
}

async function login(context, baseUrl, email, password, next = "/today", expectedPath = next) {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login?next=${encodeURIComponent(next)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(new RegExp(`${expectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), {
    timeout: 20_000,
  });
  await page.close();
}

async function smokeRoute(page, baseUrl, route, viewport, args) {
  const errors = [];
  const failedRequests = [];
  const consoleErrors = [];

  const onPageError = (error) => errors.push(error.message);
  const onRequestFailed = (request) => {
    if (request.resourceType() === "document") {
      failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`);
    }
  };
  const onResponse = (response) => {
    if (response.status() >= 500) {
      failedRequests.push(`${response.status()} ${response.url()}`);
    }
  };
  const onConsole = (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (!/favicon|Failed to load resource: the server responded with a status of 404/i.test(text)) {
        consoleErrors.push(text);
      }
    }
  };

  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);
  page.on("console", onConsole);

  try {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

    const finalUrl = page.url();
    const bodyText = (await page.locator("body").innerText({ timeout: 10_000 })).trim();
    const status = response?.status() ?? 0;
    const title = await page.title().catch(() => "");

    const routeErrors = [];
    if (!response) routeErrors.push("no main document response");
    if (status >= 400) routeErrors.push(`main document status ${status}`);
    if (bodyText.length < 20) routeErrors.push("body text too short");
    if (/Application error|Internal Server Error|This page could not be found/i.test(bodyText)) {
      routeErrors.push("error text visible in body");
    }
    if (errors.length > 0) routeErrors.push(`page errors: ${errors.slice(0, 3).join(" | ")}`);
    if (failedRequests.length > 0) routeErrors.push(`failed requests: ${failedRequests.slice(0, 3).join(" | ")}`);
    if (consoleErrors.length > 0) routeErrors.push(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

    if (routeErrors.length > 0 && args.screenshots) {
      const path = screenshotPath(route, viewport.name);
      mkdirSync(dirname(path), { recursive: true });
      await page.screenshot({ path, fullPage: true }).catch(() => {});
    }

    return {
      ok: routeErrors.length === 0,
      route,
      viewport: viewport.name,
      status,
      finalUrl,
      title,
      textLength: bodyText.length,
      errors: routeErrors,
    };
  } finally {
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
    page.off("console", onConsole);
  }
}

loadEnv(envPath);
const args = parseArgs(process.argv.slice(2));

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const dynamicRoutes = await buildDynamicRoutes(supabase);
const routes = uniqRoutes([
  ...PUBLIC_ROUTES.map((path) => ({ role: "public", path })),
  ...dynamicRoutes.filter((route) => route.role === "public"),
  ...MEMBER_ROUTES.map((path) => ({ role: "member", path })),
  ...dynamicRoutes.filter((route) => route.role === "member"),
  ...LEVEL_2_ROUTES.map((path) => ({ role: "level2", path })),
  ...dynamicRoutes.filter((route) => route.role === "level2"),
  ...LEGACY_LEVEL_3_ROUTES.map((path) => ({ role: "level3", path })),
  ...ADMIN_ROUTES.map((path) => ({ role: "admin", path })),
  ...dynamicRoutes.filter((route) => route.role === "admin"),
]);

const viewports =
  args.viewports === "all"
    ? VIEWPORTS
    : VIEWPORTS.filter((viewport) => viewport.name === args.viewports);

console.log("# Production Route Browser Smoke");
console.log(`Base URL: ${args.baseUrl}`);
console.log(`Routes: ${routes.length}`);
console.log(`Viewports: ${viewports.map((viewport) => viewport.name).join(", ")}`);
console.log();

const browser = await chromium.launch({ headless: true });
const contexts = new Map();
const failures = [];
let passed = 0;

try {
  for (const viewport of viewports) {
    const contextOptions = {
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.isMobile),
    };

    const publicContext = await browser.newContext(contextOptions);
    contexts.set(`public:${viewport.name}`, publicContext);

    const memberContext = await browser.newContext(contextOptions);
    await login(
      memberContext,
      args.baseUrl,
      process.env.E2E_MEMBER_EMAIL ?? "rbradshaw+l1@gmail.com",
      requiredEnv("E2E_MEMBER_PASSWORD")
    );
    contexts.set(`member:${viewport.name}`, memberContext);

    const level2Context = await browser.newContext(contextOptions);
    await login(
      level2Context,
      args.baseUrl,
      process.env.E2E_LEVEL_2_MEMBER_EMAIL ?? "rbradshaw+l2@gmail.com",
      requiredEnv("E2E_LEVEL_2_MEMBER_PASSWORD", process.env.E2E_MEMBER_PASSWORD)
    );
    contexts.set(`level2:${viewport.name}`, level2Context);

    const level3Context = await browser.newContext(contextOptions);
    await login(
      level3Context,
      args.baseUrl,
      process.env.E2E_LEVEL_3_MEMBER_EMAIL ?? "rbradshaw+l3@gmail.com",
      requiredEnv("E2E_LEVEL_3_MEMBER_PASSWORD", process.env.E2E_MEMBER_PASSWORD)
    );
    contexts.set(`level3:${viewport.name}`, level3Context);

    const adminContext = await browser.newContext(contextOptions);
    await login(
      adminContext,
      args.baseUrl,
      process.env.E2E_ADMIN_EMAIL ?? "lopcadmin@gmail.com",
      requiredEnv("E2E_ADMIN_PASSWORD"),
      "/admin",
      "/admin"
    );
    contexts.set(`admin:${viewport.name}`, adminContext);
  }

  for (const viewport of viewports) {
    for (const route of routes) {
      const context = contexts.get(`${route.role}:${viewport.name}`);
      const page = await context.newPage();
      const result = await smokeRoute(page, args.baseUrl, route, viewport, args);
      await page.close();

      const prefix = result.ok ? "OK" : "FAIL";
      console.log(
        `${prefix} [${result.viewport}] ${routeLabel(route)} -> ${result.status} ${result.finalUrl}`
      );

      if (result.ok) {
        passed += 1;
      } else {
        failures.push(result);
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }
    }
  }
} finally {
  for (const context of contexts.values()) {
    await context.close().catch(() => {});
  }
  await browser.close();
}

console.log();
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failures.length}`);

if (failures.length > 0) {
  console.log();
  console.log("Failures:");
  for (const failure of failures) {
    console.log(`- [${failure.viewport}] ${routeLabel(failure.route)}: ${failure.errors.join("; ")}`);
  }
  process.exitCode = 1;
}
