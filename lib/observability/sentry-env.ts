export function isLocalDevelopment() {
  return process.env.NODE_ENV === "development";
}

export function isSentryEnabled(dsn?: string | null) {
  if (!dsn) return false;
  if (!isLocalDevelopment()) return true;
  return process.env.SENTRY_ENABLE_LOCAL === "true";
}

export function getSentryEnvironment(fallback?: string | null) {
  if (!isLocalDevelopment()) return fallback ?? process.env.NODE_ENV;
  return process.env.SENTRY_ENABLE_LOCAL === "true"
    ? "local-development"
    : "local-development-disabled";
}
