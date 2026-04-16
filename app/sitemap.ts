import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = new URL(config.app.url).origin;
  const now = new Date();

  const routes: Array<{
    path: string;
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/join", changeFrequency: "weekly", priority: 0.95 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.75 },
    { path: "/support", changeFrequency: "monthly", priority: 0.7 },
    { path: "/partners", changeFrequency: "monthly", priority: 0.65 },
    { path: "/partners/apply", changeFrequency: "monthly", priority: 0.45 },
    { path: "/affiliate-program", changeFrequency: "monthly", priority: 0.55 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.35 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.35 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, baseUrl).toString(),
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
