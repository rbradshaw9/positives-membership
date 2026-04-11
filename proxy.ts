import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * proxy.ts
 * Replaces the deprecated middleware.ts convention (Next.js v16+).
 * Runs on every request matching the config below.
 *
 * Responsibilities:
 * 1. Refresh Supabase auth session cookies (required for SSR auth)
 * 2. Protect member routes — redirect to /login if unauthenticated
 * 3. Protect admin routes — redirect to /login if unauthenticated
 *    (role check happens inside the admin layout server component)
 * 4. Forward x-pathname header so MemberNav can highlight the active tab
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabaseResponse, user } = await updateSession(request);

  // Protected route groups
  const isMemberRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/today") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/practice") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/coaching") ||
    pathname.startsWith("/journal") ||
    pathname.startsWith("/account");

  const isAdminRoute = pathname.startsWith("/admin");

  if ((isMemberRoute || isAdminRoute) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the intended destination for post-login redirect
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward the current pathname as a request header so Server Components
  // (e.g. MemberLayout → MemberNav) can read the active route without
  // requiring a client-side hook.
  supabaseResponse.headers.set("x-pathname", pathname);

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization API)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest, sw.js
     * - public directory assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
