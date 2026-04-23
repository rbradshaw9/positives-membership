#!/usr/bin/env node

/**
 * Read-only launch email readiness audit.
 *
 * This intentionally does not create contacts, apply tags, or send test email.
 * It checks whether the app/ActiveCampaign/Postmark-facing setup appears ready
 * for a launch QA pass and prints the remaining manual gaps.
 */

import { promises as dns } from "dns";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const envPath = resolve(repoRoot, ".env.local");

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

loadEnv(envPath);

const DOMAIN = process.env.EMAIL_AUDIT_DOMAIN || "positives.life";
const AC_BASE_URL = (process.env.ACTIVECAMPAIGN_API_URL || "").replace(/\/$/, "");
const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY || "";

const EXPECTED_LISTS = [{ id: "3", name: "Positives Audience" }];

const EXPECTED_TAGS = [
  { id: "1", name: "level_1" },
  { id: "2", name: "level_2" },
  { id: "3", name: "level_3" },
  { id: "4", name: "level_4" },
  { id: "5", name: "past_due" },
  { id: "6", name: "canceled" },
  { id: "7", name: "founding_member" },
  { id: "8", name: "onboarding_complete" },
  { id: "9", name: "affiliate" },
  { id: "14", name: "welcome_ready" },
  { id: "15", name: "trial_started" },
  { id: "16", name: "payment_succeeded" },
  { id: "17", name: "trial_ending" },
  { id: "18", name: "tier_changed" },
  { id: "19", name: "payment_failed" },
  { id: "20", name: "first_login_complete" },
  { id: "23", name: "access_restored" },
  { id: "24", name: "membership_reactivated" },
  { id: "25", name: "event_reminder_24h" },
  { id: "26", name: "event_reminder_1h" },
  { id: "27", name: "event_replay_ready" },
  { id: "28", name: "coaching_reminder_24h" },
  { id: "29", name: "coaching_reminder_1h" },
  { id: "30", name: "coaching_replay_ready" },
  { id: "32", name: "affiliate_payout_failed" },
];

const EXPECTED_FIELD_IDS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "9",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
];

const EXPECTED_AUTOMATIONS = [
  "POS | C01 | Welcome And Access",
  "POS | C02 | Trial Lifecycle",
  "POS | C03 | Access Restored",
  "POS | C04 | Payment Recovery",
  "POS | C05 | Plan Change",
  "POS | C06 | Cancellation",
  "POS | C07 | Affiliate Onboarding",
  "POS | C08 | Membership Reactivated",
  "POS | C09 | Post-Login Orientation",
  "POS | C10 | Tier Progression And Upsell",
  "POS | R01 | Event Tomorrow",
  "POS | R02 | Event Starting Soon",
  "POS | R03 | Event Replay Ready",
  "POS | R04 | Coaching Tomorrow",
  "POS | R05 | Coaching Starting Soon",
  "POS | R06 | Coaching Replay Ready",
];

const POSTMARK_ENV_KEYS = [
  "POSTMARK_SERVER_TOKEN",
  "POSTMARK_API_TOKEN",
  "POSTMARK_MESSAGE_STREAM",
  "POSTMARK_INBOUND_WEBHOOK_SECRET",
  "POSTMARK_WEBHOOK_SECRET",
];

function print(value = "") {
  console.log(value);
}

function result(ok, text) {
  return `${ok ? "OK" : "CHECK"} - ${text}`;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readExpectedTemplateNames() {
  const buildSheetPath = resolve(repoRoot, "docs/email/activecampaign-automation-build-sheet.md");
  if (!existsSync(buildSheetPath)) return [];

  const raw = readFileSync(buildSheetPath, "utf8");
  const names = [];
  const rowPattern = /^\|\s*`(POS [^`]+)`\s*\|/gm;
  let match = rowPattern.exec(raw);
  while (match) {
    names.push(match[1]);
    match = rowPattern.exec(raw);
  }
  return Array.from(new Set(names));
}

async function acFetch(path) {
  if (!AC_BASE_URL || !AC_API_KEY) {
    throw new Error("ACTIVECAMPAIGN_API_URL or ACTIVECAMPAIGN_API_KEY is missing.");
  }
  const response = await fetch(`${AC_BASE_URL}/api/3${path}`, {
    headers: {
      "Api-Token": AC_API_KEY,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${response.status}: ${text.slice(0, 300)}`);
  }
  return body;
}

