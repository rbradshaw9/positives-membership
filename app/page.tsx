import { redirect } from "next/navigation";

/**
 * app/page.tsx
 * Root route — redirects to /login.
 *
 * The proxy (proxy.ts) handles session-aware routing:
 * - Unauthenticated: /login
 * - Authenticated, inactive: /subscribe
 * - Authenticated, active: /today (via post-login redirect or MemberLayout)
 *
 * This explicit redirect ensures / never renders a blank or scaffold page
 * and avoids any server component that might call Supabase unnecessarily.
 */
export default function RootPage() {
  redirect("/login");
}
