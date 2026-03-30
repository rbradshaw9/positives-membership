import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Positives — A Daily Practice for Calm, Clarity & Resilience",
  description:
    "Positives is a practice-based membership platform for daily grounding, emotional resilience, and personal growth. Members return to it — they don't complete it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
