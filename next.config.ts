import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {

  // ─── Performance ──────────────────────────────────────────────────────────
  // Remove the X-Powered-By: Next.js header (security + minor byte saving)
  poweredByHeader: false,

  // Tree-shake large packages — only the imports actually used end up in the bundle.
  // Tiptap is one of the heaviest dependencies on member/admin pages.
  experimental: {
    globalNotFound: true,
    optimizePackageImports: [
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-placeholder",
    ],
  },

  // ─── Images ───────────────────────────────────────────────────────────────
  // Declare all remote image origins used across the app.
  // Without this, next/image will refuse to optimize external images.
  images: {
    remotePatterns: [
      // Supabase Storage (member avatars, content assets)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Vimeo CDN thumbnails
      {
        protocol: "https",
        hostname: "i.vimeocdn.com",
      },
      // Vimeo user images
      {
        protocol: "https",
        hostname: "*.cloud.vimeo.com",
      },
    ],
  },

  // ─── Security Headers ─────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Disallow embedding in iframes (clickjacking protection)
          { key: "X-Frame-Options", value: "DENY" },
          // Only send origin as referrer for cross-origin requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict powerful browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
