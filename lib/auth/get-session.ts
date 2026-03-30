import { createClient } from "@/lib/supabase/server";

/**
 * lib/auth/get-session.ts
 * Server-side helper to get the current authenticated user.
 * Returns null if unauthenticated — caller decides how to handle.
 *
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}
