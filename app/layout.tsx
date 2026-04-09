import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import Script from "next/script";
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
  icons: {
    icon: "/logos/png/positives-logos_positives-icon.png",
    shortcut: "/logos/png/positives-logos_positives-icon.png",
    apple: "/logos/png/positives-logos_positives-icon.png",
  },
};

/**
 * FirstPromoter init code — inlined so it is guaranteed to be in the
 * server-rendered HTML <head> before any other scripts execute.
 *
 * This mirrors exactly what FP recommends in /public/fprmain.js, but
 * inlined so we don't rely on Next.js Script strategy behaviour to
 * inject it. The CDN script (fpr.js) is loaded async after hydration
 * and processes the queued fpr("init") and fpr("click") calls.
 */
const FP_INIT = `(function(w){w.fpr=w.fpr||function(){w.fpr.q=w.fpr.q||[];w.fpr.q[arguments[0]==='set'?'unshift':'push'](arguments);}})(window);fpr("init",{cid:"7nn3rxov"});fpr("click");`;

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
      <head>
        {/*
         * FirstPromoter click tracking — Step 1: inline init script.
         *
         * Inlined directly into <head> so it is guaranteed to be in the
         * server-rendered HTML and run synchronously before any other JS.
         *
         * Initializes window.fpr queue → fpr("init") sets account ID →
         * fpr("click") captures the ?fpr= URL param into _fprom_track cookie.
         *
         * The CDN script (Step 2 below) processes this queue on load.
         */}
        {/* eslint-disable-next-line @next/next/no-script-tags-in-head -- intentional: we need synchronous execution before hydration */}
        <script dangerouslySetInnerHTML={{ __html: FP_INIT }} />
      </head>
      <body className="h-full antialiased bg-background text-foreground">
        {/*
         * FirstPromoter — Step 2: CDN SDK (async, after hydration).
         * Processes the fpr() queue set up by the inline init script above.
         *
         * Referral tracking (fpr("referral", {email})) is fired in
         * success-client.tsx after checkout completes and we have the email.
         * Server-side conversion tracking happens via trackFpSale() in the
         * Stripe webhook handler.
         */}
        <Script
          id="fp-sdk"
          src="https://cdn.firstpromoter.com/fpr.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
