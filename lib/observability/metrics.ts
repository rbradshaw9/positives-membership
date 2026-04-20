import * as Sentry from "@sentry/nextjs";

type MetricAttributeValue = string | number | boolean | null | undefined;
type MetricAttributes = Record<string, MetricAttributeValue>;

const MAX_ATTRIBUTE_LENGTH = 80;

function cleanAttributeValue(value: MetricAttributeValue) {
  if (value === null || value === undefined || value === "") return undefined;

  if (typeof value === "string") {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, MAX_ATTRIBUTE_LENGTH);
  }

  return value;
}

function cleanAttributes(attributes?: MetricAttributes) {
  if (!attributes) return undefined;

  const cleaned: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(attributes)) {
    const cleanedValue = cleanAttributeValue(value);
    if (cleanedValue !== undefined) {
      cleaned[key] = cleanedValue;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function routeBucket(path: string | null | undefined) {
  if (!path) return "unknown";

  let pathname = path;
  try {
    pathname = path.startsWith("http") ? new URL(path).pathname : path.split("?")[0] || path;
  } catch {
    pathname = path.split("?")[0] || path;
  }

  if (pathname === "/") return "home";
  if (pathname === "/join") return "join";
  if (pathname === "/try") return "try";
  if (pathname === "/beta") return "beta";
  if (pathname.startsWith("/courses")) return "courses";
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/today")) return "today";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/api")) return "api";
  return "other";
}

export function metricCount(
  name: string,
  value = 1,
  attributes?: MetricAttributes
) {
  try {
    Sentry.metrics.count(name, value, {
      attributes: cleanAttributes(attributes),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[metrics] count failed:", name, error);
    }
  }
}

export function metricDistribution(
  name: string,
  value: number,
  attributes?: MetricAttributes,
  unit = "millisecond"
) {
  try {
    Sentry.metrics.distribution(name, value, {
      unit,
      attributes: cleanAttributes(attributes),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[metrics] distribution failed:", name, error);
    }
  }
}
