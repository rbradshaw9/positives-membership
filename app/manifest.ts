import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Positives by Dr. Paul",
    short_name: "Positives",
    description:
      "A daily mindset practice to help you think clearly, respond calmly, and return to your day grounded.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAF8",
    theme_color: "#121417",
    lang: "en-US",
    categories: ["health", "lifestyle", "education"],
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
        src: "/icon.png",
        sizes: "450x450",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
