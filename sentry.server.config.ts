import * as Sentry from "@sentry/nextjs";
import { getSentryEnvironment, isSentryEnabled } from "@/lib/observability/sentry-env";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: isSentryEnabled(dsn),
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  enableLogs: true,
  includeLocalVariables: true,
  environment: getSentryEnvironment(process.env.VERCEL_ENV ?? process.env.NODE_ENV),
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
