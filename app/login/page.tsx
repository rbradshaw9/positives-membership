import type { Metadata } from "next";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Sign In — Positives",
  description: "Sign in to your Positives membership.",
};

/**
 * app/login/page.tsx
 * Server wrapper for the returning-member sign-in page.
 * Exports metadata (server-only), delegates rendering to LoginClient.
 */
export default function LoginPage() {
  return <LoginClient />;
}
