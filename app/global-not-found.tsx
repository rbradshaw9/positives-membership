import type { Metadata } from "next";
import { montserrat, poppins } from "@/app/fonts";
import { NotFoundExperience } from "@/components/marketing/NotFoundExperience";
import "./globals.css";

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
