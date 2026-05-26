#!/usr/bin/env node

/**
 * Read-only PWA/install readiness audit.
 *
 * This validates the repeatable pieces of "Add to Home Screen": manifest,
 * icons, service worker, offline shell, and member install prompt wiring. It
 * does not replace a final real-device install check on iOS and Android.
 */

import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

function loadEnv(path) {
  try {
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
  } catch {
    // Fall back to ambient env.
  }
}

function line(value = "") {
  console.log(value);
}

function status(ok, label) {
  return `${ok ? "OK" : "CHECK"} - ${label}`;
}

function normalizeUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function localFile(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function pngDimensions(buffer) {
  const bytes = new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const isPng = signature.every((byte, index) => bytes[index] === byte);
  if (!isPng || bytes.length < 24) return null;

  const view = new DataView(buffer);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    contentType: response.headers.get("content-type") || "",
    text,
  };
}

async function fetchBytes(url) {
  const response = await fetch(url, { redirect: "follow" });
  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    contentType: response.headers.get("content-type") || "",
    buffer: await response.arrayBuffer(),
  };
}

function validateManifest(manifest) {
  const checks = [];
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const hasIconAtLeast = (size, purpose) =>
    icons.some((icon) => {
      const sizes = String(icon.sizes || "");
      const iconPurposes = String(icon.purpose || "any").split(/\s+/);
      const matchesPurpose = purpose ? iconPurposes.includes(purpose) : true;
      const matchesSize =
        sizes === "any" ||
        sizes
          .split(/\s+/)
          .some((entry) => {
            const [width, height] = entry.split("x").map(Number);
            return width >= size && height >= size;
          });
      return matchesPurpose && matchesSize && String(icon.src || "").endsWith(".png");
    });

  checks.push({ ok: Boolean(manifest.name), label: "manifest has name" });
  checks.push({ ok: Boolean(manifest.short_name), label: "manifest has short_name" });
  checks.push({ ok: Boolean(manifest.start_url), label: "manifest has start_url" });
  checks.push({ ok: manifest.scope === "/", label: "manifest scope is /" });
  checks.push({ ok: manifest.display === "standalone", label: "manifest display is standalone" });
  checks.push({ ok: Boolean(manifest.theme_color), label: "manifest has theme_color" });
  checks.push({ ok: Boolean(manifest.background_color), label: "manifest has background_color" });
  checks.push({ ok: hasIconAtLeast(192), label: "manifest includes a 192px+ PNG icon" });
  checks.push({ ok: hasIconAtLeast(512), label: "manifest includes a 512px+ PNG icon" });
  checks.push({ ok: hasIconAtLeast(192, "maskable"), label: "manifest includes maskable PNG icon" });
  return checks;
}

function validateLocalWiring() {
  const layout = localFile("app/(member)/layout.tsx");
  const shell = localFile("components/member/MemberShellClient.tsx");
  const swRegistration = localFile("components/platform/ServiceWorkerRegistration.tsx");
  const installPrompt = localFile("components/member/InstallAppPrompt.tsx");

  return [
    {
      ok: layout.includes("<ServiceWorkerRegistration />"),
      label: "member layout registers service worker component",
    },
    {
      ok: swRegistration.includes('navigator.serviceWorker.register("/sw.js")'),
      label: "service worker registers /sw.js",
    },
    {
      ok: shell.includes("<InstallAppPrompt />"),
      label: "member shell renders install prompt",
    },
    {
      ok:
        installPrompt.includes("beforeinstallprompt") &&
        installPrompt.includes("appinstalled") &&
        installPrompt.includes("Add to Home Screen"),
      label: "install prompt handles Android and iOS install flows",
    },
    {
      ok: existsSync(resolve(ROOT, "public/sw.js")),
      label: "public service worker file exists",
    },
  ];
}

loadEnv(ENV_PATH);

const BASE_URL = normalizeUrl(
  process.env.PWA_AUDIT_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://positives.life",
);

line("# PWA Install Readiness Audit");
line();
line(`Target: ${BASE_URL}`);
line();

const checks = [];

try {
  const manifestResponse = await fetchText(`${BASE_URL}/manifest.webmanifest`);
  checks.push({
    ok: manifestResponse.ok && manifestResponse.contentType.includes("manifest"),
    label: `/manifest.webmanifest returns manifest content (${manifestResponse.status})`,
  });

  const manifest = JSON.parse(manifestResponse.text);
  checks.push(...validateManifest(manifest));

  const iconResults = await Promise.all(
    Array.from(
      new Set(
        (Array.isArray(manifest.icons) ? manifest.icons : [])
          .map((icon) => String(icon.src || ""))
          .filter((src) => src.startsWith("/")),
      ),
    ).map(async (src) => {
      const response = await fetchBytes(`${BASE_URL}${src}`);
      const dimensions = pngDimensions(response.buffer);
      const declared = (manifest.icons || []).filter((icon) => icon.src === src);
      const declaredSizes = declared.flatMap((icon) => String(icon.sizes || "").split(/\s+/));
      const dimensionMatches =
        dimensions &&
        declaredSizes.some((size) => {
          const [width, height] = size.split("x").map(Number);
          return dimensions.width === width && dimensions.height === height;
        });

      return {
        ok: response.ok && response.contentType.includes("image/png") && Boolean(dimensionMatches),
        label: `${src} is a reachable PNG with declared dimensions`,
      };
    }),
  );
  checks.push(...iconResults);

  const serviceWorker = await fetchText(`${BASE_URL}/sw.js`);
  checks.push({
    ok:
      serviceWorker.ok &&
      serviceWorker.text.includes("CACHE_NAME") &&
      serviceWorker.text.includes('const OFFLINE_URL = "/offline"'),
    label: `/sw.js returns offline-capable service worker (${serviceWorker.status})`,
  });

  const offline = await fetchText(`${BASE_URL}/offline`);
  checks.push({
    ok: offline.ok && offline.text.toLowerCase().includes("offline"),
    label: `/offline returns an offline fallback page (${offline.status})`,
  });
} catch (error) {
  checks.push({
    ok: false,
    label: `remote PWA audit failed: ${error instanceof Error ? error.message : String(error)}`,
  });
}

checks.push(...validateLocalWiring());

for (const check of checks) {
  line(status(check.ok, check.label));
}

line();
line("Manual follow-up - run one actual Add to Home Screen install on iOS Safari and one Android Chrome install before invite.");

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  line();
  line(`${failed.length} PWA readiness check${failed.length === 1 ? "" : "s"} need attention.`);
  process.exitCode = 1;
}
