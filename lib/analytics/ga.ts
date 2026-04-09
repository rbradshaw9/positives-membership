export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (
      command: "js" | "config" | "event" | "set",
      target: string | Date,
      params?: AnalyticsEventParams
    ) => void;
  }
}

export function analyticsEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
}

export function pageview(url: string, title?: string) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", {
    page_location: url,
    page_path: new URL(url).pathname,
    page_title: title,
  });
}

export function track(eventName: string, params: AnalyticsEventParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}
