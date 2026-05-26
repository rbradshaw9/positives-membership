#!/usr/bin/env node

/**
 * Read-only Vercel environment separation audit.
 *
 * Pulls Production and Preview env snapshots through the Vercel CLI, compares
 * safety-critical keys without printing secret values, and deletes temp files.
 */

import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";

const CHECKS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    expectation: "different",
    label: "Preview Supabase URL differs from Production",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    expectation: "different",
    label: "Preview Supabase anon key differs from Production",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    expectation: "different",
    label: "Preview Supabase service role differs from Production",
  },
  {
    key: "STRIPE_SECRET_KEY",
    expectation: "preview_test",
    label: "Preview Stripe secret key is test mode",
  },
  {
    key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    expectation: "preview_test",
    label: "Preview Stripe publishable key is test mode",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    expectation: "preview_present",
    label: "Preview Stripe webhook secret is configured",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    expectation: "different",
    label: "Preview app URL differs from Production",
  },
];

function print(value = "") {
  console.log(value);
}

function result(ok, text) {
  return `${ok ? "OK" : "CHECK"} - ${text}`;
}

function parseEnv(raw) {
  const env = {};
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
    env[key] = value;
  }
  return env;
}

function stripeMode(value) {
  if (!value) return "missing";
  if (/^sk_test_|^pk_test_/.test(value)) return "test";
  if (/^sk_live_|^pk_live_/.test(value)) return "live";
  return "configured";
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed (${code}): ${stderr || stdout}`));
    });
  });
}

async function pullVercelEnv(environment, path) {
  await run("vercel", ["env", "pull", path, "--environment", environment, "--yes"]);
  return parseEnv(await readFile(path, "utf8"));
}

function evaluateCheck(check, production, preview) {
  const productionValue = production[check.key] ?? "";
  const previewValue = preview[check.key] ?? "";

  switch (check.expectation) {
    case "different":
      return Boolean(productionValue && previewValue && productionValue !== previewValue);
    case "preview_test":
      return stripeMode(previewValue) === "test";
    case "preview_present":
      return Boolean(previewValue);
    default:
      return false;
  }
}

let tempDir;

try {
  tempDir = await mkdtemp(join(tmpdir(), "positives-vercel-env-"));
  const productionPath = join(tempDir, "production.env");
  const previewPath = join(tempDir, "preview.env");

  const [production, preview] = await Promise.all([
    pullVercelEnv("production", productionPath),
    pullVercelEnv("preview", previewPath),
  ]);

  print("# Vercel Environment Separation Audit");
  print();
  print(`Generated: ${new Date().toISOString()}`);
  print("Mode: read-only, secret values are not printed");
  print();

  for (const check of CHECKS) {
    const ok = evaluateCheck(check, production, preview);
    print(`- ${result(ok, check.label)}`);

    if (!ok && check.expectation === "different") {
      const productionPresent = Boolean(production[check.key]);
      const previewPresent = Boolean(preview[check.key]);
      const same = productionPresent && previewPresent && production[check.key] === preview[check.key];
      print(
        `  - ${check.key}: production=${productionPresent ? "present" : "missing"}, ` +
          `preview=${previewPresent ? "present" : "missing"}, same=${same}`
      );
    }

    if (!ok && check.expectation === "preview_test") {
      print(`  - ${check.key}: preview mode is ${stripeMode(preview[check.key])}`);
    }

    if (!ok && check.expectation === "preview_present") {
      print(`  - ${check.key}: preview value is missing`);
    }
  }

  print();
  print("## Summary");
  const failures = CHECKS.filter((check) => !evaluateCheck(check, production, preview));
  if (failures.length === 0) {
    print("- Preview appears separated enough for staging QA.");
  } else {
    print(`- ${failures.length} environment separation check(s) need attention before full preview/staging QA.`);
    print("- Do not treat Vercel Preview as safe for member, checkout, webhook, or reminder testing until these checks pass.");
  }
} finally {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
}
