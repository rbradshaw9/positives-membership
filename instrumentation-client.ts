import * as Sentry from "@sentry/nextjs";
import { getSentryEnvironment, isSentryEnabled } from "@/lib/observability/sentry-env";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: isSentryEnabled(dsn),
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  replaysSessionSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  replaysOnErrorSampleRate: 1,
  enableLogs: true,
  environment: getSentryEnvironment(
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV
  ),
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
