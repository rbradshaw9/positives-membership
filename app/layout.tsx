import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
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
      <body className="h-full antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
