import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { montserrat, poppins } from "@/app/fonts";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Positives — A Daily Practice for Calm, Clarity & Resilience",
  description:
    "Positives is a practice-based membership platform for daily grounding, emotional resilience, and personal growth. Members return to it — they don't complete it.",
  metadataBase: new URL(config.app.url),
  applicationName: "Positives",
  appleWebApp: {
    capable: true,
    title: "Positives",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#121417",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const shouldRenderAnalyticsHints = Boolean(gaMeasurementId);

  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${poppins.variable} h-full`}
    >
      <head>
        {shouldRenderAnalyticsHints ? (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
            <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="" />
            <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
            <link rel="dns-prefetch" href="https://www.google-analytics.com" />
          </>
        ) : null}
      </head>
      <body className="h-full antialiased bg-background text-foreground">
        {gaMeasurementId ? (
          <Suspense fallback={null}>
            <GoogleAnalytics measurementId={gaMeasurementId} />
          </Suspense>
        ) : null}
        {children}
      </body>
    </html>
  );
}
