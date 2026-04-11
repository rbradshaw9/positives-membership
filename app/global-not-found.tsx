import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { NotFoundExperience } from "@/components/marketing/NotFoundExperience";
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
  title: "404 — Page Not Found | Positives",
  description:
    "The page you were looking for is not here, but your next calm step still is. Return home, open today’s practice, or explore Positives again.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable} h-full`}>
      <body className="h-full antialiased bg-background text-foreground">
        <NotFoundExperience />
      </body>
    </html>
  );
}
