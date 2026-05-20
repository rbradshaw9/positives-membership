"use server";

import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login-destination";

/**
 * Server action called from LoginClient after a successful password sign-in.
 * Delegates to resolvePostLoginDestination so routing logic stays in one place.
 */
export async function serverResolvePostLoginDestination(
  next: string | null | undefined
): Promise<string> {
  const supabase = await createClient();
  return resolvePostLoginDestination(supabase, next);
}
