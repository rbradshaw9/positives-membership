import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/today",
    name: "Positives by Dr. Paul",
    short_name: "Positives",
    description:
      "A daily mindset practice to help you think clearly, respond calmly, and return to your day grounded.",
    start_url: "/today?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#FAFAF8",
    theme_color: "#121417",
    lang: "en-US",
    categories: ["health", "lifestyle", "education"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon.png",
        sizes: "450x450",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "450x450",
        type: "image/png",
      },
      {
        src: "/logos/png/positives-logos_positives-icon-square.png",
        sizes: "450x450",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Today",
        short_name: "Today",
        description: "Open today’s practice.",
        url: "/today?source=pwa-shortcut-today",
        icons: [{ src: "/icon.png", sizes: "450x450", type: "image/png" }],
      },
      {
        name: "My Practice",
        short_name: "Practice",
        description: "Open your practice history and collections.",
        url: "/practice?source=pwa-shortcut-practice",
        icons: [{ src: "/icon.png", sizes: "450x450", type: "image/png" }],
      },
      {
        name: "Account",
        short_name: "Account",
        description: "Manage membership and billing.",
        url: "/account?source=pwa-shortcut-account",
        icons: [{ src: "/icon.png", sizes: "450x450", type: "image/png" }],
      },
    ],
  };
}