async function acCollection(path, key, limit = 100) {
  const items = [];
  let offset = 0;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const body = await acFetch(`${path}${separator}limit=${limit}&offset=${offset}`);
    const page =
      body[key] ??
      (key === "triggers" ? body.automationTriggers : undefined) ??
      [];
    items.push(...page);

    const total = Number(body.meta?.total ?? items.length);
    if (page.length === 0 || items.length >= total || page.length < limit) break;
    offset += limit;
  }

  return items;
}

async function safeCheck(label, callback) {
  try {
    return { label, ok: true, value: await callback() };
  } catch (error) {
    return {
      label,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function resolveTxt(name) {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((record) => record.join(""));
  } catch {
    return [];
  }
}

function findById(items, id) {
  return items.find((item) => String(item.id) === String(id));
}

function findByName(items, name) {
  const expected = normalize(name);
  return items.find((item) => normalize(item.name) === expected);
}

async function getActiveCampaignState() {
  const [lists, tags, fields, templates, automations, campaigns, messages, addresses] =
    await Promise.all([
      acCollection("/lists", "lists"),
      acCollection("/tags", "tags"),
      acCollection("/fields", "fields"),
      acCollection("/templates", "templates"),
      acCollection("/automations", "automations"),
      acCollection("/campaigns", "campaigns"),
      acCollection("/messages", "messages"),
      acCollection("/addresses", "addresses"),
    ]);

  const welcomeAutomation = findByName(automations, "POS | C01 | Welcome And Access");
  const welcomeTriggers = welcomeAutomation
    ? await safeCheck("welcome triggers", () =>
        acCollection(`/automations/${welcomeAutomation.id}/triggers`, "triggers")
      )
    : null;

  return {
    lists,
    tags,
    fields,
    templates,
    automations,
    campaigns,
    messages,
    addresses,
    welcomeAutomation,
    welcomeTriggers,
  };
}

async function getDnsState() {
  const dkimSelectors = [
    "pm",
    "postmark",
    "pm-bounces",
    "k1",
    "selector1",
    "zoho",
    "zmail",
  ];

  const [rootTxt, dmarcTxt, ...dkimResults] = await Promise.all([
    resolveTxt(DOMAIN),
    resolveTxt(`_dmarc.${DOMAIN}`),
    ...dkimSelectors.map((selector) => resolveTxt(`${selector}._domainkey.${DOMAIN}`)),
  ]);

  return {
    rootTxt,
    dmarcTxt,
    dkim: Object.fromEntries(
      dkimSelectors.map((selector, index) => [selector, dkimResults[index]])
    ),
  };
}

function summarizeActiveCampaign(state) {
  const expectedTemplateNames = readExpectedTemplateNames();

  const missingLists = EXPECTED_LISTS.filter((expected) => {
    const found = findById(state.lists, expected.id);
    return !found || normalize(found.name) !== normalize(expected.name);
  });

  const missingTags = EXPECTED_TAGS.filter((expected) => {
    const found = findById(state.tags, expected.id);
    return !found || normalize(found.tag || found.name) !== normalize(expected.name);
  });

  const missingFields = EXPECTED_FIELD_IDS.filter((id) => !findById(state.fields, id));

  const templateNames = new Set(state.templates.map((template) => template.name));
  const missingTemplates = expectedTemplateNames.filter((name) => !templateNames.has(name));

  const automationNames = new Set(state.automations.map((automation) => automation.name));
  const visibleExpectedAutomations = EXPECTED_AUTOMATIONS.filter((name) => automationNames.has(name));
  const missingAutomations = EXPECTED_AUTOMATIONS.filter((name) => !automationNames.has(name));

  const gmailMessages = state.messages.filter((message) =>
    /@gmail\.com$/i.test(String(message.fromemail ?? ""))
  );
  const positiveMessages = state.messages.filter((message) =>
    /@positives\.life$/i.test(String(message.fromemail ?? ""))
  );

  const welcomeTriggerTags =
    state.welcomeTriggers?.ok && Array.isArray(state.welcomeTriggers.value)
      ? state.welcomeTriggers.value
          .map((trigger) => trigger.tag || trigger.segmentid || trigger?.data?.tag)
          .filter(Boolean)
      : [];
  const welcomeHasTagTrigger =
    state.welcomeTriggers?.ok &&
    state.welcomeTriggers.value.some((trigger) => {
      const triggerType = normalize(trigger.type || trigger.name);
      const raw = JSON.stringify(trigger).toLowerCase();
      return (
        triggerType.includes("tag") &&
        (raw.includes("welcome_ready") ||
          new RegExp(`"tag"\\s*:\\s*"?${escapeRegExp("14")}"?`).test(raw))
      );
    });

  return {
    expectedTemplateNames,
    missingLists,
    missingTags,
    missingFields,
    missingTemplates,
    visibleExpectedAutomations,
    missingAutomations,
    gmailMessages,
    positiveMessages,
    welcomeTriggerTags,
    welcomeHasTagTrigger,
  };
}

function summarizeDns(state) {
  const spfRecords = state.rootTxt.filter((record) => /^v=spf1/i.test(record));
  const dmarcRecords = state.dmarcTxt.filter((record) => /^v=DMARC1/i.test(record));
  const postmarkDkim = Object.entries(state.dkim).filter(
    ([selector, records]) =>
      selector !== "zmail" &&
      records.some((record) => /dkim|p=/i.test(record))
  );
  const zohoDkim = state.dkim.zmail?.some((record) => /dkim|p=/i.test(record)) ?? false;

  return { spfRecords, dmarcRecords, postmarkDkim, zohoDkim };
}

function hasPostmarkEnv() {
  return POSTMARK_ENV_KEYS.some((key) => Boolean(process.env[key]));
}

function hasSendEmailHookRoute() {
  return existsSync(resolve(repoRoot, "app/api/auth/send-email-hook/route.ts"));
}

function printActiveCampaignSection(check) {
  print("## ActiveCampaign");
  if (!check.ok) {
    print(`- ${result(false, check.error)}`);
    print();
    return;
  }

  const summary = summarizeActiveCampaign(check.value);
  print(`- ${result(summary.missingLists.length === 0, `${check.value.lists.length} list(s) visible`)}`);
  print(`- ${result(summary.missingTags.length === 0, `${EXPECTED_TAGS.length - summary.missingTags.length}/${EXPECTED_TAGS.length} expected tags present`)}`);
  print(`- ${result(summary.missingFields.length === 0, `${EXPECTED_FIELD_IDS.length - summary.missingFields.length}/${EXPECTED_FIELD_IDS.length} expected custom field IDs present`)}`);
  print(`- ${result(summary.missingTemplates.length === 0, `${summary.expectedTemplateNames.length - summary.missingTemplates.length}/${summary.expectedTemplateNames.length} expected POS templates present`)}`);
  print(`- ${result(summary.missingAutomations.length === 0, `${summary.visibleExpectedAutomations.length}/${EXPECTED_AUTOMATIONS.length} expected launch automations visible`)}`);
  print(`- ${result(Boolean(check.value.welcomeAutomation), "C01 welcome automation visible")}`);
  print(`- ${result(summary.welcomeHasTagTrigger, "C01 appears to trigger from welcome_ready")}`);
  print(`- ${result(summary.gmailMessages.length === 0, `${summary.gmailMessages.length} message(s) still use gmail.com sender`)}`);
  print(`- ${result(summary.positiveMessages.length > 0, `${summary.positiveMessages.length} message(s) use positives.life sender`)}`);
  print(`- Campaigns visible: ${check.value.campaigns.length}`);
  print(`- Physical mailing addresses visible: ${check.value.addresses.length}`);

  if (summary.missingAutomations.length > 0) {
    print("- Missing/hidden expected automations:");
    for (const name of summary.missingAutomations) print(`  - ${name}`);
  }
  if (summary.gmailMessages.length > 0) {
    print("- Gmail sender messages to review:");
    for (const message of summary.gmailMessages.slice(0, 12)) {
      print(`  - ${message.name || `message ${message.id}`}: ${message.fromemail}`);
    }
    if (summary.gmailMessages.length > 12) {
      print(`  - ...${summary.gmailMessages.length - 12} more`);
    }
  }
  print();
}

function printDnsSection(check) {
  print("## DNS And Sender Authentication");
  if (!check.ok) {
    print(`- ${result(false, check.error)}`);
    print();
    return;
  }

  const summary = summarizeDns(check.value);
  const spfMentionsPostmark = summary.spfRecords.some((record) => /postmarkapp\.com/i.test(record));
  print(`- ${result(summary.spfRecords.length > 0, `SPF record count: ${summary.spfRecords.length}`)}`);
  print(`- ${result(summary.dmarcRecords.length > 0, `DMARC record count: ${summary.dmarcRecords.length}`)}`);
  print(`- ${result(summary.zohoDkim, "Zoho DKIM selector zmail present")}`);
  print(`- ${result(summary.postmarkDkim.length > 0, `Postmark-like DKIM selectors present: ${summary.postmarkDkim.map(([selector]) => selector).join(", ") || "none"}`)}`);
  print(`- ${result(spfMentionsPostmark, "SPF includes Postmark sender include")}`);

  if (summary.spfRecords.length > 0) {
    for (const record of summary.spfRecords) print(`  - SPF: ${record}`);
  }
  if (summary.dmarcRecords.length > 0) {
    for (const record of summary.dmarcRecords) print(`  - DMARC: ${record}`);
  }
  print();
}

function printAppConfigSection() {
  const sendEmailHookSecretPresent = Boolean(process.env.SEND_EMAIL_HOOK_SECRET);
  const sendEmailHookRoutePresent = hasSendEmailHookRoute();

  print("## App Configuration");
  print(`- ${result(Boolean(AC_BASE_URL && AC_API_KEY), "ActiveCampaign API env present")}`);
  print(`- ${result(Boolean(process.env.ACTIVECAMPAIGN_WEBHOOK_SECRET), "ActiveCampaign webhook secret present")}`);
  print(`- ${result(Boolean(process.env.EMAIL_UNSUBSCRIBE_SECRET), "unsubscribe signing secret present")}`);
  print(`- ${result(!sendEmailHookSecretPresent || sendEmailHookRoutePresent, "send-email hook route is present if hook secret is configured")}`);
  if (sendEmailHookSecretPresent && !sendEmailHookRoutePresent) {
    print("  - SEND_EMAIL_HOOK_SECRET is configured locally, but app/api/auth/send-email-hook/route.ts does not exist.");
    print("  - If the Supabase Send Email Hook is enabled in production, magic links and password resets will fail unless the hook is disabled or this route sends real email.");
  }
  print(`- ${result(hasPostmarkEnv(), "Postmark env visible locally")}`);
  if (!hasPostmarkEnv()) {
    print("  - No POSTMARK_* env vars were visible locally; AC may still own Postmark sending, but app-side Postmark readiness cannot be proven here.");
  }
  print();
}

function printNextSteps(activeCampaignCheck, dnsCheck) {
  const acReady =
    activeCampaignCheck.ok &&
    summarizeActiveCampaign(activeCampaignCheck.value).missingAutomations.length === 0 &&
    summarizeActiveCampaign(activeCampaignCheck.value).gmailMessages.length === 0;
  const dnsReady =
    dnsCheck.ok &&
    summarizeDns(dnsCheck.value).postmarkDkim.length > 0 &&
    summarizeDns(dnsCheck.value).spfRecords.some((record) => /postmarkapp\.com/i.test(record));

  print("## Recommended Follow-Up");
  if (acReady && dnsReady && hasPostmarkEnv()) {
    print("- No major configuration gaps detected by this read-only audit.");
    print("- Next safe step: send controlled test emails only to internal test addresses from the dashboard.");
  } else {
    print("- Build/verify any missing ActiveCampaign launch automations, especially lifecycle and R01-R06 reminder flows.");
    print("- Move remaining sender addresses from personal Gmail to an approved positives.life sender.");
    print("- Verify Postmark sender-domain DNS and message streams in the Postmark/ActiveCampaign dashboard.");
    print("- After dashboard changes, rerun `npm run audit:email` before sending controlled test messages.");
  }
}

const [activeCampaignCheck, dnsCheck] = await Promise.all([
  safeCheck("ActiveCampaign", getActiveCampaignState),
  safeCheck("DNS", getDnsState),
]);

print("# Email Launch Readiness Audit");
print();
print(`Generated: ${new Date().toISOString()}`);
print(`Domain: ${DOMAIN}`);
print("Mode: read-only, no contacts changed, no messages sent");
print();

printAppConfigSection();
printActiveCampaignSection(activeCampaignCheck);
printDnsSection(dnsCheck);
printNextSteps(activeCampaignCheck, dnsCheck);
