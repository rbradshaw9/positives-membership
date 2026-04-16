import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = new URL(config.app.url).origin;

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/join", "/faq", "/support", "/partners", "/partners/apply", "/privacy", "/terms", "/affiliate-program"],
      disallow: [
        "/admin/",
        "/api/",
        "/today",
        "/account",
        "/coaching",
        "/community",
        "/events",
        "/journal",
        "/library",
        "/practice",
        "/subscribe",
        "/upgrade",
        "/login",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
