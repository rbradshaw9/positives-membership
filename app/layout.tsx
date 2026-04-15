import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
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
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${poppins.variable} h-full`}
    >
      <head />
      <body className="h-full antialiased bg-background text-foreground">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
