import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import type { Database } from "@/types/supabase";

/**
 * lib/supabase/admin.ts
 * Service-role Supabase client factory.
 *
 * Returns a client that bypasses Row Level Security — use only in
 * server-side service code (webhooks, server actions that need admin access).
 *
 * Never import this from client components or expose it to browser context.
 * Never use the returned client for cookie-based auth flows — use
 * lib/supabase/server.ts for that.
 */
export function getAdminClient() {
  return createClient<Database>(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    { auth: { persistSession: false } }
  );
}
