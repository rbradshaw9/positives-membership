import * as Sentry from "@sentry/nextjs";
import type { MonitorConfig } from "@sentry/core";
import { metricCount, metricDistribution } from "@/lib/observability/metrics";

const CRON_MONITORS = {
  reminders: {
    slug: "cron-reminders",
    config: {
      schedule: { type: "crontab", value: "*/15 * * * *" },
      checkinMargin: 5,
      maxRuntime: 120,
      timezone: "UTC",
      failureIssueThreshold: 1,
      recoveryThreshold: 1,
      isolateTrace: true,
    } satisfies MonitorConfig,
  },
  affiliatePayouts: {
    slug: "cron-affiliate-payouts",
    config: {
      schedule: { type: "crontab", value: "0 13 * * *" },
      checkinMargin: 60,
      maxRuntime: 15,
      timezone: "UTC",
      failureIssueThreshold: 1,
      recoveryThreshold: 1,
      isolateTrace: true,
    } satisfies MonitorConfig,
  },
  siteHealth: {
    slug: "cron-site-health",
    config: {
      schedule: { type: "crontab", value: "*/10 * * * *" },
      checkinMargin: 10,
      maxRuntime: 5,
      timezone: "UTC",
      failureIssueThreshold: 1,
      recoveryThreshold: 1,
      isolateTrace: true,
    } satisfies MonitorConfig,
  },
} as const;

export type CronMonitorKey = keyof typeof CRON_MONITORS;

export function getCronMonitor(key: CronMonitorKey) {
  return CRON_MONITORS[key];
}

export async function withCronMonitor<T>(
  key: CronMonitorKey,
  callback: () => Promise<T>
) {
  const monitor = getCronMonitor(key);
  const startedAt = Date.now();

  try {
    const result = await Sentry.withMonitor(monitor.slug, callback, monitor.config);
    metricCount("cron.run", 1, {
      cron: key,
      outcome: "success",
    });
    metricDistribution("cron.duration", Date.now() - startedAt, {
      cron: key,
      outcome: "success",
    });
    return result;
  } catch (error) {
    metricCount("cron.run", 1, {
      cron: key,
      outcome: "error",
    });
    metricDistribution("cron.duration", Date.now() - startedAt, {
      cron: key,
      outcome: "error",
    });
    throw error;
  } finally {
    await Sentry.flush(2_000);
  }
}
