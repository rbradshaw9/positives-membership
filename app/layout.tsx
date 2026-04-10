import type { Metadata } from "next";
import { Suspense } from "react";
import { Montserrat, Poppins } from "next/font/google";
import { FirstPromoterScripts } from "@/components/analytics/FirstPromoterScripts";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ReferralCapture } from "@/components/analytics/ReferralCapture";
import { config } from "@/lib/config";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Positives — A Daily Practice for Calm, Clarity & Resilience",
  description:
    "Positives is a practice-based membership platform for daily grounding, emotional resilience, and personal growth. Members return to it — they don't complete it.",
  metadataBase: new URL(config.app.url),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${poppins.variable} h-full`}
    >
      <head />
      <body className="h-full antialiased bg-background text-foreground">
        <Suspense fallback={null}>
          <FirstPromoterScripts />
        </Suspense>
        {gaMeasurementId ? (
          <Suspense fallback={null}>
            <GoogleAnalytics measurementId={gaMeasurementId} />
          </Suspense>
        ) : null}
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
